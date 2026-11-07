#!/usr/bin/env node
/**
 * Production startup entrypoint for Render and Neon PostgreSQL.
 *
 * Requirements satisfied:
 * 1. Runs migrations as MIGRATION_DATABASE_URL (owner role).
 * 2. Makes sure the restricted runtime role (ledgerline_runtime) exists with its own password.
 * 3. Starts the app connected as the restricted role via DATABASE_URL.
 * 4. Strictly prohibits fallback to embedded Postgres in production.
 * 5. Idempotently seeds demo users (1 admin, 2 holders, 1 auditor) and ledger funds when LEDGERLINE_SEED_DEMO_USERS=true.
 */

process.env.NODE_ENV = 'production';

import('../src/server.js');
