#!/usr/bin/env node
/**
 * Production startup entrypoint for Render and Neon PostgreSQL.
 *
 * Boot sequence:
 * 1. Create or update the ledgerline_runtime role (LOGIN and password only) first.
 * 2. Run all migrations as MIGRATION_DATABASE_URL (owner role).
 * 3. Only after migrations, grant the least-privilege permissions (tables & sequences).
 * 4. Idempotently seed demo users and ledger funds when LEDGERLINE_SEED_DEMO_USERS=true.
 * 5. Start the app as the runtime role and verify least-privilege invariants.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { runMigrations } from '../src/migrate.js';
import { isDemoSeedingEnabled, seedDatabase } from '../src/seed.js';
import { getJwtSecret, validateProductionDatabaseConfiguration } from '../src/config.js';
import {
  ensureRuntimeRole,
  grantRuntimePrivileges,
  assertProductionRuntimeRole,
  getMigrationClient,
  formatFatalBootError,
} from '../src/db.js';

dotenv.config();

export async function bootProductionServer({ port = process.env.PORT || 5000 } = {}) {
  process.env.NODE_ENV = 'production';
  try {
    validateProductionDatabaseConfiguration();
    getJwtSecret();

    // 1. Create or update the ledgerline_runtime role (LOGIN and password only) first
    await ensureRuntimeRole();

    // 2. Run all migrations as MIGRATION_DATABASE_URL
    await runMigrations();

    // 3. Only after migrations, grant least-privilege permissions (tables & sequences)
    await grantRuntimePrivileges();

    // 4. Then run demo seeding if LEDGERLINE_SEED_DEMO_USERS=true
    if (process.env.LEDGERLINE_SEED_DEMO_USERS === 'true') {
      const migrationClient = await getMigrationClient();
      try {
        await seedDatabase({ dbClient: migrationClient, force: true });
      } finally {
        migrationClient.release();
      }
    } else if (isDemoSeedingEnabled()) {
      await seedDatabase();
    }

    // Connect as restricted runtime role and verify least-privilege invariants
    await assertProductionRuntimeRole();

    // Start app connected as runtime role
    const { default: app } = await import('../src/app.js');
    return new Promise((resolve, reject) => {
      const server = app.listen(port, () => {
        console.log(`=======================================================`);
        console.log(` LedgerLine Financial Core Service                     `);
        console.log(` Listening on port: ${port}                            `);
        console.log(` Health probe: http://localhost:${port}/api/health    `);
        console.log(` Environment:  ${process.env.NODE_ENV || 'production'}`);
        console.log(`=======================================================`);
        resolve({ app, server });
      });
      server.on('error', reject);
    });
  } catch (error) {
    console.error('Fatal boot error:', formatFatalBootError(error));
    throw error;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  bootProductionServer().catch(() => {
    process.exit(1);
  });
}
