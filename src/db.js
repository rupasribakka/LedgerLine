import pg from 'pg';
import dotenv from 'dotenv';
import EmbeddedPostgres from 'embedded-postgres';

dotenv.config();

// Ensure BIGINT (Postgres type 20) is parsed as BigInt or handled safely
pg.types.setTypeParser(20, (val) => (val === null ? null : BigInt(val)));

// Enable clean JSON serialization for BigInt values
BigInt.prototype.toJSON = function () {
  return Number(this);
};

let embeddedServer = null;
let pool = null;

export async function initDbPool() {
  if (pool) return pool;

  let connectionString = process.env.DATABASE_URL;

  // If no external DATABASE_URL provided, check if local postgres on 5433 is running or boot embedded
  if (!connectionString) {
    connectionString = 'postgresql://postgres:password@localhost:5433/postgres';

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
      embeddedServer = new EmbeddedPostgres({
        port: 5433,
        databaseDir: './.pgdata',
        user: 'postgres',
        password: 'password',
        persistent: true,
      });

      try {
        await embeddedServer.initialise();
      } catch (e) {
        // Already initialized
      }
      await embeddedServer.start();
      console.log('[DB] Embedded PostgreSQL ready on port 5433.');
    }
  }

  pool = new pg.Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  return pool;
}

export async function query(text, params) {
  const p = await initDbPool();
  return p.query(text, params);
}

export async function getClient() {
  const p = await initDbPool();
  return p.connect();
}

/**
 * Execute a callback within an isolated ACID database transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK.
 */
export async function withTransaction(callback) {
  const client = await getClient();
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
    client.release();
  }
}

export async function closeDb(stopServer = false) {
  if (pool) {
    await pool.end();
    pool = null;
  }
  if (stopServer && embeddedServer) {
    try {
      await embeddedServer.stop();
    } catch (e) {
      // Ignore stop errors on exit
    }
    embeddedServer = null;
  }
}
