import request from 'supertest';
import { describe, it, beforeAll, beforeEach, expect } from 'vitest';
import { __resetDbForTests } from './setup.js';

let app;
let ready;

describe('Livros API', () => {
  beforeAll(async () => {
    // Ensure deterministic auth defaults
    process.env.AUTH_TOKEN = 'dev-token';
    process.env.AUTH_USERNAME = 'admin';
    process.env.AUTH_PASSWORD = 'admin';
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '1h';

    const mod = await import('../index.js');
    app = mod.app;
    ready = mod.ready;
    await ready;
  });

  beforeEach(async () => {
    await __resetDbForTests();
  });

  it('rejects write without auth token', async () => {
    const res = await request(app).post('/livros').send({ titulo: 'Sem token' });
    expect(res.status).toBe(401);
  });

  it('logs in and returns a JWT', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body?.data?.token).toBeDefined();
  });

  it('creates, lists, updates, and deletes a livro', async () => {
    const livro = {
      titulo: 'Clean Architecture',
      num_paginas: 432,
      isbn: '978-0134494166',
      editora: 'Prentice Hall'
    };

    const create = await request(app)
      .post('/livros')
      .set('Authorization', 'Bearer dev-token')
      .send(livro);
    expect(create.status).toBe(201);
    expect(create.body?.data?.id).toBeDefined();
    const id = create.body.data.id;

    const list = await request(app).get('/livros');
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);
    expect(list.body.data.length).toBe(2); // includes seeded book from global setup

    const update = await request(app)
      .put(`/livros/${id}`)
      .set('Authorization', 'Bearer dev-token')
      .send({ titulo: 'Clean Architecture 2e' });
    expect(update.status).toBe(200);
    expect(update.body.data.titulo).toBe('Clean Architecture 2e');

    const del = await request(app)
      .delete(`/livros/${id}`)
      .set('Authorization', 'Bearer dev-token');
    expect(del.status).toBe(200);
  });

  it('paginates and filters', async () => {
    const items = [
      { titulo: 'Domain-Driven Design', num_paginas: 560, isbn: '978-0321125217', editora: 'Addison-Wesley' },
      { titulo: 'Patterns of Enterprise Application Architecture', num_paginas: 533, isbn: '978-0321127426', editora: 'Addison-Wesley' },
      { titulo: 'Working Effectively with Legacy Code', num_paginas: 456, isbn: '978-0131177055', editora: 'Prentice Hall' },
    ];

    for (const item of items) {
      await request(app)
        .post('/livros')
        .set('Authorization', 'Bearer dev-token')
        .send(item);
    }

    const page1 = await request(app).get('/livros?page=1&pageSize=2');
    expect(page1.status).toBe(200);
    expect(page1.body.data.length).toBe(2);
    expect(page1.body.pagination.total).toBe(4); // seeded book + 3 inserted

    const search = await request(app).get('/livros?q=Legacy');
    expect(search.status).toBe(200);
    expect(search.body.data.length).toBe(1);
    expect(search.body.data[0].titulo).toMatch(/Legacy/);
  });
});
