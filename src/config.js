const JWT_PLACEHOLDER_PATTERN = /^(change[-_ ]?me|replace[-_ ]?me|your[-_ ]|example|test|development|secret|password)/i;

export function getJwtSecret({
  secret = process.env.JWT_SECRET,
  nodeEnv = process.env.NODE_ENV,
} = {}) {
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new Error('JWT_SECRET must be configured before starting LedgerLine.');
  }

  if (
    nodeEnv === 'production' &&
    (Buffer.byteLength(secret, 'utf8') < 32 || JWT_PLACEHOLDER_PATTERN.test(secret))
  ) {
    throw new Error('Production JWT_SECRET must be a non-placeholder value of at least 32 bytes.');
  }

  return secret;
}

export function validateProductionDatabaseConfiguration(env = process.env) {
  if (env.NODE_ENV !== 'production') return;

  if (!env.DATABASE_URL || !env.MIGRATION_DATABASE_URL) {
    throw new Error('Production requires both DATABASE_URL and MIGRATION_DATABASE_URL.');
  }

  let runtimeUrl;
  let migrationUrl;
  try {
    runtimeUrl = new URL(env.DATABASE_URL);
    migrationUrl = new URL(env.MIGRATION_DATABASE_URL);
  } catch {
    throw new Error('Production database URLs must be valid PostgreSQL connection URLs.');
  }

  if (
    !['postgres:', 'postgresql:'].includes(runtimeUrl.protocol) ||
    !['postgres:', 'postgresql:'].includes(migrationUrl.protocol)
  ) {
    throw new Error('Production database URLs must use the PostgreSQL protocol.');
  }

  if (
    !runtimeUrl.username ||
    !migrationUrl.username ||
    runtimeUrl.username === migrationUrl.username
  ) {
    throw new Error('Production database URLs must use distinct runtime and migration roles.');
  }
}
