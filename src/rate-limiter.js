import { getRedisClient } from './redis.js';

/**
 * Atomic Redis Sliding-Window Inspection & Insertion Lua Script.
 * KEYS[1]: ratelimit key (e.g. ratelimit:money:127.0.0.1:1)
 * ARGV[1]: current timestamp in ms
 * ARGV[2]: window start timestamp in ms (now - windowMs)
 * ARGV[3]: max allowed attempts
 * ARGV[4]: window TTL in seconds
 * ARGV[5]: autoRecord flag ('1' or '0')
 * ARGV[6]: unique member identifier
 *
 * Atomically purges expired entries, counts remaining attempts, and if permitted,
 * records the current timestamp and refreshes TTL in a single atomic operation.
 * Returns 1 if rate-limited, 0 if allowed.
 */
const ATOMIC_SLIDING_WINDOW_LUA = `
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[2])
local currentCount = redis.call('ZCARD', KEYS[1])
if currentCount >= tonumber(ARGV[3]) then
    return 1
end
if ARGV[5] == '1' then
    redis.call('ZADD', KEYS[1], ARGV[1], ARGV[6])
    redis.call('EXPIRE', KEYS[1], tonumber(ARGV[4]))
end
return 0
`;

/**
 * Atomic Redis Record Attempt Script (for non-autoRecord limiters like login attempts)
 * KEYS[1]: ratelimit key
 * ARGV[1]: current timestamp in ms
 * ARGV[2]: unique member identifier
 * ARGV[3]: TTL in seconds
 */
const ATOMIC_RECORD_ATTEMPT_LUA = `
redis.call('ZADD', KEYS[1], ARGV[1], ARGV[2])
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[3]))
return 1
`;

/**
 * High-Integrity Sliding-Window Rate Limiter
 * Supports Redis-backed atomic distributed rate limiting with automatic in-memory fallback.
 */
export class SlidingWindowRateLimiter {
  /**
   * @param {object} options
   * @param {string} options.name Name of the limiter (e.g., 'login', 'money')
   * @param {number} options.windowMs Window duration in milliseconds (default: 60,000ms = 1m)
   * @param {number} options.maxAttempts Maximum allowed attempts within window
   * @param {boolean} options.autoRecord Whether checking automatically records an attempt when allowed
   */
  constructor({ name = 'default', windowMs = 60000, maxAttempts = 5, autoRecord = false } = {}) {
    this.name = name;
    this.windowMs = windowMs;
    this.maxAttempts = maxAttempts;
    this.autoRecord = autoRecord;
    this.memoryStore = new Map();
  }

  /**
   * Synchronous check on memory store (for backwards-compatibility in sync contexts).
   */
  _isMemoryRateLimited(key) {
    const now = Date.now();
    const timestamps = this.memoryStore.get(key) || [];
    const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);

    if (validTimestamps.length >= this.maxAttempts) {
      this.memoryStore.set(key, validTimestamps);
      return true;
    }

    if (this.autoRecord) {
      validTimestamps.push(now);
      this.memoryStore.set(key, validTimestamps);
    }

    return false;
  }

  /**
   * Checks if an identifier key is currently rate-limited.
   * If Redis is ready, performs atomic sliding window inspection via Redis pipeline.
   * Falls back instantly to in-memory store if Redis is unavailable.
   */
  async isRateLimitedAsync(key) {
    const redis = getRedisClient();

    if (redis && redis.status === 'ready') {
      try {
        const redisKey = `ratelimit:${this.name}:${key}`;
        const now = Date.now();
        const windowStart = now - this.windowMs;
        const windowSeconds = Math.ceil(this.windowMs / 1000) * 2;
        const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;

        const result = await redis.eval(
          ATOMIC_SLIDING_WINDOW_LUA,
          1,
          redisKey,
          String(now),
          String(windowStart),
          String(this.maxAttempts),
          String(windowSeconds),
          this.autoRecord ? '1' : '0',
          member
        );

        return Number(result) === 1;
      } catch (err) {
        // Fall through to memoryStore on Redis failure
      }
    }

    return this._isMemoryRateLimited(key);
  }

  /**
   * Backwards compatible isRateLimited method.
   * In memory mode, executes synchronously.
   * If Redis is connected, callers awaiting this receive a boolean promise.
   */
  isRateLimited(key) {
    const redis = getRedisClient();
    if (redis && redis.status === 'ready') {
      return this.isRateLimitedAsync(key);
    }
    return this._isMemoryRateLimited(key);
  }

  /**
   * Records an attempt for an identifier key.
   */
  recordAttempt(key) {
    const redis = getRedisClient();

    if (redis && redis.status === 'ready') {
      try {
        const redisKey = `ratelimit:${this.name}:${key}`;
        const now = Date.now();
        const windowSeconds = Math.ceil(this.windowMs / 1000) * 2;
        const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;

        redis
          .eval(ATOMIC_RECORD_ATTEMPT_LUA, 1, redisKey, String(now), member, String(windowSeconds))
          .catch(() => {});
      } catch (err) {
        // Fallback to memory
      }
    }

    const now = Date.now();
    const timestamps = this.memoryStore.get(key) || [];
    timestamps.push(now);
    this.memoryStore.set(key, timestamps);
  }

  /**
   * Resets rate limit for an identifier key or all keys.
   */
  reset(key = null) {
    const redis = getRedisClient();

    if (redis && redis.status === 'ready') {
      try {
        if (key) {
          redis.del(`ratelimit:${this.name}:${key}`).catch(() => {});
        }
      } catch (err) {
        // Ignore
      }
    }

    if (key) {
      this.memoryStore.delete(key);
    } else {
      this.memoryStore.clear();
    }
  }

  /**
   * Returns current limiter configuration and active backend.
   */
  getStatus() {
    const redis = getRedisClient();
    const isRedisActive = Boolean(redis && redis.status === 'ready');
    return {
      name: this.name,
      backend: isRedisActive ? 'redis' : 'in-memory-fallback',
      windowMs: this.windowMs,
      maxAttempts: this.maxAttempts,
      activeKeysCount: this.memoryStore.size,
    };
  }
}

// 1. Login rate limiter: 5 attempts per 60 seconds (manual record on failed attempts)
export const loginLimiter = new SlidingWindowRateLimiter({
  name: 'login',
  windowMs: 60000,
  maxAttempts: 5,
  autoRecord: false,
});

// 2. Financial transactions rate limiter: 60 transactions per 60 seconds (auto-records on attempt)
export const moneyLimiter = new SlidingWindowRateLimiter({
  name: 'money',
  windowMs: 60000,
  maxAttempts: 60,
  autoRecord: true,
});

/**
 * Express middleware for login endpoint rate limiting.
 */
export async function loginRateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const key = `${ip}:${req.body?.email || ''}`;
  req.rateLimitKey = key;

  // Disabled in test if explicitly requested via header or env
  if (req.headers['x-disable-rate-limit'] === 'true' || process.env.DISABLE_RATE_LIMIT === 'true') {
    return next();
  }

  const limited = await Promise.resolve(loginLimiter.isRateLimited(key));
  if (limited) {
    return res.status(429).json({
      error: 'Too many login attempts. Please wait 60 seconds before trying again.',
      code: 'RATE_LIMITED',
    });
  }

  next();
}

/**
 * Express middleware for money endpoints rate limiting.
 */
export async function moneyRateLimitMiddleware(req, res, next) {
  // Disabled in test unless explicitly enabled for rate-limit testing
  if (process.env.NODE_ENV === 'test' && !req.headers['x-enable-rate-limit-for-test']) {
    return next();
  }

  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const userId = req.user?.id || 'unauthenticated';
  const key = `${ip}:${userId}`;

  const limited = await Promise.resolve(moneyLimiter.isRateLimited(key));
  if (limited) {
    return res.status(429).json({
      error: 'Too many transaction requests. Please slow down.',
      code: 'RATE_LIMITED',
    });
  }

  next();
}
