import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { initializeDummyHash } from '../src/utils/dummy-hash';

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

  it('GET /health returns health payload structure', async () => {
    const res = await request(app).get('/health');
    // Status can be 200 (healthy) or 503 (degraded if local db isn't up during unit testing)
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('version', '1.0.0');
    expect(res.body).toHaveProperty('service', 'orwickle-backend');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('database');
  });

  it('GET /non-existent-endpoint triggers standard 404 error response', async () => {
    const res = await request(app).get('/random-unknown-route');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(res.body.error).toHaveProperty('message');
  });
});
