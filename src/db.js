import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { validateProductionDatabaseConfiguration } from './config.js';

dotenv.config();

// Ensure BIGINT (Postgres type 20) is parsed as BigInt or handled safely
pg.types.setTypeParser(20, (val) => (val === null ? null : BigInt(val)));

// Enable clean JSON serialization for BigInt values
BigInt.prototype.toJSON = function () {
  return Number(this);
};

let embeddedServer = null;
let embeddedDatabaseDir = null;
let testEmbeddedPassword = null;
let testEmbeddedPort = null;
let pool = null;
let migrationPool = null;

export function getEmbeddedServerDetails() {
  return {
    port: testEmbeddedPort,
    password: testEmbeddedPassword,
    databaseDir: embeddedDatabaseDir,
  };
}

export function formatFatalBootError(error) {
  if (!error) return 'code: N/A, message: unknown error, routine: N/A';

  const code = error.code || 'N/A';
  const routine = error.routine || 'N/A';
  const rawMessage = error.message || String(error);

  const sanitizedMessage = rawMessage
    .replace(/postgres(?:ql)?:\/\/[^\s@]+@[^\s]+/gi, 'postgresql://[REDACTED]')
    .replace(/password\s*=\s*['"]?[^\s'";]+['"]?/gi, 'password=[REDACTED]');

  return `code: ${code}, message: ${sanitizedMessage}, routine: ${routine}`;
}

async function getTestEmbeddedPort() {
  if (testEmbeddedPort) return testEmbeddedPort;

  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  testEmbeddedPort = server.address().port;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  return testEmbeddedPort;
}

export async function initDbPool() {
  if (pool) return pool;

  let connectionString = process.env.DATABASE_URL;

  if (process.env.NODE_ENV === 'production' && !connectionString) {
    throw new Error('DATABASE_URL is required in production.');
  }

  if (!connectionString) {
    const embeddedPassword =
      process.env.NODE_ENV === 'test'
        ? (testEmbeddedPassword ||= crypto.randomBytes(32).toString('hex'))
        : process.env.LEDGERLINE_EMBEDDED_DB_PASSWORD;
    if (!embeddedPassword) {
      throw new Error(
        'Set DATABASE_URL or configure LEDGERLINE_EMBEDDED_DB_PASSWORD for local embedded PostgreSQL.'
      );
    }

    validateProductionDatabaseConfiguration();
    const port =
      process.env.NODE_ENV === 'test' ? await getTestEmbeddedPort() : 5433;
    connectionString = `postgresql://postgres:${encodeURIComponent(embeddedPassword)}@localhost:${port}/postgres`;

    let alreadyRunning = false;
    try {
      const testClient = new pg.Client({ connectionString, connectionTimeoutMillis: 1000 });
      await testClient.connect();
      await testClient.end();
      alreadyRunning = true;
    } catch (e) {
      alreadyRunning = false;
    }

    if (!alreadyRunning && !embeddedServer) {
      console.log('[DB] No DATABASE_URL provided. Initializing local embedded PostgreSQL 16...');
      const { default: EmbeddedPostgres } = await import('embedded-postgres');
      embeddedDatabaseDir =
        process.env.NODE_ENV === 'test'
          ? fs.mkdtempSync(path.join(os.tmpdir(), 'ledgerline-test-postgres-'))
          : process.env.LEDGERLINE_EMBEDDED_DB_DIR || './.pgdata';
      embeddedServer = new EmbeddedPostgres({
        port,
        databaseDir: embeddedDatabaseDir,
        user: 'postgres',
        password: embeddedPassword,
        persistent: true,
      });

      try {
        await embeddedServer.initialise();
      } catch (e) {
        // Already initialized
      }
      await embeddedServer.start();
      console.log(`[DB] Embedded PostgreSQL ready on port ${port}.`);
    }
  }

  pool = new pg.Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl:
      connectionString.includes('sslmode=require') || connectionString.includes('neon.tech')
        ? { rejectUnauthorized: false }
        : undefined,
  });

  return pool;
}

export async function getMigrationClient() {
  validateProductionDatabaseConfiguration();

  const migrationConnectionString = process.env.MIGRATION_DATABASE_URL;
  if (!migrationConnectionString) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MIGRATION_DATABASE_URL is required in production.');
    }
    return getClient();
  }

  if (!migrationPool) {
    migrationPool = new pg.Pool({
      connectionString: migrationConnectionString,
      max: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl:
        migrationConnectionString.includes('sslmode=require') || migrationConnectionString.includes('neon.tech')
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }

  return migrationPool.connect();
}

export async function query(text, params) {
  const p = await initDbPool();
  return p.query(text, params);
}

export async function assertProductionRuntimeRole() {
  if (process.env.NODE_ENV !== 'production') return;

  const result = await query(`
    SELECT
      role.rolsuper,
      role.rolcreaterole,
      role.rolcreatedb,
      pg_has_role(current_user, 'ledgerline_runtime', 'MEMBER') AS runtime_member,
      has_table_privilege(current_user, 'users', 'SELECT') AS users_select,
      has_table_privilege(current_user, 'users', 'INSERT') AS users_insert,
      has_table_privilege(current_user, 'users', 'UPDATE') AS users_update,
      has_table_privilege(current_user, 'users', 'DELETE') AS users_delete,
      has_table_privilege(current_user, 'accounts', 'SELECT') AS accounts_select,
      has_table_privilege(current_user, 'accounts', 'INSERT') AS accounts_insert,
      has_table_privilege(current_user, 'accounts', 'UPDATE') AS accounts_update,
      has_table_privilege(current_user, 'accounts', 'DELETE') AS accounts_delete,
      has_table_privilege(current_user, 'ledger', 'UPDATE') AS ledger_update,
      has_table_privilege(current_user, 'ledger', 'DELETE') AS ledger_delete,
      has_table_privilege(current_user, 'ledger', 'TRUNCATE') AS ledger_truncate,
      has_table_privilege(current_user, 'ledger', 'SELECT') AS ledger_select,
      has_table_privilege(current_user, 'ledger', 'INSERT') AS ledger_insert,
      has_table_privilege(current_user, 'idempotency_keys', 'SELECT') AS idempotency_select,
      has_table_privilege(current_user, 'idempotency_keys', 'INSERT') AS idempotency_insert,
      has_table_privilege(current_user, 'idempotency_keys', 'UPDATE') AS idempotency_table_update,
      has_table_privilege(current_user, 'idempotency_keys', 'DELETE') AS idempotency_delete,
      has_table_privilege(current_user, 'idempotency_replays', 'SELECT') AS replays_select,
      has_table_privilege(current_user, 'idempotency_replays', 'INSERT') AS replays_insert,
      has_table_privilege(current_user, 'idempotency_replays', 'UPDATE') AS replays_update,
      has_table_privilege(current_user, 'idempotency_replays', 'DELETE') AS replays_delete,
      has_column_privilege(current_user, 'accounts', 'balance_paise', 'UPDATE') AS balance_update,
      has_column_privilege(current_user, 'accounts', 'account_no', 'UPDATE') AS account_no_update,
      has_column_privilege(current_user, 'idempotency_keys', 'state', 'UPDATE') AS idempotency_update
    FROM pg_roles role
    WHERE role.rolname = current_user
  `);
  const permissions = result.rows[0];

  if (
    !permissions ||
    permissions.rolsuper ||
    permissions.rolcreaterole ||
    permissions.rolcreatedb ||
    !permissions.runtime_member ||
    !permissions.users_select ||
    permissions.users_insert ||
    permissions.users_update ||
    permissions.users_delete ||
    !permissions.accounts_select ||
    !permissions.accounts_insert ||
    permissions.accounts_update ||
    permissions.accounts_delete ||
    permissions.ledger_update ||
    permissions.ledger_delete ||
    permissions.ledger_truncate ||
    !permissions.ledger_select ||
    !permissions.ledger_insert ||
    !permissions.idempotency_select ||
    !permissions.idempotency_insert ||
    permissions.idempotency_table_update ||
    permissions.idempotency_delete ||
    !permissions.replays_select ||
    !permissions.replays_insert ||
    permissions.replays_update ||
    permissions.replays_delete ||
    !permissions.balance_update ||
    permissions.account_no_update ||
    !permissions.idempotency_update
  ) {
    throw new Error('Production DATABASE_URL role does not meet LedgerLine runtime least-privilege requirements.');
  }
}

/**
 * Ensures the restricted runtime role (ledgerline_runtime) exists with LOGIN and its password.
 * Executed as the schema owner role using MIGRATION_DATABASE_URL.
 * NOTE: Strictly role provisioning only (LOGIN and password). Does NOT touch tables or sequences,
 * allowing this to run before migrations on empty databases.
 */
export async function ensureRuntimeRole() {
  validateProductionDatabaseConfiguration();

  const runtimeUrl = new URL(process.env.DATABASE_URL);
  const runtimeUsername = decodeURIComponent(runtimeUrl.username);
  const runtimePassword = decodeURIComponent(runtimeUrl.password);

  if (!runtimeUsername || !runtimePassword) {
    throw new Error('DATABASE_URL must include both username and password for the runtime role.');
  }

  const migrationClient = await getMigrationClient();
  try {
    console.log(`[PROD-INIT] Ensuring restricted runtime role '${runtimeUsername}' exists (LOGIN & password only)...`);

    const escapedPassword = runtimePassword.replace(/'/g, "''");
    const escapedUsername = runtimeUsername.replace(/"/g, '""');

    // 1. Create or update the runtime role with LOGIN and specified password
    await migrationClient.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${escapedUsername}') THEN
          CREATE ROLE "${escapedUsername}" WITH LOGIN PASSWORD '${escapedPassword}';
        ELSE
          ALTER ROLE "${escapedUsername}" WITH LOGIN PASSWORD '${escapedPassword}';
        END IF;
      END
      $$;
    `);

    console.log(`[PROD-INIT] Restricted runtime role '${runtimeUsername}' provisioned.`);
  } finally {
    migrationClient.release();
  }
}

/**
 * Grants least-privilege permissions to the runtime role on schema objects.
 * MUST be executed AFTER schema migrations have created all tables, columns, and sequences.
 */
export async function grantRuntimePrivileges() {
  validateProductionDatabaseConfiguration();

  const runtimeUrl = new URL(process.env.DATABASE_URL);
  const runtimeUsername = decodeURIComponent(runtimeUrl.username);

  if (!runtimeUsername) {
    throw new Error('DATABASE_URL must include username for the runtime role.');
  }

  const migrationClient = await getMigrationClient();
  try {
    console.log(`[PROD-INIT] Granting least-privilege permissions to '${runtimeUsername}'...`);

    const escapedUsername = runtimeUsername.replace(/"/g, '""');

    // 1. Schema usage
    await migrationClient.query(`GRANT USAGE ON SCHEMA public TO "${escapedUsername}";`);

    // 2. Table & Column least-privilege permissions
    await migrationClient.query(`
      GRANT SELECT ON users TO "${escapedUsername}";
      GRANT SELECT, INSERT ON accounts TO "${escapedUsername}";
      GRANT UPDATE (balance_paise, status) ON accounts TO "${escapedUsername}";
      GRANT SELECT, INSERT ON ledger TO "${escapedUsername}";
      GRANT SELECT, INSERT ON idempotency_keys TO "${escapedUsername}";
      GRANT UPDATE (state, response_status, response_body, updated_at) ON idempotency_keys TO "${escapedUsername}";
      GRANT SELECT, INSERT ON idempotency_replays TO "${escapedUsername}";
      GRANT SELECT, INSERT ON transactions TO "${escapedUsername}";
      GRANT UPDATE (status, error_reason, updated_at) ON transactions TO "${escapedUsername}";
      GRANT SELECT, INSERT ON audit_logs TO "${escapedUsername}";
    `);

    // 3. Sequences: USAGE and SELECT on all sequences (for bigserial ledger ids, etc.)
    await migrationClient.query(`
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${escapedUsername}";
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO "${escapedUsername}";
    `);

    // 4. Ensure membership in ledgerline_runtime group if runtime role name differs
    await migrationClient.query(`
      DO $$
      BEGIN
        IF '${escapedUsername}' <> 'ledgerline_runtime' AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ledgerline_runtime') THEN
          GRANT ledgerline_runtime TO "${escapedUsername}";
        END IF;
      END
      $$;
    `);

    console.log(`[PROD-INIT] Least-privilege permissions granted to '${runtimeUsername}'.`);
  } finally {
    migrationClient.release();
  }
}

export async function getClient() {
  const p = await initDbPool();
  return p.connect();
}

/**
 * Execute a callback within an isolated ACID database transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK.
 */
export async function withTransaction(callback, existingClient = null) {
  const client = existingClient || (await getClient());
  const shouldRelease = !existingClient;
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      console.error('[DB] Rollback failed:', rbErr.message);
    }
    throw error;
  } finally {
    if (shouldRelease && client) {
      client.release();
    }
  }
}

export async function closeDb(stopServer = false) {
  if (pool) {
    await pool.end();
    pool = null;
  }
  if (migrationPool) {
    await migrationPool.end();
    migrationPool = null;
  }
  if (stopServer && embeddedServer) {
    try {
      await embeddedServer.stop();
    } catch (e) {
      // Ignore stop errors on exit
    }
    embeddedServer = null;
    if (process.env.NODE_ENV === 'test' && embeddedDatabaseDir) {
      fs.rmSync(embeddedDatabaseDir, { recursive: true, force: true });
    }
    embeddedDatabaseDir = null;
    testEmbeddedPassword = null;
    testEmbeddedPort = null;
  }
}
