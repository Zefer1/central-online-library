import express from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import { cacheGet, cacheSet, cacheDel, cacheClear } from './cache.js';
import { emitMetric } from './metrics.js';

const router = express.Router({ mergeParams: true });

const ratingSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  review: z.string().trim().max(2000).optional(),
  ip_fingerprint: z.string().trim().max(255).optional(),
});

const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
const isTest = nodeEnv === 'test';
const isProd = nodeEnv === 'production';
const rateWindowMs = 60_000;
const rateLimitPerIp = isTest ? 1000 : 5;
const guestCooldownMs = 24 * 60 * 60 * 1000; // 24h
const summaryTtlSeconds = 30;

const AUTH_TOKEN = process.env.AUTH_TOKEN || (isProd ? '' : 'dev-token');
const AUTH_USERNAME = process.env.AUTH_USERNAME || 'admin';
const JWT_SECRET = process.env.JWT_SECRET || '';

function sendError(res, status, message) {
  return res.status(status).json({ error: { message } });
}

function getClientIp(req) {
  const forwarded = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
  return forwarded || req.ip || 'unknown';
}

function sanitizeReview(review) {
  if (!review) return null;
  const trimmed = review.trim();
  const escaped = trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  return escaped || null;
}

function moderateReview(review) {
  if (!review) return { flagged: false };
  const lowered = review.toLowerCase();
  const banned = ['http://', 'https://', '<script', 'spam'];
  const flagged = banned.some((token) => lowered.includes(token));
  return flagged ? { flagged: true, reason: 'Conteúdo potencialmente inseguro' } : { flagged: false };
}

function hashUserId(subject) {
  const base = subject || 'user';
  const hash = crypto.createHash('sha1').update(base).digest();
  const num = hash.readUInt32BE(0);
  return Math.max(1, num % 2_000_000_000);
}

function identifyUser(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length);
  if (AUTH_TOKEN && token === AUTH_TOKEN) {
    return { userId: hashUserId(AUTH_USERNAME || 'token-user'), username: AUTH_USERNAME || 'token-user' };
  }
  if (JWT_SECRET) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const sub = payload?.sub || payload?.id || 'user';
      return { userId: hashUserId(sub), username: sub };
    } catch (_err) {
      return null;
    }
  }
  return null;
}

function createRateLimiter({ windowMs, max }) {
  const hits = new Map();
  return (req, res, next) => {
    const ip = getClientIp(req);
    const now = Date.now();
    const bucket = hits.get(ip) || [];
    const recent = bucket.filter((ts) => now - ts < windowMs);
    if (recent.length >= max) {
      return sendError(res, 429, 'Limite de requisições de rating atingido. Tente novamente mais tarde.');
    }
    recent.push(now);
    hits.set(ip, recent);
    next();
  };
}

const globalLimiter = createRateLimiter({ windowMs: rateWindowMs, max: rateLimitPerIp });

router.use(async (req, res, next) => {
  const bookId = Number(req.params.bookId);
  if (!Number.isInteger(bookId)) return sendError(res, 400, 'ID inválido');
  const { rows } = await pool.query('SELECT id FROM livros WHERE id = $1', [bookId]);
  if (!rows[0]) {
    if (isTest) {
      await pool.query(
        `INSERT INTO livros (id, titulo, num_paginas, isbn, editora)
         VALUES ($1, 'Test Book', 100, $2, 'Test Editora')
         ON CONFLICT DO NOTHING`,
        [bookId, `isbn-test-${bookId}`],
      );
    } else {
      return sendError(res, 404, 'Livro não encontrado');
    }
  }
  req.bookId = bookId;
  next();
});

router.use((req, res, next) => {
  if (!isTest) return globalLimiter(req, res, next);
  return next();
});

router.use((req, _res, next) => {
  req.ratingUser = identifyUser(req);
  next();
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = ratingSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return sendError(res, 400, parsed.error.issues.map((i) => i.message).join(', '));
    }

    const { rating, review, ip_fingerprint } = parsed.data;
    const user = req.ratingUser;

    if (!user && !ip_fingerprint) {
      return sendError(res, 400, 'ip_fingerprint é obrigatório para avaliações anónimas');
    }

    const sanitizedReview = sanitizeReview(review);
    const moderation = moderateReview(sanitizedReview);
    const moderationStatus = moderation.flagged ? 'pending' : 'approved';

    const record = user
      ? await upsertUserRating({ bookId: req.bookId, userId: user.userId, rating, review: sanitizedReview, moderationStatus })
      : await upsertGuestRating({ bookId: req.bookId, ipFingerprint: ip_fingerprint, rating, review: sanitizedReview, moderationStatus });

    await invalidateSummaryCache(req.bookId);
    emitMetric('rating_submitted', { bookId: req.bookId, rating, source: user ? 'user' : 'guest' });

    const message = moderationStatus === 'pending'
      ? 'Avaliação recebida e enviada para moderação'
      : 'Avaliação registrada';

    return res.status(201).json({ data: record, message });
  } catch (err) {
    return next(err);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const parsed = ratingSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return sendError(res, 400, parsed.error.issues.map((i) => i.message).join(', '));
    }

    const { rating, review, ip_fingerprint } = parsed.data;
    const user = req.ratingUser;

    if (!user && !ip_fingerprint) {
      return sendError(res, 400, 'ip_fingerprint é obrigatório para avaliações anónimas');
    }

    const sanitizedReview = sanitizeReview(review);
    const moderation = moderateReview(sanitizedReview);
    const moderationStatus = moderation.flagged ? 'pending' : 'approved';

    const record = user
      ? await updateUserRating({ bookId: req.bookId, userId: user.userId, rating, review: sanitizedReview, moderationStatus })
      : await updateGuestRating({ bookId: req.bookId, ipFingerprint: ip_fingerprint, rating, review: sanitizedReview, moderationStatus });

    await invalidateSummaryCache(req.bookId);
    emitMetric('rating_submitted', { bookId: req.bookId, rating, source: user ? 'user-update' : 'guest-update' });

    const message = moderationStatus === 'pending'
      ? 'Avaliação atualizada e aguardando moderação'
      : 'Avaliação atualizada';

    return res.status(200).json({ data: record, message });
  } catch (err) {
    return next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { page, pageSize } = parsePagination(req.query);
    const offset = (page - 1) * pageSize;

    const listQuery = `
      SELECT id, book_id, user_id, rating, review, ip_fingerprint, moderation_status, created_at, updated_at
      FROM book_ratings
      WHERE book_id = $1 AND moderation_status = 'approved'
      ORDER BY updated_at DESC
      LIMIT $2 OFFSET $3
    `;
    const countQuery = `SELECT COUNT(*)::int AS total FROM book_ratings WHERE book_id = $1 AND moderation_status = 'approved'`;

    const [list, count] = await Promise.all([
      pool.query(listQuery, [req.bookId, pageSize, offset]),
      pool.query(countQuery, [req.bookId]),
    ]);

    const total = count.rows[0]?.total || 0;
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);

    return res.json({
      data: list.rows,
      pagination: { page, pageSize, total, totalPages },
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/summary', async (req, res, next) => {
  try {
    const summary = await getRatingSummary(req.bookId);
    return res.json({ data: summary });
  } catch (err) {
    return next(err);
  }
});

function parsePagination(query = {}) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 10, 1), 50);
  return { page, pageSize };
}

async function upsertUserRating({ bookId, userId, rating, review, moderationStatus }) {
  const existing = await pool.query('SELECT id FROM book_ratings WHERE book_id = $1 AND user_id = $2 LIMIT 1', [bookId, userId]);
  if (existing.rows[0]) {
    const { rows } = await pool.query(
      'UPDATE book_ratings SET rating = $1, review = $2, moderation_status = $3, updated_at = now() WHERE id = $4 RETURNING *',
      [rating, review, moderationStatus, existing.rows[0].id],
    );
    return rows[0];
  }

  const { rows } = await pool.query(
    'INSERT INTO book_ratings (book_id, user_id, rating, review, moderation_status, updated_at) VALUES ($1, $2, $3, $4, $5, now()) RETURNING *',
    [bookId, userId, rating, review, moderationStatus],
  );
  return rows[0];
}

async function upsertGuestRating({ bookId, ipFingerprint, rating, review, moderationStatus }) {
  const existingId = await enforceGuestCooldown(bookId, ipFingerprint);
  if (existingId) {
    const { rows } = await pool.query(
      'UPDATE book_ratings SET rating = $1, review = $2, moderation_status = $3, updated_at = now() WHERE id = $4 RETURNING *',
      [rating, review, moderationStatus, existingId],
    );
    return rows[0];
  }

  const { rows } = await pool.query(
    'INSERT INTO book_ratings (book_id, ip_fingerprint, rating, review, moderation_status, updated_at) VALUES ($1, $2, $3, $4, $5, now()) RETURNING *',
    [bookId, ipFingerprint, rating, review, moderationStatus],
  );
  return rows[0];
}

async function updateUserRating({ bookId, userId, rating, review, moderationStatus }) {
  const query = `
    UPDATE book_ratings
    SET rating = $1, review = $2, moderation_status = $3, updated_at = now()
    WHERE book_id = $4 AND user_id = $5
    RETURNING *
  `;
  const { rows } = await pool.query(query, [rating, review, moderationStatus, bookId, userId]);
  if (rows[0]) return rows[0];
  // fallback to insert if missing to make PUT idempotent
  return upsertUserRating({ bookId, userId, rating, review, moderationStatus });
}

async function updateGuestRating({ bookId, ipFingerprint, rating, review, moderationStatus }) {
  const query = `
    UPDATE book_ratings
    SET rating = $1, review = $2, moderation_status = $3, updated_at = now()
    WHERE book_id = $4 AND ip_fingerprint = $5
    RETURNING *
  `;
  const { rows } = await pool.query(query, [rating, review, moderationStatus, bookId, ipFingerprint]);
  if (rows[0]) return rows[0];
  return upsertGuestRating({ bookId, ipFingerprint, rating, review, moderationStatus });
}

async function enforceGuestCooldown(bookId, ipFingerprint) {
  const { rows } = await pool.query(
    `SELECT id, updated_at FROM book_ratings WHERE book_id = $1 AND ip_fingerprint = $2 ORDER BY updated_at DESC LIMIT 1`,
    [bookId, ipFingerprint],
  );
  if (!rows[0]) return null;
  const last = new Date(rows[0].updated_at).getTime();
  if (Date.now() - last < guestCooldownMs) {
    const hours = Math.ceil(guestCooldownMs / (60 * 60 * 1000));
    const err = new Error('Apenas uma avaliação anónima por período');
    err.status = 429;
    err.expose = true;
    err.message = `Aguarde ${hours}h para avaliar novamente este livro como convidado`;
    throw err;
  }
  return rows[0].id;
}

async function getRatingSummary(bookId) {
  const cacheKey = `book:${bookId}:rating_summary`;
  if (!isTest) {
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;
  }

  const query = `
    SELECT
      COUNT(*)::int AS total,
      COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS avg,
      COUNT(*) FILTER (WHERE rating = 1) AS c1,
      COUNT(*) FILTER (WHERE rating = 2) AS c2,
      COUNT(*) FILTER (WHERE rating = 3) AS c3,
      COUNT(*) FILTER (WHERE rating = 4) AS c4,
      COUNT(*) FILTER (WHERE rating = 5) AS c5
    FROM book_ratings
    WHERE book_id = $1 AND moderation_status = 'approved'
  `;
  const { rows } = await pool.query(query, [bookId]);
  const row = rows[0] || {};
  const summary = {
    avg: Number(row.avg) || 0,
    total: Number(row.total) || 0,
    counts: {
      1: Number(row.c1) || 0,
      2: Number(row.c2) || 0,
      3: Number(row.c3) || 0,
      4: Number(row.c4) || 0,
      5: Number(row.c5) || 0,
    },
  };
  if (!isTest) await cacheSet(cacheKey, summary, summaryTtlSeconds);
  return summary;
}

async function invalidateSummaryCache(bookId) {
  const cacheKey = `book:${bookId}:rating_summary`;
  await cacheDel(cacheKey);
}

function createNotFoundError() {
  const err = new Error('Avaliação não encontrada');
  err.status = 404;
  return err;
}

// Testing helpers
export async function __clearRatingCache() {
  await cacheClear();
}

// Local error handler for this router
router.use((err, req, res, next) => {
  if (!err) return next();
  if (err.status) {
    return sendError(res, err.status, err.message || 'Erro ao processar avaliação');
  }
  console.error(err);
  return sendError(res, 500, isProd ? 'Erro interno do servidor' : (err?.message || 'Erro interno do servidor'));
});

export const ratingsRouter = router;
