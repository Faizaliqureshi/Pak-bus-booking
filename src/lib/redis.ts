import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

/**
 * Singleton Redis client.
 * Connects to `REDIS_URL`, falling back to local Redis.
 */
export function getRedis(): Redis {
  if (!globalForRedis.redis) {
    const url = process.env.REDIS_URL || "redis://localhost:6379";
    globalForRedis.redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });
  }
  return globalForRedis.redis;
}
