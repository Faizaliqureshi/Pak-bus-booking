import { randomUUID } from "crypto";
import { TripSeatStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { claimSeatLock } from "@/lib/trip-inventory";

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

/**
 * Acquire (or refresh) a seat lock. Neon is the source of truth so this
 * still works when Redis/Upstash is unreachable.
 */
export async function lockSeat(
  tripId: string,
  seatNumber: string,
  userId: string,
  ttlSeconds: number = DEFAULT_SEAT_LOCK_TTL_SECONDS,
): Promise<LockSeatResult> {
  const claimed = await claimSeatLock(tripId, seatNumber, userId, ttlSeconds);
  if (!claimed.success) {
    return { success: false, message: claimed.message };
  }

  const key = buildSeatLockKey(tripId, seatNumber);
  try {
    await Promise.race([
      getRedis().set(key, userId, "EX", ttlSeconds),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("redis lock timeout")), 800),
      ),
    ]);
  } catch {
    // Neon already holds the seat; Redis is best-effort cache.
  }

  const lockToken = randomUUID();
  const seatLock = await prisma.seatLock.upsert({
    where: { tripId_seatNumber: { tripId, seatNumber } },
    create: {
      tripId,
      seatNumber,
      userId,
      lockToken,
      expiresAt: claimed.expiresAt,
    },
    update: {
      userId,
      lockToken,
      expiresAt: claimed.expiresAt,
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
    extended: claimed.extended,
  };
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

  const inventory = await prisma.tripSeat.findUnique({
    where: { tripId_seatNumber: { tripId, seatNumber } },
    select: { status: true, lockedByUserId: true },
  });
  if (
    inventory?.status === TripSeatStatus.LOCKED &&
    inventory.lockedByUserId &&
    inventory.lockedByUserId !== userId
  ) {
    return {
      success: false,
      message: "Seat held by another passenger.",
    };
  }

  const existing = await prisma.seatLock.findUnique({
    where: { tripId_seatNumber: { tripId, seatNumber } },
  });
  if (existing && existing.userId !== userId) {
    return {
      success: false,
      message: "Seat held by another passenger.",
    };
  }

  await prisma.tripSeat.updateMany({
    where: {
      tripId,
      seatNumber,
      status: TripSeatStatus.LOCKED,
      lockedByUserId: userId,
    },
    data: {
      status: TripSeatStatus.AVAILABLE,
      lockedByUserId: null,
      lockedUntil: null,
    },
  });
  if (existing) {
    await prisma.seatLock.delete({ where: { id: existing.id } });
  }

  const key = buildSeatLockKey(tripId, seatNumber);
  void Promise.race([
    getRedis().del(key),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("redis unlock timeout")), 800),
    ),
  ]).catch(() => null);

  return {
    success: true,
    message: "Seat unlocked successfully.",
  };
}

/**
 * List active Redis locks for a trip (`seat_lock:{tripId}:*`).
 */
async function scanActiveLocks(tripId: string): Promise<ActiveSeatLock[]> {
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

/**
 * List active Redis locks for a trip (`seat_lock:{tripId}:*`).
 * Times out so a dead Upstash host cannot block the seat map.
 */
export async function getActiveLocksForTrip(
  tripId: string,
): Promise<ActiveSeatLock[]> {
  if (!tripId?.trim()) return [];
  try {
    return await Promise.race([
      scanActiveLocks(tripId),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("lock scan timeout")), 400),
      ),
    ]);
  } catch {
    return [];
  }
}
