#!/usr/bin/env node

/**
 * BalanceVault — First-Admin Bootstrap CLI Script
 * Idempotently provisions or verifies the initial system administrator.
 *
 * Usage:
 *   node scripts/bootstrap-admin.js
 *   node scripts/bootstrap-admin.js --email=admin@myorg.com --password=SuperSecret123! --name="Lead Admin"
 *   npm run bootstrap:admin
 */

import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { getMigrationClient, getClient, closeDb } from '../src/db.js';

dotenv.config();

function parseArgs(args) {
  const parsed = {};
  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--allow-elevation') {
      parsed.allowElevation = true;
    } else if (arg.startsWith('--email=')) {
      parsed.email = arg.split('=')[1];
    } else if (arg.startsWith('--password=')) {
      parsed.password = arg.split('=')[1];
    } else if (arg.startsWith('--name=')) {
      parsed.name = arg.split('=')[1];
    }
  }
  return parsed;
}

export async function bootstrapAdmin(options = {}) {
  const allowElevation =
    options.allowElevation === true || process.env.ALLOW_ADMIN_ELEVATION === 'true';

  const email = (
    options.email ||
    process.env.FIRST_ADMIN_EMAIL ||
    'admin@balancevault.local'
  ).trim().toLowerCase();

  const password =
    options.password ||
    process.env.FIRST_ADMIN_PASSWORD ||
    'AdminPassword123!';

  const name = (
    options.name ||
    process.env.FIRST_ADMIN_NAME ||
    'System Administrator'
  ).trim();

  if (!email || !email.includes('@')) {
    throw new Error(`Invalid admin email address: ${email}`);
  }

  if (!password || password.length < 8) {
    throw new Error('Admin password must be at least 8 characters long.');
  }

  // Use migration client if available (schema owner), fallback to standard client
  let client;
  try {
    client = await getMigrationClient();
  } catch {
    client = await getClient();
  }

  try {
    // 1. Check if a user with this specific email already exists
    const existingUserRes = await client.query(
      'SELECT id, email, role, name, created_at FROM users WHERE email = $1',
      [email]
    );

    if (existingUserRes.rowCount > 0) {
      const existingUser = existingUserRes.rows[0];
      if (existingUser.role === 'admin') {
        console.log('----------------------------------------------------');
        console.log(' [BOOTSTRAP] Administrator Account Verified');
        console.log(` Status     : ALREADY_EXISTS (Idempotent)`);
        console.log(` User ID    : ${existingUser.id}`);
        console.log(` Email      : ${existingUser.email}`);
        console.log(` Name       : ${existingUser.name}`);
        console.log(` Role       : ${existingUser.role}`);
        console.log('----------------------------------------------------');
        return { status: 'ALREADY_EXISTS', user: existingUser };
      }

      // Existing user has an ordinary role (e.g. holder or auditor)
      if (!allowElevation) {
        throw new Error(
          `Security Exception: User '${email}' already exists with role '${existingUser.role}'. Automatic privilege escalation is prohibited. Pass --allow-elevation (or set ALLOW_ADMIN_ELEVATION=true) to explicitly authorize elevating this existing user.`
        );
      }

      // Explicitly authorized elevation
      const passwordHash = bcrypt.hashSync(password, 10);
      const updateRes = await client.query(
        'UPDATE users SET role = $1, password_hash = $2, name = $3 WHERE id = $4 RETURNING id, email, role, name, created_at',
        ['admin', passwordHash, name, existingUser.id]
      );
      const user = updateRes.rows[0];
      console.log('----------------------------------------------------');
      console.log(' [BOOTSTRAP SECURITY AUDIT] Existing User Elevated to Administrator (Explicit Authorization)');
      console.log(` User ID    : ${user.id}`);
      console.log(` Email      : ${user.email}`);
      console.log(` Name       : ${user.name}`);
      console.log(` Role       : ${user.role}`);
      console.log('----------------------------------------------------');
      return { status: 'ELEVATED', user };
    }

    // 2. User does not exist: create fresh administrator
    const passwordHash = bcrypt.hashSync(password, 10);
    const insertRes = await client.query(
      'INSERT INTO users (email, password_hash, role, name) VALUES ($1, $2, $3, $4) RETURNING id, email, role, name, created_at',
      [email, passwordHash, 'admin', name]
    );

    const user = insertRes.rows[0];
    console.log('----------------------------------------------------');
    console.log(' [BOOTSTRAP] First Administrator Created Successfully');
    console.log(` User ID    : ${user.id}`);
    console.log(` Email      : ${user.email}`);
    console.log(` Name       : ${user.name}`);
    console.log(` Role       : ${user.role}`);
    console.log('----------------------------------------------------');
    return { status: 'CREATED', user };
  } finally {
    client.release();
  }
}

// Direct execution guard
const isDirectExecution = process.argv[1] && process.argv[1].endsWith('bootstrap-admin.js');
if (isDirectExecution) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`
BalanceVault First-Admin Bootstrap CLI

Options:
  --email=<email>       Admin email (default: admin@balancevault.local or FIRST_ADMIN_EMAIL)
  --password=<pass>     Admin password (min 8 chars, default: AdminPassword123! or FIRST_ADMIN_PASSWORD)
  --name=<name>         Admin display name (default: "System Administrator" or FIRST_ADMIN_NAME)
  --allow-elevation     Explicitly authorize elevating an existing user to admin
  -h, --help            Show this help message
`);
    process.exit(0);
  }

  bootstrapAdmin(args)
    .then(async () => {
      await closeDb();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(`[BOOTSTRAP ERROR] ${err.message}`);
      await closeDb();
      process.exit(1);
    });
}
