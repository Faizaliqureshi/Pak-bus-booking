import Redis from "ioredis";

/**
 * Minimal in-memory Redis for local/E2E when `REDIS_URL=memory://`.
 * Implements only the commands used by seat locks.
 */
class MemoryRedis {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  private purgeIfExpired(key: string): void {
    const entry = this.store.get(key);
    if (!entry) return;
    if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
    }
  }

  private read(key: string): string | null {
    this.purgeIfExpired(key);
    return this.store.get(key)?.value ?? null;
  }

  async set(
    key: string,
    value: string,
    exToken?: "EX",
    ttlSeconds?: number,
    nxToken?: "NX",
  ): Promise<"OK" | null> {
    this.purgeIfExpired(key);
    if (nxToken === "NX" && this.store.has(key)) {
      return null;
    }
    const expiresAt =
      exToken === "EX" && typeof ttlSeconds === "number"
        ? Date.now() + ttlSeconds * 1000
        : undefined;
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async get(key: string): Promise<string | null> {
    return this.read(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    this.purgeIfExpired(key);
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + ttlSeconds * 1000;
    return 1;
  }

  async ttl(key: string): Promise<number> {
    this.purgeIfExpired(key);
    const entry = this.store.get(key);
    if (!entry) return -2;
    if (entry.expiresAt === undefined) return -1;
    return Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000));
  }

  async del(...keys: string[]): Promise<number> {
    let n = 0;
    for (const key of keys) {
      if (this.store.delete(key)) n += 1;
    }
    return n;
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    return keys.map((key) => this.read(key));
  }

  async scan(
    cursor: string,
    _matchToken: "MATCH",
    pattern: string,
    _countToken: "COUNT",
    _count: number,
  ): Promise<[string, string[]]> {
    // Single-pass scan for the small keyspace we use in tests.
    if (cursor !== "0") return ["0", []];
    const regex = new RegExp(
      `^${pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`,
    );
    const keys: string[] = [];
    for (const key of this.store.keys()) {
      this.purgeIfExpired(key);
      if (this.store.has(key) && regex.test(key)) keys.push(key);
    }
    return ["0", keys];
  }
}

type RedisLike = Redis | MemoryRedis;

const globalForRedis = globalThis as unknown as {
  redis: RedisLike | undefined;
};

function useMemoryRedis(): boolean {
  const url = process.env.REDIS_URL ?? "";
  return (
    !url ||
    url === "memory://" ||
    url === "memory" ||
    process.env.REDIS_MEMORY === "1"
  );
}

/**
 * Singleton Redis client.
 * Use `REDIS_URL=memory://` (or `REDIS_MEMORY=1`) for local/E2E without Upstash.
 * Missing REDIS_URL also uses memory so seat locks still work on `next dev`.
 */
export function getRedis(): RedisLike {
  if (!globalForRedis.redis) {
    if (useMemoryRedis()) {
      globalForRedis.redis = new MemoryRedis();
    } else {
      const url = process.env.REDIS_URL || "redis://localhost:6379";
      const client = new Redis(url, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        enableOfflineQueue: false,
        lazyConnect: true,
        connectTimeout: 1000,
      });
      // Unhandled "error" crashes the Vercel isolate → browser "Failed to fetch".
      client.on("error", () => {});
      globalForRedis.redis = client;
    }
  }
  return globalForRedis.redis;
}
