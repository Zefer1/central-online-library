import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ratingsRouter } from './bookRatings.js';
import { generateBookSummary } from './aiService.js';
import { isEnvAdminEnabled } from './authConfig.js';
import { runMigrations } from './db.js';

dotenv.config();

import { pool, ensureDatabase, seedIfEmpty } from './db.js';

const NODE_ENV = (process.env.NODE_ENV || '').toLowerCase();
const IS_PROD = NODE_ENV === 'production';
const IS_TEST = NODE_ENV === 'test';

const PORT = Number(process.env.PORT || 3001);
const AUTH_TOKEN = process.env.AUTH_TOKEN ?? (IS_PROD ? '' : 'dev-token');
const AUTH_USERNAME = process.env.AUTH_USERNAME ?? (IS_PROD ? '' : 'admin');
const AUTH_PASSWORD = process.env.AUTH_PASSWORD ?? (IS_PROD ? '' : 'admin');
const JWT_SECRET = process.env.JWT_SECRET ?? (IS_PROD ? '' : 'dev-secret');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? (IS_PROD ? '' : '*');

function validateProductionEnv() {
  if (!IS_PROD) return;

  const problems = [];

  if (!JWT_SECRET || JWT_SECRET === 'dev-secret') {
    problems.push('JWT_SECRET must be set to a strong secret (not dev-secret)');
  }

  // Optional: allow disabling env-admin credentials entirely in production.
  // If provided, require explicit enablement to avoid accidentally shipping a backdoor.
  const enableEnvAdmin = (process.env.ENABLE_ENV_ADMIN || 'false').toLowerCase() === 'true';
  if (AUTH_USERNAME || AUTH_PASSWORD) {
    if (!enableEnvAdmin) {
      problems.push('AUTH_USERNAME/AUTH_PASSWORD are set but ENABLE_ENV_ADMIN is not true (unset them or set ENABLE_ENV_ADMIN=true)');
    }
    if (!AUTH_USERNAME || !AUTH_PASSWORD) {
      problems.push('AUTH_USERNAME and AUTH_PASSWORD must both be set when ENABLE_ENV_ADMIN=true');
    }
    if (AUTH_USERNAME === 'admin') {
      problems.push('AUTH_USERNAME must not be admin in production');
    }
    if (AUTH_PASSWORD === 'admin') {
      problems.push('AUTH_PASSWORD must not be admin in production');
    }
  }

  if (AUTH_TOKEN && AUTH_TOKEN === 'dev-token') {
    problems.push('AUTH_TOKEN must not be dev-token in production (set it to empty or a strong token)');
  }

  const cors = (CORS_ORIGIN || '').trim();
  if (!cors || cors === '*') {
    problems.push('CORS_ORIGIN must be a comma-separated allowlist in production (not *)');
  }

  const autoCreate = (process.env.AUTO_CREATE_DB || 'false').toLowerCase() === 'true';
  if (autoCreate) {
    problems.push('AUTO_CREATE_DB must be false in production');
  }

  if (problems.length) {
    throw new Error(`Invalid production configuration:\n- ${problems.join('\n- ')}`);
  }
}

validateProductionEnv();

export const app = express();

// When running behind a reverse proxy (common in production), this enables correct
// client IP and protocol detection for Express middleware.
if (IS_PROD) {
  app.set('trust proxy', 1);
}

if (IS_PROD) {
  // Safe defaults for an API server.
  app.use(helmet());
}

// Allow permissive CORS in non-production for local development (Vite hot-reload etc.).
// In production we require a configured allowlist via CORS_ORIGIN.
if (IS_PROD) {
  const origins = (CORS_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  app.use(cors({ origin: CORS_ORIGIN === '*' ? undefined : origins }));
} else {
  app.use(cors());
}
app.use(express.json({ limit: '1mb' }));

// Healthcheck (DB + process). Useful for container orchestration and monitoring.
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({
      status: 'ok',
      db: 'ok',
      env: NODE_ENV || 'development',
      uptime_s: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({
      status: 'degraded',
      db: 'down',
      env: NODE_ENV || 'development',
      uptime_s: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  }
});

const livroSchema = z.object({
  titulo: z.string().trim().min(1, 'Título é obrigatório'),
  num_paginas: z.coerce.number().int().positive('Número de páginas deve ser positivo'),
  isbn: z.string().trim().min(1, 'ISBN é obrigatório'),
  editora: z.string().trim().min(1, 'Editora é obrigatória'),
});

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username é obrigatório'),
  password: z.string().min(1, 'Password é obrigatória'),
});

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username deve ter pelo menos 3 caracteres')
    .max(50, 'Username deve ter no máximo 50 caracteres'),
  password: z
    .string()
    .min(6, 'Password deve ter pelo menos 6 caracteres')
    .max(200, 'Password é demasiado longa'),
});

export function authMiddleware(req, res, next) {
  // If neither legacy token nor JWT secret is configured, allow all.
  if (!AUTH_TOKEN && !JWT_SECRET) return next();
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: 'Token ausente' } });
  }
  const token = header.slice('Bearer '.length);

  // Legacy static token support
  if (AUTH_TOKEN && token === AUTH_TOKEN) {
    req.user = { sub: AUTH_USERNAME || 'token-user' };
    return next();
  }

  if (JWT_SECRET) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      return next();
    } catch {
      return res.status(401).json({ error: { message: 'Token inválido' } });
    }
  }

  return res.status(401).json({ error: { message: 'Token inválido' } });
}

function parseQueryPagination(req) {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 10, 1), 50);
  const q = (req.query.q || '').toString().trim();
  const isbn = (req.query.isbn || '').toString().trim();
  const editora = (req.query.editora || '').toString().trim();

  const sort = (req.query.sort || 'created_at').toString().trim();
  const order = (req.query.order || 'desc').toString().trim().toLowerCase();

  const allowedSort = new Set(['created_at', 'titulo', 'editora', 'num_paginas']);
  const safeSort = allowedSort.has(sort) ? sort : 'created_at';
  const safeOrder = order === 'asc' ? 'asc' : 'desc';

  return { page, pageSize, q, isbn, editora, sort: safeSort, order: safeOrder };
}

function sendError(res, status, message) {
  return res.status(status).json({ error: { message } });
}

const disableRateLimit = IS_TEST || (process.env.DISABLE_RATE_LIMIT || '').toLowerCase() === 'true';
const loginLimiter = disableRateLimit
  ? (_req, _res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 20,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: { message: 'Demasiadas tentativas. Tente novamente mais tarde.' } },
    });

const registerLimiter = disableRateLimit
  ? (_req, _res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: { message: 'Demasiadas tentativas. Tente novamente mais tarde.' } },
    });

const aiSummaryLimiter = disableRateLimit
  ? (_req, _res, next) => next()
  : rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: 30,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: { message: 'Limite de pedidos atingido. Tente novamente mais tarde.' } },
    });

// Auth
app.post('/auth/register', registerLimiter, async (req, res, next) => {
  try {
    const registrationDisabled = (process.env.DISABLE_REGISTRATION || 'false').toLowerCase() === 'true';
    if (registrationDisabled) {
      return sendError(res, 403, 'Registo desativado');
    }

    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, parsed.error.issues.map(i => i.message).join(', '));
    }

    const { username, password } = parsed.data;

    const saltRoundsRaw = Number(process.env.PASSWORD_SALT_ROUNDS || 10);
    const saltRounds = Number.isInteger(saltRoundsRaw) && saltRoundsRaw >= 4 && saltRoundsRaw <= 15 ? saltRoundsRaw : 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    let createdUser;
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (username, password_hash)
         VALUES ($1, $2)
         RETURNING id, username`,
        [username, passwordHash],
      );
      createdUser = rows[0];
    } catch (err) {
      if (err?.code === '23505') {
        return sendError(res, 409, 'Username já existe');
      }
      throw err;
    }

    if (!JWT_SECRET) {
      return sendError(res, 500, 'JWT não configurado');
    }

    const token = jwt.sign({ sub: createdUser.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.status(201).json({ data: { token }, message: 'Registo efetuado' });
  } catch (err) {
    next(err);
  }
});

app.post('/auth/login', loginLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, parsed.error.issues.map(i => i.message).join(', '));
    }

    const { username, password } = parsed.data;
    if (!JWT_SECRET) {
      return sendError(res, 500, 'JWT não configurado');
    }

    const envAdminEnabled = isEnvAdminEnabled({
      nodeEnv: NODE_ENV,
      enableEnvAdminFlag: process.env.ENABLE_ENV_ADMIN,
      username: AUTH_USERNAME,
      password: AUTH_PASSWORD,
    });
    const isEnvAdmin = envAdminEnabled && username === AUTH_USERNAME && password === AUTH_PASSWORD;
    if (!isEnvAdmin) {
      const { rows } = await pool.query('SELECT password_hash FROM users WHERE username = $1', [username]);
      const row = rows[0];
      if (!row) return sendError(res, 401, 'Credenciais inválidas');
      const ok = await bcrypt.compare(password, row.password_hash);
      if (!ok) return sendError(res, 401, 'Credenciais inválidas');
    }

    const token = jwt.sign({ sub: username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.json({ data: { token }, message: 'Login efetuado' });
  } catch (err) {
    next(err);
  }
});

app.get('/auth/me', authMiddleware, async (req, res) => {
  // If legacy token used, we don't have a user payload.
  const user = req.user?.sub ? { username: req.user.sub } : { username: 'token-user' };
  return res.json({ data: user });
});

// List all books with pagination and optional search
app.get('/livros', async (req, res, next) => {
  try {
    const { page, pageSize, q, isbn, editora, sort, order } = parseQueryPagination(req);
    const offset = (page - 1) * pageSize;

    const where = [];
    const params = [];
    if (q) {
      where.push('(titulo ILIKE $1 OR editora ILIKE $1)');
      params.push(`%${q}%`);
    }

    if (isbn) {
      where.push(`isbn = $${params.length + 1}`);
      params.push(isbn);
    }

    if (editora) {
      where.push(`editora ILIKE $${params.length + 1}`);
      params.push(`%${editora}%`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const listQuery = `
      SELECT id, titulo, num_paginas, isbn, editora, ai_summary, ai_summary_updated_at, created_at, updated_at
      FROM livros
      ${whereClause}
      ORDER BY ${sort} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;

    const countQuery = `SELECT COUNT(*)::int AS total FROM livros ${whereClause}`;

    const [listResult, countResult] = await Promise.all([
      pool.query(listQuery, [...params, pageSize, offset]),
      pool.query(countQuery, params),
    ]);

    const total = countResult.rows[0]?.total || 0;
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);

    res.json({
      data: listResult.rows,
      pagination: { page, pageSize, total, totalPages },
    });
  } catch (err) {
    next(err);
  }
});

// Obtain a specific book
app.get('/livros/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return sendError(res, 400, 'ID inválido');
    const { rows } = await pool.query(
      `SELECT id, titulo, num_paginas, isbn, editora, ai_summary, ai_summary_updated_at, created_at, updated_at
       FROM livros WHERE id = $1`,
      [id],
    );
    if (!rows[0]) return sendError(res, 404, 'Livro não encontrado');
    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// Create a new book (auth)
app.post('/livros', authMiddleware, async (req, res, next) => {
  try {
    const parsed = livroSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, parsed.error.issues.map(i => i.message).join(', '));
    }
    const { titulo, num_paginas, isbn, editora } = parsed.data;
    const { rows } = await pool.query(
      `INSERT INTO livros (titulo, num_paginas, isbn, editora)
       VALUES ($1,$2,$3,$4)
       RETURNING id, titulo, num_paginas, isbn, editora, created_at, updated_at`,
      [titulo, num_paginas, isbn, editora],
    );
    res.status(201).json({ data: rows[0], message: 'Livro criado' });
  } catch (err) {
    next(err);
  }
});

// update a book (auth)
app.put('/livros/:id', authMiddleware, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return sendError(res, 400, 'ID inválido');

    const parsed = livroSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, parsed.error.issues.map(i => i.message).join(', '));
    }

    const fields = parsed.data;
    const updates = [];
    const params = [];
    let idx = 1;

    for (const [key, value] of Object.entries(fields)) {
      updates.push(`${key} = $${idx}`);
      params.push(value);
      idx += 1;
    }

    if (!updates.length) return sendError(res, 400, 'Nenhum campo para atualizar');

    params.push(id);

    const query = `
      UPDATE livros SET ${updates.join(', ')}, updated_at = now()
      WHERE id = $${idx}
      RETURNING id, titulo, num_paginas, isbn, editora, created_at, updated_at
    `;

    const { rows } = await pool.query(query, params);
    if (!rows[0]) return sendError(res, 404, 'Livro não encontrado');
    res.json({ data: rows[0], message: 'Livro atualizado' });
  } catch (err) {
    next(err);
  }
});

// delete a book (auth)
app.delete('/livros/:id', authMiddleware, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return sendError(res, 400, 'ID inválido');
    const { rowCount } = await pool.query('DELETE FROM livros WHERE id = $1', [id]);
    if (!rowCount) return sendError(res, 404, 'Livro não encontrado');
    return res.json({ message: 'Livro apagado com sucesso' });
  } catch (err) {
    next(err);
  }
});

// Generate or regenerate AI summary for a book (auth required)
app.post('/api/books/:id/ai-summary', authMiddleware, aiSummaryLimiter, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return sendError(res, 400, 'ID inválido');

    const { rows } = await pool.query(
      'SELECT id, titulo, editora, num_paginas, ai_summary, ai_summary_updated_at FROM livros WHERE id = $1',
      [id],
    );

    const book = rows[0];
    if (!book) return sendError(res, 404, 'Livro não encontrado');

    const alreadyHasSummary = !!book.ai_summary;
    const force = String(req.query.force || '').toLowerCase() === 'true';
    if (alreadyHasSummary && !force) {
      return res.json({
        data: { ai_summary: book.ai_summary, ai_summary_updated_at: book.ai_summary_updated_at },
        message: 'Resumo já existe. Use force=true para regenerar.',
      });
    }

    const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 10000);
    const timeoutError = new Error('Tempo limite ao gerar resumo');
    let timer;
    const guard = new Promise((_, reject) => {
      timer = setTimeout(() => reject(timeoutError), timeoutMs);
    });

    const summaryPromise = generateBookSummary({
      title: book.titulo,
      description: book.editora ? `Editora: ${book.editora}. Páginas: ${book.num_paginas}.` : '',
    });

    let ai_summary;
    try {
      ai_summary = await Promise.race([summaryPromise, guard]);
    } catch (err) {
      console.warn('[ai-summary] geração falhou', err?.message || err);
      return sendError(res, 502, 'Não foi possível gerar o resumo no momento');
    }
    clearTimeout(timer);

    const { rows: updated } = await pool.query(
      `UPDATE livros
       SET ai_summary = $1, ai_summary_updated_at = now(), updated_at = now()
       WHERE id = $2
       RETURNING ai_summary, ai_summary_updated_at`,
      [ai_summary, id],
    );

    return res.json({ data: updated[0], message: 'Resumo gerado' });
  } catch (err) {
    next(err);
  }
});

// Book ratings routes (public + authenticated upsert)
app.use('/api/books/:bookId/ratings', ratingsRouter);

// Admin endpoint to run migrations
app.post('/admin/run-migrations', async (req, res) => {
  try {
    await runMigrations(); // Function already defined in db.js
    res.json({ message: 'Migrações aplicadas com sucesso' });
  } catch (err) {
    console.error('Erro ao aplicar migrações:', err);
    res.status(500).json({ error: 'Erro ao aplicar migrações' });
  }
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err);
  if (err?.code === '23505') {
    return res.status(409).json({ error: { message: 'Já existe um livro com esses dados (ex.: ISBN duplicado)' } });
  }
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  const message = isProd ? 'Erro interno do servidor' : (err?.message || 'Erro interno do servidor');
  return res.status(500).json({ error: { message } });
});

export const ready = (async () => {
  await ensureDatabase();
  if ((process.env.SEED || '').toLowerCase() === 'true') {
    await seedIfEmpty();
  }
})();

if (process.env.NODE_ENV !== 'test') {
  ready.then(() => {
    app.listen(PORT, () => console.log(`API a correr em http://localhost:${PORT}`));
  });
}
