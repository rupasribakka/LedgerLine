import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

let prismaInstance = null;

/**
 * Returns a singleton instance of the PrismaClient.
 * Lazily instantiated so unit tests that spin up embedded postgres on dynamic ports
 * can initialize or re-initialize seamlessly.
 */
export function getPrismaClient() {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return prismaInstance;
}

/**
 * Reinitializes the Prisma Client with a dynamic database URL.
 * Essential for testing when embedded PostgreSQL chooses an ephemeral port.
 */
export function setPrismaDatasourceUrl(url) {
  if (prismaInstance) {
    prismaInstance.$disconnect().catch(() => {});
  }
  process.env.DATABASE_URL = url;
  prismaInstance = new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
    log: ['error'],
  });
  return prismaInstance;
}

export const prisma = new Proxy({}, {
  get(target, prop) {
    const client = getPrismaClient();
    return client[prop];
  },
});

export default prisma;
