import dotenv from 'dotenv';
import { runMigrations } from './migrate.js';
import { isDemoSeedingEnabled, seedDatabase } from './seed.js';
import { getJwtSecret, validateProductionDatabaseConfiguration } from './config.js';
import {
  assertProductionRuntimeRole,
  ensureRuntimeRole,
  grantRuntimePrivileges,
  getMigrationClient,
  formatFatalBootError,
  logConnectionTargets,
} from './db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

export async function bootstrap({ port = PORT } = {}) {
  try {
    validateProductionDatabaseConfiguration();
    getJwtSecret();

    if (process.env.NODE_ENV === 'production') {
      logConnectionTargets();
    }

    // 1. Create or update the ledgerline_runtime role (LOGIN and password only) first
    if (process.env.NODE_ENV === 'production') {
      await ensureRuntimeRole();
    }

    // 2. Run all migrations as MIGRATION_DATABASE_URL
    await runMigrations();

    // 3. Only after migrations, grant least-privilege permissions (tables & sequences)
    if (process.env.NODE_ENV === 'production') {
      await grantRuntimePrivileges();
    }

    // 4. Seed demo users and double-entry ledger transactions if explicitly enabled
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

    const { default: app } = await import('./app.js');
    return new Promise((resolve, reject) => {
      const server = app.listen(port, () => {
        console.log(`=======================================================`);
        console.log(` BalanceVault (formerly LedgerLine) Financial Engine   `);
        console.log(` Listening on port: ${port}                            `);
        console.log(` Health probe: http://localhost:${port}/api/health    `);
        console.log(` Environment:  ${process.env.NODE_ENV || 'development'}`);
        console.log(`=======================================================`);
        resolve({ app, server });
      });
      server.on('error', reject);
    });
  } catch (error) {
    console.error('Fatal boot error:', formatFatalBootError(error));
    process.exit(1);
  }
}

if (!process.env.VITEST) {
  bootstrap();
}
