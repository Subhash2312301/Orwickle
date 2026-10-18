import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { initializeDummyHash, hashPassword, verifyPassword } from '../src/utils/dummy-hash';

describe('Health and Infrastructure Endpoints', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    await initializeDummyHash();
    app = createApp();
  });

  it('GET /health/live returns status alive', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'alive' });
  });

  it('GET /api/v1/health returns health payload structure', async () => {
    const res = await request(app).get('/api/v1/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('version', '1.0.0');
    expect(res.body).toHaveProperty('service', 'orwickle-backend');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('database');
  });

  it('GET /random-unknown-route triggers standard 404 with ERROR — prefix', async () => {
    const res = await request(app).get('/random-unknown-route');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(res.body.error.message).toMatch(/^ERROR —/);
  });

  it('Cookie-authenticated web request to /admin without X-Orwickle-Admin returns 403 Forbidden with ERROR — prefix', async () => {
    const res = await request(app)
      .get('/admin')
      .set('Cookie', ['refreshToken=test_token'])
      .set('Origin', 'http://localhost:5173');

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'ADMIN_HEADER_REQUIRED');
    expect(res.body.error.message).toMatch(/^ERROR —/);
  });

  it('Cookie-authenticated web request with valid X-Orwickle-Admin header passes adminHeaderCheck', async () => {
    const res = await request(app)
      .get('/admin')
      .set('Cookie', ['refreshToken=test_token'])
      .set('Origin', 'http://localhost:5173')
      .set('X-Orwickle-Admin', '1');

    expect(res.status).toBe(404);
  });

  it('Argon2 concurrency semaphore successfully coordinates parallel hash operations', async () => {
    const testPromises = Array.from({ length: 6 }, (_, i) =>
      hashPassword(`concurrent_test_password_${i}`)
    );
    const hashes = await Promise.all(testPromises);
    expect(hashes).toHaveLength(6);
    const verifyResult = await verifyPassword(hashes[0], 'concurrent_test_password_0');
    expect(verifyResult).toBe(true);
  });
});
