/**
 * Health & Core Route Tests
 * 
 * Verifies backend boot, health endpoint, and error handling middleware.
 */

const request = require('supertest');
const app = require('../src/app');

describe('API Core Health & Base Endpoints', () => {
  it('GET / should return operational status and discovery info', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'Operational');
    expect(res.body).toHaveProperty('name', 'LedgerLine Financial Core API');
  });

  it('GET /api/health should return UP status and architectural invariants', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'UP');
    expect(res.body).toHaveProperty('service', 'LedgerLine Financial Core API');
    expect(res.body).toHaveProperty('phase', 'Phase 1 - Project Setup');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body.invariants).toHaveProperty('currencyPrecision', 'integer_paise');
    expect(res.body.invariants).toHaveProperty('doubleEntryEnforced', true);
    expect(res.body.invariants).toHaveProperty('aiAutonomousApproval', false);
  });

  it('GET /api/unknown-route should return 404 with structured error', async () => {
    const res = await request(app).get('/api/unknown-route');
    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('statusCode', 404);
    expect(res.body.error.message).toContain('Resource not found');
  });
});
