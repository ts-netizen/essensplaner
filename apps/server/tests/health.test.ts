import { describe, it, expect } from 'vitest';
import { createTestClient } from './testClient.js';
import { createApp } from '../src/app.js';

describe('Health & Routing Tests', () => {
  it('GET /health returns 200 ok and uptime', async () => {
    const app = createApp();
    const res = await createTestClient(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.services).toBeDefined();
  });

  it('GET /api/health returns 200 ok', async () => {
    const app = createApp();
    const res = await createTestClient(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/unknown-endpoint returns 404', async () => {
    const app = createApp();
    const res = await createTestClient(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Endpoint nicht gefunden');
  });
});
