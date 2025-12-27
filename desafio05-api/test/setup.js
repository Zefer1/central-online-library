import { beforeAll, beforeEach, afterAll } from 'vitest';
import { pool } from '../db.js';
import { ready } from '../index.js';
import { __clearRatingCache } from '../bookRatings.js';

async function resetDb() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE users RESTART IDENTITY CASCADE');
    await client.query('TRUNCATE book_ratings RESTART IDENTITY CASCADE');
    await client.query('TRUNCATE livros RESTART IDENTITY CASCADE');
    await client.query(
      `INSERT INTO livros (id, titulo, num_paginas, isbn, editora)
       VALUES (1, 'Seed Book', 100, 'ISBN-SEED', 'Seed Editora')
       ON CONFLICT DO NOTHING`
    );
    await client.query("SELECT setval(pg_get_serial_sequence('livros','id'), 1, true)");
    await __clearRatingCache();
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export { resetDb as __resetDbForTests };

beforeAll(async () => {
  await ready;
  await resetDb();
});

afterAll(async () => {
  await pool.end();
});
