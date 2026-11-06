import dotenv from 'dotenv';
import app from './app.js';
import { runMigrations } from './migrate.js';
import { seedDatabase } from './seed.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    // Automatically apply migrations and seed on boot
    await runMigrations();
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` LedgerLine Financial Core Service                     `);
      console.log(` Listening on port: ${PORT}                            `);
      console.log(` Health probe: http://localhost:${PORT}/api/health    `);
      console.log(` Environment:  ${process.env.NODE_ENV || 'development'}`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('Fatal boot error:', error);
    process.exit(1);
  }
}

bootstrap();
