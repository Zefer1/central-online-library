import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { pool } from '../../db.js';
import { __resetDbForTests } from '../setup.js';

let app;
let ready;

async function seedBook(title = 'Book X') {
  const { rows } = await pool.query(
    `INSERT INTO livros (titulo, num_paginas, isbn, editora)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [title, 120, `${Date.now()}`, 'Test Editora'],
  );
  return rows[0].id;
}

describe('Book ratings API', () => {
  beforeAll(async () => {
    process.env.AUTH_TOKEN = 'dev-token';
    process.env.AUTH_USERNAME = 'admin';
    process.env.AUTH_PASSWORD = 'admin';
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.DISABLE_ANALYTICS = 'true';
    const mod = await import('../../index.js');
    app = mod.app;
    ready = mod.ready;
    await ready;
  });

  beforeEach(async () => {
    await __resetDbForTests();
  });

  it('creates a rating and updates summary', async () => {
    const bookId = await seedBook('Rated Book');
    const post = await request(app)
      .post(`/api/books/${bookId}/ratings`)
      .set('Authorization', 'Bearer dev-token')
      .send({ rating: 5, review: 'Excelente' });
    expect(post.status).toBe(201);
    expect(post.body?.data?.rating).toBe(5);

    const summary = await request(app).get(`/api/books/${bookId}/ratings/summary`);
    expect(summary.status).toBe(200);
    expect(summary.body?.data?.avg).toBe(5);
    expect(summary.body?.data?.counts?.['5']).toBe(1);
  });

  it('updates an existing rating with PUT', async () => {
    const bookId = await seedBook('Updatable Book');
    await request(app)
      .post(`/api/books/${bookId}/ratings`)
      .set('Authorization', 'Bearer dev-token')
      .send({ rating: 4, review: 'Good' });

    const put = await request(app)
      .put(`/api/books/${bookId}/ratings`)
      .set('Authorization', 'Bearer dev-token')
      .send({ rating: 3, review: 'Ok' });
    expect(put.status).toBe(200);

    const summary = await request(app).get(`/api/books/${bookId}/ratings/summary`);
    expect(summary.body?.data?.avg).toBe(3);
    expect(summary.body?.data?.total).toBe(1);
    expect(summary.body?.data?.counts?.['3']).toBe(1);
  });

  it('applies guest cooldown per book', async () => {
    const bookId = await seedBook('Guest Book');
    const first = await request(app)
      .post(`/api/books/${bookId}/ratings`)
      .send({ rating: 4, ip_fingerprint: 'guest-ip-1' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`/api/books/${bookId}/ratings`)
      .send({ rating: 5, ip_fingerprint: 'guest-ip-1' });
    expect(second.status).toBe(429);
  });

  it('returns correct summary counts', async () => {
    const bookId = await seedBook('Summary Book');
    await pool.query(
      `INSERT INTO book_ratings (book_id, rating, review, moderation_status, updated_at)
       VALUES
        ($1, 5, 'A', 'approved', now()),
        ($1, 4, 'B', 'approved', now()),
        ($1, 3, 'C', 'approved', now())`,
      [bookId],
    );

    const res = await request(app).get(`/api/books/${bookId}/ratings/summary`);
    expect(res.status).toBe(200);
    expect(res.body?.data?.avg).toBe(4);
    expect(res.body?.data?.total).toBe(3);
    expect(res.body?.data?.counts?.['5']).toBe(1);
    expect(res.body?.data?.counts?.['4']).toBe(1);
    expect(res.body?.data?.counts?.['3']).toBe(1);
  });
  it('supports user + guest flows (smoke)', async () => {
    const bookId = await seedBook('Full Flow');
    const user = await request(app)
      .post(`/api/books/${bookId}/ratings`)
      .set('Authorization', 'Bearer dev-token')
      .send({ rating: 5, review: 'Loved' });
    expect(user.status).toBe(201);

    const guest = await request(app)
      .post(`/api/books/${bookId}/ratings`)
      .send({ rating: 4, review: 'Nice', ip_fingerprint: 'guest-smoke' });
    expect(guest.status).toBe(201);

    const summary = await request(app).get(`/api/books/${bookId}/ratings/summary`);
    expect(summary.body?.data?.total).toBe(2);
    expect(summary.body?.data?.avg).toBe(4.5);
  });
});
