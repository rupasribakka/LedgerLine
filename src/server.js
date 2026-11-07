import dotenv from 'dotenv';
import { runMigrations } from './migrate.js';
import { isDemoSeedingEnabled, seedDatabase } from './seed.js';
import { getJwtSecret, validateProductionDatabaseConfiguration } from './config.js';
import { assertProductionRuntimeRole } from './db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    validateProductionDatabaseConfiguration();
    getJwtSecret();
    await runMigrations();
    await assertProductionRuntimeRole();
    if (isDemoSeedingEnabled()) {
      await seedDatabase();
    }

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
