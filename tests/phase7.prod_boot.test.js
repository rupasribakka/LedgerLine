import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import crypto from 'node:crypto';
import request from 'supertest';
import {
  initDbPool,
  closeDb,
  getEmbeddedServerDetails,
  query,
} from '../src/db.js';
import { bootProductionServer } from '../scripts/start-prod.js';

describe('Production Boot Sequence & Idempotency on Empty Database', () => {
  const TEST_DB_NAME = 'ledgerline_prod_boot_fresh';
  let adminClient = null;
  let serverInstance1 = null;
  let serverInstance2 = null;
  let envBackup = null;
  let embeddedPort = null;
  let embeddedPassword = null;
  let runtimePassword = null;
  let migrationUrl = null;
  let runtimeUrl = null;

  beforeAll(async () => {
    // 1. Ensure embedded postgres is running
    await initDbPool();
    const details = getEmbeddedServerDetails();
    embeddedPort = details.port;
    embeddedPassword = details.password;

    // 2. Connect as superuser 'postgres' to default database
    adminClient = new pg.Client({
      connectionString: `postgresql://postgres:${encodeURIComponent(embeddedPassword)}@127.0.0.1:${embeddedPort}/postgres`,
    });
    await adminClient.connect();

    // 3. Create a brand new, completely empty database (0 tables, 0 migrations, 0 seed data)
    await adminClient.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
    await adminClient.query(`CREATE DATABASE ${TEST_DB_NAME}`);

    // 4. Close initial DB pool so boot sequence connects fresh to the new test database
    await closeDb(false);

    // 5. Backup process.env
    envBackup = { ...process.env };

    runtimePassword = crypto.randomBytes(32).toString('hex');
    migrationUrl = `postgresql://postgres:${encodeURIComponent(embeddedPassword)}@127.0.0.1:${embeddedPort}/${TEST_DB_NAME}`;
    runtimeUrl = `postgresql://ledgerline_runtime:${encodeURIComponent(runtimePassword)}@127.0.0.1:${embeddedPort}/${TEST_DB_NAME}`;
  });

  afterAll(async () => {
    if (serverInstance1) {
      await new Promise((r) => serverInstance1.close(r));
    }
    if (serverInstance2) {
      await new Promise((r) => serverInstance2.close(r));
    }

    await closeDb(false);

    if (adminClient) {
      try {
        await adminClient.query('ALTER ROLE ledgerline_runtime NOLOGIN').catch(() => {});
        await adminClient.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
        await adminClient.end();
      } catch (e) {
        // Ignore drop error on cleanup
      }
    }

    // Properly restore environment variables
    for (const key of Object.keys(process.env)) {
      if (!(key in envBackup)) {
        delete process.env[key];
      }
    }
    for (const [key, value] of Object.entries(envBackup)) {
      process.env[key] = value;
    }
    process.env.NODE_ENV = 'test';
  });

  it('runs full production boot against empty database and asserts runtime role, seed data, and health probe', async () => {
    // Configure production environment variables pointing to the fresh empty database
    process.env.NODE_ENV = 'production';
    process.env.MIGRATION_DATABASE_URL = migrationUrl;
    process.env.DATABASE_URL = runtimeUrl;
    process.env.JWT_SECRET = crypto.randomBytes(48).toString('base64url');
    process.env.LEDGERLINE_SEED_DEMO_USERS = 'true';
    process.env.LEDGERLINE_ALLOW_PROD_SEED = 'true';

    // Boot the production server (port: 0 binds to an ephemeral port)
    const { app, server } = await bootProductionServer({ port: 0 });
    serverInstance1 = server;

    // 1. Assert runtime role exists in PostgreSQL with LOGIN and not superuser
    const roleRes = await adminClient.query(
      "SELECT rolname, rolcanlogin, rolsuper FROM pg_roles WHERE rolname = 'ledgerline_runtime'"
    );
    expect(roleRes.rowCount).toBe(1);
    expect(roleRes.rows[0].rolcanlogin).toBe(true);
    expect(roleRes.rows[0].rolsuper).toBe(false);

    // 2. Assert app queries connect as the restricted runtime role
    const whoami = await query('SELECT current_user');
    expect(whoami.rows[0].current_user).toBe('ledgerline_runtime');

    // 3. Assert seed users exist (admin, holder1, holder2, auditor)
    const usersRes = await query('SELECT email, role FROM users ORDER BY id ASC');
    expect(usersRes.rowCount).toBe(4);
    const emails = usersRes.rows.map((r) => r.email);
    expect(emails).toContain('admin@ledgerline.local');
    expect(emails).toContain('holder1@ledgerline.local');
    expect(emails).toContain('holder2@ledgerline.local');
    expect(emails).toContain('auditor@ledgerline.local');

    // 4. Assert seed ledger rows exist (2 deposits = 4 double-entry rows)
    const ledgerRes = await query('SELECT id, kind, amount_paise FROM ledger ORDER BY id ASC');
    expect(ledgerRes.rowCount).toBe(4);

    // Assert global balance invariant: SUM(balances) === 0
    const sumRes = await query('SELECT SUM(balance_paise) AS global_sum FROM accounts');
    expect(BigInt(sumRes.rows[0].global_sum)).toBe(0n);

    // 5. Assert GET /api/health returns {"status":"ok"}
    const healthRes = await request(app).get('/api/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body).toEqual({ status: 'ok' });

    // Close first server and reset DB pool for second boot
    await new Promise((r) => server.close(r));
    serverInstance1 = null;
    await closeDb(false);
  });

  it('second boot on the same database succeeds idempotently without duplicate users or money', async () => {
    // Run second boot on the same database that already has tables and seed data
    const { app, server } = await bootProductionServer({ port: 0 });
    serverInstance2 = server;

    // Assert user count is STILL 4 (no duplicate users)
    const usersRes = await query('SELECT COUNT(*) AS count FROM users');
    expect(parseInt(usersRes.rows[0].count, 10)).toBe(4);

    // Assert ledger entries count is STILL 4 (no duplicate money movement)
    const ledgerRes = await query('SELECT COUNT(*) AS count FROM ledger');
    expect(parseInt(ledgerRes.rows[0].count, 10)).toBe(4);

    // Assert Holder 1 primary account balance is STILL exactly 500,000 paise (5,000 INR)
    const h1Bal = await query("SELECT balance_paise FROM accounts WHERE account_no = 'ACC-H1-01'");
    expect(BigInt(h1Bal.rows[0].balance_paise)).toBe(500000n);

    // Assert Holder 1 savings balance is STILL exactly 250,000 paise (2,500 INR)
    const h2Bal = await query("SELECT balance_paise FROM accounts WHERE account_no = 'ACC-H1-02'");
    expect(BigInt(h2Bal.rows[0].balance_paise)).toBe(250000n);

    // Assert global sum of all accounts is STILL 0
    const sumRes = await query('SELECT SUM(balance_paise) AS global_sum FROM accounts');
    expect(BigInt(sumRes.rows[0].global_sum)).toBe(0n);

    // Assert health endpoint responds successfully
    const healthRes = await request(app).get('/api/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body).toEqual({ status: 'ok' });

    // Verify financial operations succeed as the runtime role (proving USAGE and SELECT on bigserial sequences)
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'holder1@ledgerline.local', password: 'Holder1Password123!' });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    const accs = await query("SELECT id, account_no FROM accounts WHERE account_no IN ('ACC-H1-01', 'ACC-H2-01')");
    const h1Acc = accs.rows.find((a) => a.account_no === 'ACC-H1-01');
    const h2Acc = accs.rows.find((a) => a.account_no === 'ACC-H2-01');

    const transferRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `prod-boot-xfer-${crypto.randomUUID()}`)
      .send({
        from_account_id: h1Acc.id,
        to_account_id: h2Acc.id,
        amount: 1000,
      });
    expect(transferRes.status).toBe(200);
    expect(transferRes.body.txn_id).toBeDefined();
    expect(transferRes.body.entries).toHaveLength(2);

    // Assert that ledger entries increased by 2 (new debit + credit rows inserted into bigserial ledger)
    const afterLedger = await query('SELECT COUNT(*) AS count FROM ledger');
    expect(parseInt(afterLedger.rows[0].count, 10)).toBe(6);

    // Assert that the actual production runtime role CANNOT change protected account fields:
    await expect(query('UPDATE accounts SET owner_id = 999 WHERE id = $1', [h1Acc.id])).rejects.toThrow(/permission denied/i);
    await expect(query("UPDATE accounts SET account_no = 'HACKED' WHERE id = $1", [h1Acc.id])).rejects.toThrow(/permission denied/i);
    await expect(query('UPDATE accounts SET is_external = true WHERE id = $1', [h1Acc.id])).rejects.toThrow(/permission denied/i);

    // Assert that the actual production runtime role CANNOT mutate or truncate the ledger:
    await expect(query('UPDATE ledger SET amount_paise = 999999 WHERE id = 1')).rejects.toThrow(/permission denied/i);
    await expect(query('DELETE FROM ledger WHERE id = 1')).rejects.toThrow(/permission denied/i);
    await expect(query('TRUNCATE ledger')).rejects.toThrow(/permission denied/i);

    // Close second server
    await new Promise((r) => server.close(r));
    serverInstance2 = null;
    await closeDb(false);
  });
});
