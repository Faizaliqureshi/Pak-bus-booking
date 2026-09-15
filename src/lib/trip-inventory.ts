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
