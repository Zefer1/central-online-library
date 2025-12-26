import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

dotenv.config();

import { pool, ensureDatabase, seedIfEmpty } from './db.js';

const {
  PORT = 3001,
  AUTH_TOKEN = 'dev-token',
  AUTH_USERNAME = 'admin',
  AUTH_PASSWORD = 'admin',
  JWT_SECRET = 'dev-secret',
  JWT_EXPIRES_IN = '1d',
  CORS_ORIGIN = '*',
} = process.env;

function validateProductionEnv() {
  const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
  if (nodeEnv !== 'production') return;

  const problems = [];

  if (!JWT_SECRET || JWT_SECRET === 'dev-secret') {
    problems.push('JWT_SECRET must be set to a strong secret (not dev-secret)');
  }

  if (!AUTH_USERNAME || AUTH_USERNAME === 'admin') {
    problems.push('AUTH_USERNAME must be set (not admin)');
  }

  if (!AUTH_PASSWORD || AUTH_PASSWORD === 'admin') {
    problems.push('AUTH_PASSWORD must be set (not admin)');
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
// Allow permissive CORS in non-production for local development (Vite hot-reload etc.).
// In production we require a configured allowlist via CORS_ORIGIN.
if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
  app.use(cors({ origin: CORS_ORIGIN === '*' ? undefined : CORS_ORIGIN.split(',') }));
} else {
  app.use(cors());
}
app.use(express.json());

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

function authMiddleware(req, res, next) {
  // If neither legacy token nor JWT secret is configured, allow all.
  if (!AUTH_TOKEN && !JWT_SECRET) return next();
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: 'Token ausente' } });
  }
  const token = header.slice('Bearer '.length);

  // Legacy static token support
  if (AUTH_TOKEN && token === AUTH_TOKEN) return next();

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

// Auth
app.post('/auth/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, parsed.error.issues.map(i => i.message).join(', '));
    }

    const { username, password } = parsed.data;
    if (username !== AUTH_USERNAME || password !== AUTH_PASSWORD) {
      return sendError(res, 401, 'Credenciais inválidas');
    }

    if (!JWT_SECRET) {
      return sendError(res, 500, 'JWT não configurado');
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
      SELECT id, titulo, num_paginas, isbn, editora, created_at, updated_at
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
      'SELECT id, titulo, num_paginas, isbn, editora, created_at, updated_at FROM livros WHERE id = $1',
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

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err);
  if (err?.code === '23505') {
    return res.status(409).json({ error: { message: 'Já existe um livro com esses dados (ex.: ISBN duplicado)' } });
  }
  return res.status(500).json({ error: { message: err?.message || 'Erro interno do servidor' } });
});

export const ready = (async () => {
  await ensureDatabase();
  if (process.env.SEED !== 'false') {
    await seedIfEmpty();
  }
})();

if (process.env.NODE_ENV !== 'test') {
  ready.then(() => {
    app.listen(PORT, () => console.log(`API a correr em http://localhost:${PORT}`));
  });
}
