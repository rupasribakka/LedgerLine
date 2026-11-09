import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { getClient, withTransaction, closeDb } from '../src/db.js';
import { runMigrations } from '../src/migrate.js';
import { seedDatabase } from '../src/seed.js';
import app from '../src/app.js';
import { SlidingWindowRateLimiter } from '../src/rate-limiter.js';
import { checkRedisHealth, closeRedis } from '../src/redis.js';
import { bootstrapAdmin } from '../scripts/bootstrap-admin.js';
import { getPrismaClient, setPrismaDatasourceUrl } from '../src/prisma.js';

describe('BalanceVault Upgrade & Alignment Suite', () => {
  beforeAll(async () => {
    // Run migrations and seed
    await runMigrations();
    await seedDatabase();
    if (process.env.DATABASE_URL) {
      setPrismaDatasourceUrl(process.env.DATABASE_URL);
    }
  });

  afterAll(async () => {
    await closeRedis();
    const prisma = getPrismaClient();
    await prisma.$disconnect().catch(() => {});
  });

  describe('1. Deployment Health Checks', () => {
    it('GET /api/health strictly returns { status: "ok" } for standard probes', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('GET /health returns { status: "ok" }', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('GET /api/health?details=true returns deep database and redis diagnostics', async () => {
      const res = await request(app).get('/api/health?details=true');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('BalanceVault');
      expect(res.body.checks).toBeDefined();
      expect(res.body.checks.database.status).toBe('healthy');
      expect(res.body.checks.database.latencyMs).toBeTypeOf('number');
      expect(res.body.checks.redis.status).toBeDefined();
    });

    it('GET /api/health/details returns detailed diagnostics endpoint', async () => {
      const res = await request(app).get('/api/health/details');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('BalanceVault');
      expect(res.body.checks.database.status).toBe('healthy');
    });
  });

  describe('2. First-Admin Bootstrap CLI Script', () => {
    it('idempotently verifies or provisions the system administrator', async () => {
      // 1. Run bootstrap with test credentials
      const firstResult = await bootstrapAdmin({
        email: 'superadmin@balancevault.local',
        password: 'SuperAdminPassword123!',
        name: 'Root Administrator',
      });

      expect(['CREATED', 'ALREADY_EXISTS', 'ELEVATED']).toContain(firstResult.status);
      expect(firstResult.user.email).toBeDefined();

      // 2. Second run must be strictly idempotent
      const secondResult = await bootstrapAdmin({
        email: 'superadmin@balancevault.local',
        password: 'SuperAdminPassword123!',
        name: 'Root Administrator',
      });

      expect(secondResult.status).toBe('ALREADY_EXISTS');
      expect(secondResult.user.role).toBe('admin');
    });

    it('rejects weak admin passwords < 8 characters', async () => {
      await expect(
        bootstrapAdmin({
          email: 'weakadmin@balancevault.local',
          password: 'short',
        })
      ).rejects.toThrow('Admin password must be at least 8 characters long.');
    });

    it('blocks automatic privilege escalation of an ordinary user without explicit authorization', async () => {
      const client = await getClient();
      const testEmail = 'isolated_holder_test@balancevault.local';
      try {
        await client.query(
          `INSERT INTO users (email, password_hash, role, name)
           VALUES ($1, $2, 'holder', 'Isolated Test Holder')
           ON CONFLICT (email) DO NOTHING`,
          [testEmail, '$2a$10$placeholderhashplaceholderhashplaceho']
        );
      } finally {
        client.release();
      }

      await expect(
        bootstrapAdmin({
          email: testEmail,
          password: 'NewAdminPassword123!',
          allowElevation: false,
        })
      ).rejects.toThrow('Automatic privilege escalation is prohibited');

      // Passes when explicitly authorized with allowElevation: true
      const elevatedRes = await bootstrapAdmin({
        email: testEmail,
        password: 'NewAdminPassword123!',
        allowElevation: true,
      });
      expect(elevatedRes.status).toBe('ELEVATED');
      expect(elevatedRes.user.role).toBe('admin');
    });
  });

  describe('3. Redis Rate Limiting & Resilience Fallback', () => {
    it('reports fallback_in_memory when Redis URL is unconfigured or offline', async () => {
      const health = await checkRedisHealth();
      expect(['connected', 'fallback_in_memory']).toContain(health.status);
    });

    it('enforces sliding-window limit in in-memory fallback mode', async () => {
      const testLimiter = new SlidingWindowRateLimiter({
        name: 'test_limit',
        windowMs: 10000,
        maxAttempts: 3,
        autoRecord: false,
      });

      const testKey = 'ip_user_123';
      testLimiter.reset(testKey);

      expect(await testLimiter.isRateLimited(testKey)).toBe(false);
      testLimiter.recordAttempt(testKey);

      expect(await testLimiter.isRateLimited(testKey)).toBe(false);
      testLimiter.recordAttempt(testKey);

      expect(await testLimiter.isRateLimited(testKey)).toBe(false);
      testLimiter.recordAttempt(testKey);

      // 4th attempt should be blocked
      expect(await testLimiter.isRateLimited(testKey)).toBe(true);

      // Reset clears key
      testLimiter.reset(testKey);
      expect(await testLimiter.isRateLimited(testKey)).toBe(false);
    });

    it('atomically handles simultaneous concurrent requests without exceeding limits', async () => {
      const concurrentLimiter = new SlidingWindowRateLimiter({
        name: 'concurrent_test',
        windowMs: 60000,
        maxAttempts: 10,
        autoRecord: true,
      });

      const key = 'concurrent_ip_user_456';
      concurrentLimiter.reset(key);

      // Fire 25 simultaneous concurrent requests in parallel
      const results = await Promise.all(
        Array.from({ length: 25 }, () => concurrentLimiter.isRateLimitedAsync(key))
      );

      const allowedCount = results.filter((r) => r === false).length;
      const blockedCount = results.filter((r) => r === true).length;

      expect(allowedCount).toBe(10);
      expect(blockedCount).toBe(15);
    });
  });

  describe('4. PostgreSQL / Prisma Integration', () => {
    it('Prisma client initializes and queries users table successfully', async () => {
      const prisma = getPrismaClient();
      const users = await prisma.user.findMany({
        take: 5,
        select: { id: true, email: true, role: true },
      });

      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
      expect(users.some((u) => u.role === 'admin')).toBe(true);
    });

    it('Prisma client can query accounts table', async () => {
      const prisma = getPrismaClient();
      const accounts = await prisma.account.findMany({
        take: 5,
        select: { id: true, accountNo: true, balancePaise: true, status: true },
      });

      expect(Array.isArray(accounts)).toBe(true);
      expect(accounts.length).toBeGreaterThan(0);
    });
  });

  describe('5. Database Roles (balancevault_runtime & ledgerline_runtime)', () => {
    it('verifies balancevault_runtime and ledgerline_runtime roles exist in pg_roles', async () => {
      const client = await getClient();
      try {
        const res = await client.query(
          "SELECT rolname FROM pg_roles WHERE rolname IN ('balancevault_runtime', 'ledgerline_runtime')"
        );
        const roleNames = res.rows.map((r) => r.rolname);
        expect(roleNames).toContain('balancevault_runtime');
        expect(roleNames).toContain('ledgerline_runtime');
      } finally {
        client.release();
      }
    });
  });
});
