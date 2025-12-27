import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { pool } from '../../db.js';
import { __resetDbForTests } from '../setup.js';
import * as aiService from '../../aiService.js';

let app;
let ready;

describe('AI Summary API', () => {
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
    vi.restoreAllMocks();
    await __resetDbForTests();
  });

  it('generates and stores summary when missing', async () => {
    vi.spyOn(aiService, 'generateBookSummary').mockResolvedValue('Mock summary 1');

    const res = await request(app)
      .post('/api/books/1/ai-summary')
      .set('Authorization', 'Bearer dev-token');

    expect(res.status).toBe(200);
    expect(res.body?.data?.ai_summary).toBe('Mock summary 1');

    const { rows } = await pool.query('SELECT ai_summary FROM livros WHERE id = 1');
    expect(rows[0].ai_summary).toBe('Mock summary 1');
    expect(aiService.generateBookSummary).toHaveBeenCalledTimes(1);
  });

  it('returns cached summary when present and force not set', async () => {
    await pool.query('UPDATE livros SET ai_summary = $1 WHERE id = 1', ['Cached summary']);
    const spy = vi.spyOn(aiService, 'generateBookSummary').mockResolvedValue('Should not run');

    const res = await request(app)
      .post('/api/books/1/ai-summary')
      .set('Authorization', 'Bearer dev-token');

    expect(res.status).toBe(200);
    expect(res.body?.data?.ai_summary).toBe('Cached summary');
    expect(spy).not.toHaveBeenCalled();
  });

  it('regenerates summary when force=true', async () => {
    await pool.query('UPDATE livros SET ai_summary = $1 WHERE id = 1', ['Old summary']);
    vi.spyOn(aiService, 'generateBookSummary').mockResolvedValue('Forced summary');

    const res = await request(app)
      .post('/api/books/1/ai-summary?force=true')
      .set('Authorization', 'Bearer dev-token');

    expect(res.status).toBe(200);
    expect(res.body?.data?.ai_summary).toBe('Forced summary');
    expect(aiService.generateBookSummary).toHaveBeenCalledTimes(1);

    const { rows } = await pool.query('SELECT ai_summary FROM livros WHERE id = 1');
    expect(rows[0].ai_summary).toBe('Forced summary');
  });
});
