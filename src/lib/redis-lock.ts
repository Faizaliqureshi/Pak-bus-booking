import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";

/** Default seat hold: 10 minutes */
export const DEFAULT_SEAT_LOCK_TTL_SECONDS = 600;

export interface LockSeatSuccess {
  success: true;
  tripId: string;
  seatNumber: string;
  userId: string;
  lockToken: string;
  expiresAt: Date;
  ttlSeconds: number;
  extended: boolean;
}

export interface LockSeatFailure {
  success: false;
  message: string;
}

export type LockSeatResult = LockSeatSuccess | LockSeatFailure;

export interface UnlockSeatResult {
  success: boolean;
  message: string;
}

export interface ActiveSeatLock {
  seatNumber: string;
  userId: string;
}

export function buildSeatLockKey(tripId: string, seatNumber: string): string {
  return `seat_lock:${tripId}:${seatNumber}`;
}

function expiresFromNow(ttlSeconds: number): Date {
  return new Date(Date.now() + ttlSeconds * 1000);
}

/**
 * Acquire (or refresh) a temporary Redis seat lock and mirror it in Prisma.
 * Redis: SET seat_lock:{tripId}:{seatNumber} {userId} EX ttl NX
 */
export async function lockSeat(
  tripId: string,
  seatNumber: string,
  userId: string,
  ttlSeconds: number = DEFAULT_SEAT_LOCK_TTL_SECONDS,
): Promise<LockSeatResult> {
  if (!tripId?.trim() || !seatNumber?.trim() || !userId?.trim()) {
    return {
      success: false,
      message: "tripId, seatNumber, and userId are required.",
    };
  }

  const redis = getRedis();
  const key = buildSeatLockKey(tripId, seatNumber);

  const setResult = await redis.set(key, userId, "EX", ttlSeconds, "NX");

  if (setResult === null) {
    const holder = await redis.get(key);

    if (holder && holder !== userId) {
      return {
        success: false,
        message: "Seat held by another passenger.",
      };
    }

    // Same user already holds the lock — extend TTL
    if (holder === userId) {
      await redis.expire(key, ttlSeconds);
      const expiresAt = expiresFromNow(ttlSeconds);

      const existing = await prisma.seatLock.findUnique({
        where: { tripId_seatNumber: { tripId, seatNumber } },
      });

      const lockToken = existing?.lockToken ?? randomUUID();

      const seatLock = await prisma.seatLock.upsert({
        where: { tripId_seatNumber: { tripId, seatNumber } },
        create: {
          tripId,
          seatNumber,
          userId,
          lockToken,
          expiresAt,
        },
        update: {
          userId,
          expiresAt,
        },
      });

      return {
        success: true,
        tripId,
        seatNumber,
        userId,
        lockToken: seatLock.lockToken,
        expiresAt: seatLock.expiresAt,
        ttlSeconds,
        extended: true,
      };
    }

    // Key vanished between SET NX and GET — retry once
    const retry = await redis.set(key, userId, "EX", ttlSeconds, "NX");
    if (retry === null) {
      return {
        success: false,
        message: "Seat held by another passenger.",
      };
    }
  }

  const lockToken = randomUUID();
  const expiresAt = expiresFromNow(ttlSeconds);

  try {
    const seatLock = await prisma.seatLock.upsert({
      where: { tripId_seatNumber: { tripId, seatNumber } },
      create: {
        tripId,
        seatNumber,
        userId,
        lockToken,
        expiresAt,
      },
      update: {
        userId,
        lockToken,
        expiresAt,
      },
    });

    return {
      success: true,
      tripId,
      seatNumber,
      userId,
      lockToken: seatLock.lockToken,
      expiresAt: seatLock.expiresAt,
      ttlSeconds,
      extended: false,
    };
  } catch (error) {
    // Compensate Redis if Prisma sync fails after a fresh acquire
    const holder = await redis.get(key);
    if (holder === userId) {
      await redis.del(key);
    }
    throw error;
  }
}

/**
 * Release a seat lock when owned by `userId` (Redis + Prisma).
 */
export async function unlockSeat(
  tripId: string,
  seatNumber: string,
  userId: string,
): Promise<UnlockSeatResult> {
  if (!tripId?.trim() || !seatNumber?.trim() || !userId?.trim()) {
    return {
      success: false,
      message: "tripId, seatNumber, and userId are required.",
    };
  }

  const redis = getRedis();
  const key = buildSeatLockKey(tripId, seatNumber);
  const holder = await redis.get(key);

  if (holder && holder !== userId) {
    return {
      success: false,
      message: "Seat held by another passenger.",
    };
  }

  if (holder === userId) {
    await redis.del(key);
  }

  const existing = await prisma.seatLock.findUnique({
    where: { tripId_seatNumber: { tripId, seatNumber } },
  });

  if (existing) {
    if (existing.userId !== userId) {
      return {
        success: false,
        message: "Seat held by another passenger.",
      };
    }
    await prisma.seatLock.delete({ where: { id: existing.id } });
  } else if (!holder) {
    return {
      success: false,
      message: "No active lock found for this seat.",
    };
  }

  return {
    success: true,
    message: "Seat unlocked successfully.",
  };
}

/**
 * List active Redis locks for a trip (`seat_lock:{tripId}:*`).
 */
export async function getActiveLocksForTrip(
  tripId: string,
): Promise<ActiveSeatLock[]> {
  if (!tripId?.trim()) return [];

  const redis = getRedis();
  const pattern = `seat_lock:${tripId}:*`;
  const locks: ActiveSeatLock[] = [];

  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100,
    );
    cursor = nextCursor;

    if (keys.length === 0) continue;

    const values = await redis.mget(...keys);
    for (let i = 0; i < keys.length; i++) {
      const userId = values[i];
      if (!userId) continue;

      const seatNumber = keys[i].slice(`seat_lock:${tripId}:`.length);
      if (!seatNumber) continue;

      locks.push({ seatNumber, userId });
    }
  } while (cursor !== "0");

  return locks;
}
