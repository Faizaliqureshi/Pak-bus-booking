import { Redis } from "@upstash/redis";

const globalForUpstash = globalThis as unknown as {
  upstashRedis: Redis | undefined;
};

/**
 * Serverless Upstash Redis (REST). Prefer this on Vercel over ioredis TCP.
 *
 * Env:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */
export function getUpstashRedis(): Redis {
  if (!globalForUpstash.upstashRedis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error(
        "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN.",
      );
    }

    globalForUpstash.upstashRedis = new Redis({ url, token });
  }

  return globalForUpstash.upstashRedis;
}

export const SEAT_LOCK_TTL_SECONDS = 600;

export function bookingSeatLockKey(tripId: string, seatNumber: string): string {
  return `lock:trip:${tripId}:seat:${seatNumber}`;
}
