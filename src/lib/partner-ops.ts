import { PaymentStatus, TripSeatStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveLocksForTrip } from "@/lib/redis-lock";

export const TICKETPASS_COMMISSION_RATE = 0.1;

export async function partnerTrip(partnerId: string, tripId: string) {
  return prisma.trip.findFirst({
    where: { id: tripId, bus: { operatorId: partnerId } },
    include: {
      bus: {
        select: {
          id: true,
          busNumber: true,
          totalSeats: true,
          layoutType: true,
        },
      },
      route: {
        select: {
          name: true,
          originCity: true,
          destinationCity: true,
          stops: { orderBy: { stopOrder: "asc" as const } },
        },
      },
    },
  });
}

export async function partnerHeldSeats(tripId: string): Promise<Set<string>> {
  const rows = await prisma.partnerSeatHold.findMany({
    where: { tripId },
    select: { seatNumber: true },
  });
  return new Set(rows.map((r) => r.seatNumber));
}

export async function seatsBlockedForSale(tripId: string, seatNumbers: string[]) {
  if (seatNumbers.length === 0) return [];
  const [holds, inventory] = await Promise.all([
    prisma.partnerSeatHold.findMany({
      where: { tripId, seatNumber: { in: seatNumbers } },
      select: { seatNumber: true },
    }),
    prisma.tripSeat.findMany({
      where: {
        tripId,
        seatNumber: { in: seatNumbers },
        status: TripSeatStatus.BOOKED,
      },
      select: { seatNumber: true },
    }),
  ]);
  return [...new Set([...holds, ...inventory].map((r) => r.seatNumber))];
}

export function money(value: { toString(): string } | number | null | undefined) {
  return Number(value ?? 0);
}

export function commissionOn(gross: number) {
  return Math.round(gross * TICKETPASS_COMMISSION_RATE);
}

export async function tripSeatSnapshot(tripId: string, totalSeats: number) {
  const [holds, inventory, tickets, locks] = await Promise.all([
    prisma.partnerSeatHold.findMany({
      where: { tripId },
      select: { seatNumber: true, note: true },
    }),
    prisma.tripSeat.findMany({
      where: { tripId, status: TripSeatStatus.BOOKED },
      select: { seatNumber: true, bookingId: true },
    }),
    prisma.ticket.findMany({
      where: {
        booking: { tripId, paymentStatus: PaymentStatus.PAID },
      },
      select: { seatNumber: true },
    }),
    Promise.race([
      getActiveLocksForTrip(tripId),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("lock scan timeout")), 1500),
      ),
    ]).catch(() => []),
  ]);

  const held = new Set(holds.map((h) => h.seatNumber));
  const booked = new Set([
    ...inventory.map((s) => s.seatNumber),
    ...tickets.map((t) => t.seatNumber),
  ]);
  const locked = new Set(locks.map((l) => l.seatNumber));

  const seats = Array.from({ length: totalSeats }, (_, i) => {
    const seatNumber = String(i + 1);
    let status: "AVAILABLE" | "PAID" | "RESERVED" | "LOCKED" = "AVAILABLE";
    if (booked.has(seatNumber)) status = "PAID";
    else if (held.has(seatNumber)) status = "RESERVED";
    else if (locked.has(seatNumber)) status = "LOCKED";
    return { seatNumber, status };
  });

  return {
    seats,
    reserved: holds.map((h) => h.seatNumber),
    paid: [...booked],
  };
}
