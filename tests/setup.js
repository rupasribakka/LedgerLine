import crypto from 'node:crypto';

process.env.LEDGERLINE_SEED_DEMO_USERS = 'true';
process.env.JWT_SECRET ||= crypto.randomBytes(48).toString('base64url');
