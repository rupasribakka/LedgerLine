import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { assertProductionRuntimeRole, closeDb, query } from '../src/db.js';
import { getJwtSecret, validateProductionDatabaseConfiguration } from '../src/config.js';
import { runMigrations } from '../src/migrate.js';
import { isDemoSeedingEnabled, seedDatabase, SEED_CREDENTIALS } from '../src/seed.js';
import { computeRequestHash } from '../src/hash.js';
import { isValidPositiveSafeInteger, getExternalAccountId } from '../src/ledger.js';
import { loginLimiter, moneyLimiter, failedLoginAuditCap } from '../src/auth.js';

describe('Phase 5 - Security configuration and production defaults', () => {
  beforeAll(async () => {
    await runMigrations();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('rejects a missing JWT secret and weak production secrets', () => {
    expect(() => getJwtSecret({ secret: '', nodeEnv: 'production' })).toThrow(
      'JWT_SECRET must be configured'
    );
    expect(() => getJwtSecret({ secret: 'too-short', nodeEnv: 'production' })).toThrow(
      'at least 32 bytes'
    );
    const developmentSecret = crypto.randomBytes(48).toString('base64url');
    expect(getJwtSecret({ secret: developmentSecret, nodeEnv: 'development' })).toBe(developmentSecret);
  });

  it('fails to load authentication in production when JWT_SECRET is missing', () => {
    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', "await import('./src/auth.js')"],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          NODE_ENV: 'production',
          JWT_SECRET: '',
        },
      }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('JWT_SECRET must be configured');
  });

  it('requires distinct production runtime and migration database roles', () => {
    expect(() =>
      validateProductionDatabaseConfiguration({
        NODE_ENV: 'production',
        DATABASE_URL: '',
        MIGRATION_DATABASE_URL: '',
      })
    ).toThrow('requires both DATABASE_URL and MIGRATION_DATABASE_URL');

    expect(() =>
      validateProductionDatabaseConfiguration({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://same-role@db.example/ledgerline',
        MIGRATION_DATABASE_URL: 'postgresql://same-role@db.example/ledgerline',
      })
    ).toThrow('distinct runtime and migration roles');

    expect(() =>
      validateProductionDatabaseConfiguration({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://runtime-role@db.example/ledgerline',
        MIGRATION_DATABASE_URL: 'postgresql://migration-role@db.example/ledgerline',
      })
    ).not.toThrow();
  });

  it('does not seed demo users in production, even when the flag is set', async () => {
    expect(isDemoSeedingEnabled({
      NODE_ENV: 'production',
      LEDGERLINE_SEED_DEMO_USERS: 'true',
    })).toBe(false);

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await expect(
      seedDatabase({
        env: {
          NODE_ENV: 'production',
          LEDGERLINE_SEED_DEMO_USERS: 'true',
        },
      })
    ).resolves.toEqual({ seeded: false });
    expect(log).toHaveBeenCalledWith('[SEED] Demo seeding is disabled.');
    log.mockRestore();
  });

  it('seeds only when explicitly enabled and never logs demo credentials', async () => {
    expect(isDemoSeedingEnabled({
      NODE_ENV: 'development',
      LEDGERLINE_SEED_DEMO_USERS: 'true',
    })).toBe(true);
    expect(isDemoSeedingEnabled({
      NODE_ENV: 'development',
      LEDGERLINE_SEED_DEMO_USERS: 'false',
    })).toBe(false);

    const output = [];
    const log = vi.spyOn(console, 'log').mockImplementation((...args) => {
      output.push(args.join(' '));
    });

    try {
      await expect(
        seedDatabase({
          env: {
            NODE_ENV: 'development',
            LEDGERLINE_SEED_DEMO_USERS: 'true',
          },
        })
      ).resolves.toEqual({ seeded: true });
    } finally {
      log.mockRestore();
    }

    const capturedOutput = output.join('\n');
    for (const credential of SEED_CREDENTIALS) {
      expect(capturedOutput).not.toContain(credential.email);
      expect(capturedOutput).not.toContain(credential.password);
    }
  });

  it('grants runtime access only to the required tables and operations', async () => {
    const roleResult = await query(
      "SELECT rolcanlogin FROM pg_roles WHERE rolname = 'ledgerline_runtime'"
    );
    expect(roleResult.rows).toEqual([{ rolcanlogin: false }]);

    const privileges = await query(`
      SELECT
        has_table_privilege('ledgerline_runtime', 'users', 'SELECT') AS users_read,
        has_table_privilege('ledgerline_runtime', 'users', 'INSERT') AS users_insert,
        has_table_privilege('ledgerline_runtime', 'accounts', 'INSERT') AS accounts_insert,
        has_table_privilege('ledgerline_runtime', 'accounts', 'UPDATE') AS accounts_update,
        has_table_privilege('ledgerline_runtime', 'accounts', 'DELETE') AS accounts_delete,
        has_table_privilege('ledgerline_runtime', 'ledger', 'SELECT') AS ledger_read,
        has_table_privilege('ledgerline_runtime', 'ledger', 'INSERT') AS ledger_insert,
        has_table_privilege('ledgerline_runtime', 'ledger', 'UPDATE') AS ledger_update,
        has_table_privilege('ledgerline_runtime', 'ledger', 'DELETE') AS ledger_delete,
        has_table_privilege('ledgerline_runtime', 'idempotency_keys', 'UPDATE') AS idempotency_update,
        has_column_privilege('ledgerline_runtime', 'accounts', 'balance_paise', 'UPDATE') AS balance_update,
        has_column_privilege('ledgerline_runtime', 'idempotency_keys', 'state', 'UPDATE') AS idempotency_state_update
    `);

    expect(privileges.rows[0]).toEqual({
      users_read: true,
      users_insert: false,
      accounts_insert: true,
      accounts_update: false,
      accounts_delete: false,
      ledger_read: true,
      ledger_insert: true,
      ledger_update: false,
      ledger_delete: false,
      idempotency_update: false,
      balance_update: true,
      idempotency_state_update: true,
    });
  });

  it('rejects a privileged database user as the production runtime role', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await expect(assertProductionRuntimeRole()).rejects.toThrow(
        'does not meet LedgerLine runtime least-privilege requirements'
      );
    } finally {
      if (previousNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }
    }
  });

  // =========================================================================
  // HARDENED SECURITY INVARIANTS: Items 2.a through 2.k
  // =========================================================================
  describe('Items 2.a - 2.k Specification Verification', () => {
    let adminToken, holder1Token, holder2Token, auditorToken;
    let holder1User, holder2User;
    let h1Account, h2Account;

    beforeAll(async () => {
      await seedDatabase({ env: { NODE_ENV: 'test', LEDGERLINE_SEED_DEMO_USERS: 'true' } });

      const adminLogin = await request(app)
        .post('/auth/login')
        .send({ email: 'admin@ledgerline.local', password: 'AdminPassword123!' });
      adminToken = adminLogin.body.token;

      const h1Login = await request(app)
        .post('/auth/login')
        .send({ email: 'holder1@ledgerline.local', password: 'Holder1Password123!' });
      holder1Token = h1Login.body.token;
      holder1User = h1Login.body.user;

      const h2Login = await request(app)
        .post('/auth/login')
        .send({ email: 'holder2@ledgerline.local', password: 'Holder2Password123!' });
      holder2Token = h2Login.body.token;
      holder2User = h2Login.body.user;

      const auditorLogin = await request(app)
        .post('/auth/login')
        .send({ email: 'auditor@ledgerline.local', password: 'AuditorPassword123!' });
      auditorToken = auditorLogin.body.token;

      const accRes = await request(app)
        .get('/accounts')
        .set('Authorization', `Bearer ${adminToken}`);
      const accs = accRes.body.accounts;
      h1Account = accs.find((a) => !a.is_external && a.owner_id === holder1User.id);
      h2Account = accs.find((a) => !a.is_external && a.owner_id === holder2User.id);
    });

    it('2.a: requestHash is sha256 of canonical sorted-key JSON of {kind, fromAccountId, toAccountId, amount}', async () => {
      const h1 = computeRequestHash({ kind: 'transfer', fromAccountId: 10, toAccountId: 20, amount: 50000 });
      const h2 = computeRequestHash({ toAccountId: 20, amount: 50000, kind: 'transfer', fromAccountId: 10 });
      expect(h1).toBe(h2);

      const expectedJson = JSON.stringify({
        amount: 50000,
        fromAccountId: 10,
        kind: 'transfer',
        toAccountId: 20,
      });
      const expectedHash = crypto.createHash('sha256').update(expectedJson).digest('hex');
      expect(h1).toBe(expectedHash);

      // Verify idempotency replay and payload mismatch using distinct key
      const key = `reqhash-test-${crypto.randomUUID()}`;
      const res1 = await request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${holder1Token}`)
        .set('Idempotency-Key', key)
        .send({ amount: 1000, from_account_id: h1Account.id, to_account_id: h2Account.id });
      expect(res1.status).toBe(200);

      // Replay with differently ordered payload keys => exact replay matches
      const resReplay = await request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${holder1Token}`)
        .set('Idempotency-Key', key)
        .send({ to_account_id: h2Account.id, amount: 1000, from_account_id: h1Account.id });
      expect(resReplay.status).toBe(200);
      expect(resReplay.headers['idempotent-replay']).toBe('true');

      // Replay with different payload => 422
      const resMismatch = await request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${holder1Token}`)
        .set('Idempotency-Key', key)
        .send({ from_account_id: h1Account.id, to_account_id: h2Account.id, amount: 2000 });
      expect(resMismatch.status).toBe(422);
      expect(resMismatch.body.code).toBe('IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH');
    });

    it('2.b: account IDs accept only positive safe integers ("2abc", 1.9, -1, 1e30 are rejected with 400)', async () => {
      expect(isValidPositiveSafeInteger('2abc')).toBe(false);
      expect(isValidPositiveSafeInteger(1.9)).toBe(false);
      expect(isValidPositiveSafeInteger(-1)).toBe(false);
      expect(isValidPositiveSafeInteger(1e30)).toBe(false);
      expect(isValidPositiveSafeInteger('1e30')).toBe(false);
      expect(isValidPositiveSafeInteger(0)).toBe(false);
      expect(isValidPositiveSafeInteger(1)).toBe(true);
      expect(isValidPositiveSafeInteger('42')).toBe(true);

      const badIds = ['2abc', '1.9', '-1', '1e30'];
      for (const badId of badIds) {
        const getRes = await request(app)
          .get(`/accounts/${badId}`)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(getRes.status).toBe(400);
        expect(getRes.body.code).toBe('INVALID_ID');

        const stmtRes = await request(app)
          .get(`/accounts/${badId}/statement`)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(stmtRes.status).toBe(400);
        expect(stmtRes.body.code).toBe('INVALID_ID');
      }

      const withdrawRes = await request(app)
        .post('/withdrawals')
        .set('Authorization', `Bearer ${holder1Token}`)
        .set('Idempotency-Key', `bad-acc-${crypto.randomUUID()}`)
        .send({ account_id: '2abc', amount: 100 });
      expect(withdrawRes.status).toBe(400);
      expect(withdrawRes.body.code).toBe('INVALID_ACCOUNT_ID');

      const transferRes = await request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${holder1Token}`)
        .set('Idempotency-Key', `bad-acc-${crypto.randomUUID()}`)
        .send({ from_account_id: -1, to_account_id: h2Account.id, amount: 100 });
      expect(transferRes.status).toBe(400);
      expect(transferRes.body.code).toBe('INVALID_ACCOUNT_ID');
    });

    it('2.c: /transfers rejects ACC-EXTERNAL as source or destination', async () => {
      const extId = await getExternalAccountId();

      const resStringFrom = await request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', `ext-transfer-${crypto.randomUUID()}`)
        .send({ from_account_id: 'ACC-EXTERNAL', to_account_id: h1Account.id, amount: 1000 });
      expect(resStringFrom.status).toBe(400);
      expect(resStringFrom.body.code).toBe('EXTERNAL_TRANSFER_PROHIBITED');

      const resStringTo = await request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', `ext-transfer-${crypto.randomUUID()}`)
        .send({ from_account_id: h1Account.id, to_account_no: 'ACC-EXTERNAL', amount: 1000 });
      expect(resStringTo.status).toBe(400);
      expect(resStringTo.body.code).toBe('EXTERNAL_TRANSFER_PROHIBITED');

      const resIdFrom = await request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', `ext-transfer-${crypto.randomUUID()}`)
        .send({ from_account_id: extId, to_account_id: h1Account.id, amount: 1000 });
      expect(resIdFrom.status).toBe(400);
      expect(resIdFrom.body.code).toBe('EXTERNAL_TRANSFER_PROHIBITED');

      const resIdTo = await request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', `ext-transfer-${crypto.randomUUID()}`)
        .send({ from_account_id: h1Account.id, to_account_id: extId, amount: 1000 });
      expect(resIdTo.status).toBe(400);
      expect(resIdTo.body.code).toBe('EXTERNAL_TRANSFER_PROHIBITED');
    });

    it('2.d: the user role is re-read from the DB on every request, not trusted from the JWT', async () => {
      const forgedAdminToken = jwt.sign(
        { id: holder1User.id, email: holder1User.email, role: 'admin' },
        getJwtSecret(),
        { algorithm: 'HS256' }
      );

      const meRes = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${forgedAdminToken}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.user.role).toBe('holder');

      const adminActionRes = await request(app)
        .post('/accounts')
        .set('Authorization', `Bearer ${forgedAdminToken}`)
        .send({ name: 'Forged Admin Account', owner_id: holder1User.id });
      expect(adminActionRes.status).toBe(403);
      expect(adminActionRes.body.code).toBe('FORBIDDEN');
    });

    it('2.e: JWT with alg none and tampered tokens are rejected', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ id: holder1User.id, email: holder1User.email, role: 'holder' })).toString('base64url');
      const noneToken = `${header}.${payload}.`;

      const resNone = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${noneToken}`);
      expect(resNone.status).toBe(401);
      expect(resNone.body.code).toBe('INVALID_TOKEN');

      const parts = holder1Token.split('.');
      const tamperedSig = parts[2].slice(0, -3) + 'XYZ';
      const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSig}`;

      const resTampered = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`);
      expect(resTampered.status).toBe(401);
      expect(resTampered.body.code).toBe('INVALID_TOKEN');
    });

    it('2.f: rate limit on login and on money endpoints (disabled in test)', async () => {
      // 1. Login rate limit triggers 429 on 6th failed attempt
      const targetEmail = `rate-login-${Date.now()}@test.local`;
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/auth/login')
          .send({ email: targetEmail, password: 'WrongPassword!' });
        expect(res.status).toBe(401);
      }
      const limitedRes = await request(app)
        .post('/auth/login')
        .send({ email: targetEmail, password: 'WrongPassword!' });
      expect(limitedRes.status).toBe(429);
      expect(limitedRes.body.code).toBe('RATE_LIMITED');

      // 2. Money rate limit is disabled in test mode by default
      moneyLimiter.reset();
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/withdrawals')
          .set('Authorization', `Bearer ${holder1Token}`)
          .set('Idempotency-Key', `rate-money-default-${i}`)
          .send({ account_id: h1Account.id, amount: 1 });
        expect(res.status).not.toBe(429);
      }

      // 3. Money rate limit triggers 429 when explicitly enabled
      let hitMoneyLimit = false;
      for (let i = 0; i < 70; i++) {
        const res = await request(app)
          .post('/withdrawals')
          .set('Authorization', `Bearer ${holder1Token}`)
          .set('x-enable-rate-limit-for-test', 'true')
          .set('Idempotency-Key', `rate-money-enabled-${i}`)
          .send({ account_id: h1Account.id, amount: 1 });
        if (res.status === 429) {
          expect(res.body.code).toBe('RATE_LIMITED');
          hitMoneyLimit = true;
          break;
        }
      }
      expect(hitMoneyLimit).toBe(true);
      moneyLimiter.reset();
    });

    it('2.g: helmet, 10kb body limit, CORS allow-list from env', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['strict-transport-security']).toBeDefined();
      expect(res.headers['content-security-policy']).toContain("default-src 'self'");

      const largePayload = 'A'.repeat(12 * 1024);
      const largeRes = await request(app)
        .post('/accounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send(`{"name":"${largePayload}","owner_id":${holder1User.id}}`);
      expect(largeRes.status).toBe(413);
      expect(largeRes.body.code).toBe('PAYLOAD_TOO_LARGE');

      const prevCors = process.env.CORS_ALLOWED_ORIGINS;
      process.env.CORS_ALLOWED_ORIGINS = 'https://app.ledgerline.local,https://admin.ledgerline.local';
      try {
        const allowedRes = await request(app)
          .get('/api/health')
          .set('Origin', 'https://app.ledgerline.local');
        expect(allowedRes.headers['access-control-allow-origin']).toBe('https://app.ledgerline.local');

        const blockedRes = await request(app)
          .get('/api/health')
          .set('Origin', 'https://evil.attacker.local');
        expect(blockedRes.headers['access-control-allow-origin']).toBeUndefined();
      } finally {
        if (prevCors === undefined) delete process.env.CORS_ALLOWED_ORIGINS;
        else process.env.CORS_ALLOWED_ORIGINS = prevCors;
      }
    });

    it('2.h: errors return {error, code} with no stack trace or SQL text', async () => {
      const errRes = await request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${holder1Token}`)
        .send({});
      expect(errRes.body).toHaveProperty('error');
      expect(errRes.body).toHaveProperty('code');
      expect(errRes.body).not.toHaveProperty('stack');
      expect(errRes.body.error).not.toMatch(/SELECT|INSERT|UPDATE|DELETE|relation|column/i);
      expect(errRes.body.code).not.toMatch(/^[0-9]{5}$/);
    });

    it('2.i: failed-login audit logging is capped', async () => {
      const spamEmail = `capped-audit-${Date.now()}@test.local`;
      failedLoginAuditCap.reset();

      for (let i = 0; i < 15; i++) {
        await request(app)
          .post('/auth/login')
          .send({ email: spamEmail, password: 'BadPassword123!' });
      }

      const logRes = await query(
        "SELECT COUNT(*) FROM audit_logs WHERE action = 'AUTH_LOGIN_FAILED' AND metadata->>'email' = $1",
        [spamEmail]
      );
      const count = parseInt(logRes.rows[0].count, 10);
      expect(count).toBeLessThanOrEqual(5);
      failedLoginAuditCap.reset();
    });

    it('2.j: production startup refuses to run unless JWT_SECRET is at least 32 chars, DATABASE_URL and MIGRATION_DATABASE_URL are set, and the app is connected as the restricted role (never falling back to embedded Postgres)', async () => {
      expect(() => getJwtSecret({ secret: 'short', nodeEnv: 'production' })).toThrow();
      expect(() =>
        validateProductionDatabaseConfiguration({
          NODE_ENV: 'production',
          DATABASE_URL: '',
          MIGRATION_DATABASE_URL: '',
        })
      ).toThrow();
    });

    it('2.k: old routes (/auth/*, /deposits, /withdrawals, /transfers, /accounts*, /audit/*) and roles admin/holder/auditor still work', async () => {
      const meRes = await request(app).get('/auth/me').set('Authorization', `Bearer ${holder1Token}`);
      expect(meRes.status).toBe(200);

      const accsRes = await request(app).get('/accounts').set('Authorization', `Bearer ${adminToken}`);
      expect(accsRes.status).toBe(200);

      const accRes = await request(app).get(`/accounts/${h1Account.id}`).set('Authorization', `Bearer ${holder1Token}`);
      expect(accRes.status).toBe(200);

      const stmtRes = await request(app).get(`/accounts/${h1Account.id}/statement`).set('Authorization', `Bearer ${holder1Token}`);
      expect(stmtRes.status).toBe(200);

      const depRes = await request(app)
        .post('/deposits')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', `old-route-dep-${crypto.randomUUID()}`)
        .send({ account_id: h1Account.id, amount: 2000 });
      expect(depRes.status).toBe(200);

      const wdRes = await request(app)
        .post('/withdrawals')
        .set('Authorization', `Bearer ${holder1Token}`)
        .set('Idempotency-Key', `old-route-wd-${crypto.randomUUID()}`)
        .send({ account_id: h1Account.id, amount: 1000 });
      expect(wdRes.status).toBe(200);

      const xferRes = await request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${holder1Token}`)
        .set('Idempotency-Key', `old-route-xfer-${crypto.randomUUID()}`)
        .send({ from_account_id: h1Account.id, to_account_id: h2Account.id, amount: 500 });
      expect(xferRes.status).toBe(200);

      const verifyRes = await request(app).get('/audit/verify').set('Authorization', `Bearer ${auditorToken}`);
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.verified).toBe(true);

      const dupRes = await request(app).get('/audit/duplicates').set('Authorization', `Bearer ${auditorToken}`);
      expect(dupRes.status).toBe(200);

      const logsRes = await request(app).get('/audit/logs').set('Authorization', `Bearer ${auditorToken}`);
      expect(logsRes.status).toBe(200);

      const auditorWriteRes = await request(app)
        .post('/deposits')
        .set('Authorization', `Bearer ${auditorToken}`)
        .set('Idempotency-Key', `auditor-write-${crypto.randomUUID()}`)
        .send({ account_id: h1Account.id, amount: 1000 });
      expect(auditorWriteRes.status).toBe(403);
    });
  });
});
