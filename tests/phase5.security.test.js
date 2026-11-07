import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { assertProductionRuntimeRole, closeDb, query } from '../src/db.js';
import { getJwtSecret, validateProductionDatabaseConfiguration } from '../src/config.js';
import { runMigrations } from '../src/migrate.js';
import { isDemoSeedingEnabled, seedDatabase, SEED_CREDENTIALS } from '../src/seed.js';

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
});
