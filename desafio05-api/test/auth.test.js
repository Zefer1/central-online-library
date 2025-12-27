import request from 'supertest';
import { describe, it, beforeAll, beforeEach, expect } from 'vitest';
import { __resetDbForTests } from './setup.js';

let app;
let ready;

describe('Auth API', () => {
  beforeAll(async () => {
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

  it('registers a new user and returns a JWT', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'alice', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body?.data?.token).toBeDefined();
  });

  it('allows login with a registered user', async () => {
    await request(app)
      .post('/auth/register')
      .send({ username: 'bob', password: 'password123' });

    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'bob', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body?.data?.token).toBeDefined();
  });

  it('rejects duplicate usernames on register', async () => {
    await request(app)
      .post('/auth/register')
      .send({ username: 'carol', password: 'password123' });

    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'carol', password: 'password456' });

    expect(res.status).toBe(409);
  });

  it('rejects invalid credentials', async () => {
    await request(app)
      .post('/auth/register')
      .send({ username: 'dave', password: 'password123' });

    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'dave', password: 'wrong' });

    expect(res.status).toBe(401);
  });

  it('still allows env-admin login', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body?.data?.token).toBeDefined();
  });

  it('can disable open registration via env', async () => {
    process.env.DISABLE_REGISTRATION = 'true';
    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'eve', password: 'password123' });
    expect(res.status).toBe(403);

    process.env.DISABLE_REGISTRATION = 'false';
  });
});
