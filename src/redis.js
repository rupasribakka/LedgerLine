import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient = null;
let isConnected = false;
let connectionAttempted = false;

/**
 * Initializes and returns a singleton Redis client.
 * Returns null if REDIS_URL / REDIS_HOST is not configured.
 */
export function getRedisClient() {
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;

  if (!redisUrl && !redisHost) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  connectionAttempted = true;

  try {
    const options = {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      enableOfflineQueue: false,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) {
          // Cease retrying to avoid spamming logs when Redis is down
          return null;
        }
        return Math.min(times * 500, 2000);
      },
    };

    redisClient = redisUrl ? new Redis(redisUrl, options) : new Redis({ host: redisHost, port: process.env.REDIS_PORT || 6379, ...options });

    redisClient.on('connect', () => {
      isConnected = true;
    });

    redisClient.on('ready', () => {
      isConnected = true;
    });

    redisClient.on('error', (err) => {
      isConnected = false;
      // In production or test, log cleanly without terminating the process
      if (process.env.NODE_ENV !== 'test') {
        console.warn(`[REDIS] Connection error: ${err.message}. Rate limiter will use in-memory fallback.`);
      }
    });

    redisClient.on('close', () => {
      isConnected = false;
    });

    // Attempt connecting asynchronously without blocking startup
    redisClient.connect().catch((err) => {
      isConnected = false;
      if (process.env.NODE_ENV !== 'test') {
        console.warn(`[REDIS] Initial connection failed: ${err.message}. Using in-memory fallback.`);
      }
    });

    return redisClient;
  } catch (err) {
    isConnected = false;
    redisClient = null;
    return null;
  }
}

/**
 * Check Redis connectivity and latency for deployment health probes.
 */
export async function checkRedisHealth() {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST;

  if (!redisUrl) {
    return {
      status: 'fallback_in_memory',
      configured: false,
      message: 'REDIS_URL not configured; active in-memory sliding window fallback.',
    };
  }

  const client = getRedisClient();
  if (!client || !isConnected) {
    return {
      status: 'fallback_in_memory',
      configured: true,
      message: 'Redis configured but currently offline; active in-memory sliding window fallback.',
    };
  }

  try {
    const start = Date.now();
    await client.ping();
    const latencyMs = Date.now() - start;
    return {
      status: 'connected',
      configured: true,
      latencyMs,
      message: 'Redis rate limiting active.',
    };
  } catch (err) {
    return {
      status: 'fallback_in_memory',
      configured: true,
      error: err.message,
      message: 'Redis ping failed; active in-memory sliding window fallback.',
    };
  }
}

/**
 * Cleanly closes the Redis connection (for graceful shutdown and test runners).
 */
export async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      redisClient.disconnect();
    }
    redisClient = null;
    isConnected = false;
    connectionAttempted = false;
  }
}
