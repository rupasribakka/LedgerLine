import dotenv from 'dotenv';
import { runMigrations } from './migrate.js';
import { isDemoSeedingEnabled, seedDatabase } from './seed.js';
import { getJwtSecret, validateProductionDatabaseConfiguration } from './config.js';
import { assertProductionRuntimeRole, ensureRuntimeRole, getMigrationClient } from './db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    validateProductionDatabaseConfiguration();
    getJwtSecret();

    // In production, ensure the restricted runtime role exists with its password
    if (process.env.NODE_ENV === 'production') {
      await ensureRuntimeRole();
    }

    // Run schema migrations as owner (MIGRATION_DATABASE_URL)
    await runMigrations();

    // Seed demo users and double-entry ledger transactions if explicitly enabled
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
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` LedgerLine Financial Core Service                     `);
      console.log(` Listening on port: ${PORT}                            `);
      console.log(` Health probe: http://localhost:${PORT}/api/health    `);
      console.log(` Environment:  ${process.env.NODE_ENV || 'development'}`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('Fatal boot error:', error.code || error.message);
    process.exit(1);
  }
}

bootstrap();
