import { TripSeatStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const LOCK_TTL_MS = 600_000;

/**
 * Create AVAILABLE TripSeat rows for a trip from the bus capacity.
 * Idempotent: unique (tripId, seatNumber) skips existing inventory.
 */
export async function provisionTripSeats(tripId: string): Promise<number> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { bus: { select: { totalSeats: true } } },
  });
  if (!trip) return 0;

  const existing = await prisma.tripSeat.findMany({
    where: { tripId },
    select: { seatNumber: true },
  });
  const have = new Set(existing.map((s) => s.seatNumber));
  const rows = [];
  for (let i = 1; i <= trip.bus.totalSeats; i++) {
    const seatNumber = String(i);
    if (have.has(seatNumber)) continue;
    rows.push({
      tripId,
      seatNumber,
      status: TripSeatStatus.AVAILABLE,
    });
  }
  if (rows.length === 0) return 0;
  const result = await prisma.tripSeat.createMany({
    data: rows,
    skipDuplicates: true,
  });
  return result.count;
}

export type ClaimSeatLockResult =
  | {
      success: true;
      tripId: string;
      seatNumber: string;
      userId: string;
      expiresAt: Date;
      ttlSeconds: number;
      extended: boolean;
    }
  | { success: false; message: string };

/**
 * Lock a seat in Neon first so live booking still works when Redis/Upstash is down.
 */
export async function claimSeatLock(
  tripId: string,
  seatNumber: string,
  userId: string,
  ttlSeconds: number = 600,
): Promise<ClaimSeatLockResult> {
  if (!tripId?.trim() || !seatNumber?.trim() || !userId?.trim()) {
    return {
      success: false,
      message: "tripId, seatNumber, and userId are required.",
    };
  }

  const hold = await prisma.partnerSeatHold.findUnique({
    where: { tripId_seatNumber: { tripId, seatNumber } },
    select: { id: true },
  });
  if (hold) {
    return { success: false, message: "Seat is reserved by the operator." };
  }

  await provisionTripSeats(tripId);
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + ttlSeconds * 1000);

  const claimed = await prisma.$transaction(async (tx) => {
    const row = await tx.tripSeat.findUnique({
      where: { tripId_seatNumber: { tripId, seatNumber } },
    });
    if (!row) return { ok: false as const, reason: "missing" };
    if (row.status === TripSeatStatus.BOOKED) {
      return { ok: false as const, reason: "booked" };
    }
    const heldByOther =
      row.status === TripSeatStatus.LOCKED &&
      row.lockedByUserId &&
      row.lockedByUserId !== userId &&
      row.lockedUntil &&
      row.lockedUntil > now;
    if (heldByOther) return { ok: false as const, reason: "held" };
    const extended =
      row.status === TripSeatStatus.LOCKED && row.lockedByUserId === userId;
    await tx.tripSeat.update({
      where: { id: row.id },
      data: {
        status: TripSeatStatus.LOCKED,
        lockedByUserId: userId,
        lockedUntil,
      },
    });
    return { ok: true as const, extended };
  });

  if (!claimed.ok) {
    if (claimed.reason === "booked") {
      return { success: false, message: "Seat is already booked." };
    }
    if (claimed.reason === "held") {
      return { success: false, message: "Seat held by another passenger." };
    }
    return { success: false, message: "Seat is not available." };
  }

  return {
    success: true,
    tripId,
    seatNumber,
    userId,
    expiresAt: lockedUntil,
    ttlSeconds,
    extended: Boolean(claimed.extended),
  };
}

export async function listActivePrismaLocks(tripId: string) {
  return prisma.tripSeat.findMany({
    where: {
      tripId,
      status: TripSeatStatus.LOCKED,
      lockedUntil: { gt: new Date() },
    },
    select: { seatNumber: true, lockedByUserId: true },
  });
}

/** Mirror a Redis seat hold onto TripSeat (AVAILABLE/LOCKED only — never overwrite BOOKED). */
export async function markTripSeatLocked(
  tripId: string,
  seatNumber: string,
  userId: string,
  ttlMs: number = LOCK_TTL_MS,
): Promise<void> {
  await provisionTripSeats(tripId);
  const lockedUntil = new Date(Date.now() + ttlMs);

  await prisma.tripSeat.updateMany({
    where: {
      tripId,
      seatNumber,
      status: { in: [TripSeatStatus.AVAILABLE, TripSeatStatus.LOCKED] },
    },
    data: {
      status: TripSeatStatus.LOCKED,
      lockedByUserId: userId,
      lockedUntil,
    },
  });
}

export async function markTripSeatsBooked(
  tripId: string,
  seatNumbers: string[],
  bookingId: string,
): Promise<void> {
  if (seatNumbers.length === 0) return;
  await prisma.tripSeat.updateMany({
    where: { tripId, seatNumber: { in: seatNumbers } },
    data: {
      status: TripSeatStatus.BOOKED,
      bookingId,
      lockedByUserId: null,
      lockedUntil: null,
    },
  });
}

/** Confirm the passenger still owns these seats in Neon (Redis is optional). */
export async function verifySeatsHeldByUser(
  tripId: string,
  seatNumbers: string[],
  userId: string,
): Promise<{ ok: true; expiresAt: Date } | { ok: false; seatNumber: string }> {
  const now = new Date();
  const unique = [...new Set(seatNumbers.map((s) => s.trim()).filter(Boolean))];
  const [rows, locks] = await Promise.all([
    prisma.tripSeat.findMany({
      where: {
        tripId,
        seatNumber: { in: unique },
        status: TripSeatStatus.LOCKED,
        lockedByUserId: userId,
        lockedUntil: { gt: now },
      },
      select: { seatNumber: true, lockedUntil: true },
    }),
    prisma.seatLock.findMany({
      where: {
        tripId,
        userId,
        seatNumber: { in: unique },
        expiresAt: { gt: now },
      },
      select: { seatNumber: true, expiresAt: true },
    }),
  ]);

  const expiryBySeat = new Map<string, Date>();
  for (const row of rows) {
    if (row.lockedUntil) expiryBySeat.set(row.seatNumber, row.lockedUntil);
  }
  for (const lock of locks) {
    const current = expiryBySeat.get(lock.seatNumber);
    if (!current || lock.expiresAt > current) {
      expiryBySeat.set(lock.seatNumber, lock.expiresAt);
    }
  }

  for (const seatNumber of unique) {
    if (!expiryBySeat.has(seatNumber)) {
      return { ok: false, seatNumber };
    }
  }

  return {
    ok: true,
    expiresAt: new Date(
      Math.min(...[...expiryBySeat.values()].map((d) => d.getTime())),
    ),
  };
}
