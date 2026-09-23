import { PaymentStatus, TripSeatStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveLocksForTrip } from "@/lib/redis-lock";
import { listActivePrismaLocks } from "@/lib/trip-inventory";

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

export type PartnerFinanceRow = {
  id: string;
  name: string;
  email: string;
  revenue: number;
  commission: number;
  profit: number;
  cleared: number;
  outstanding: number;
  paidBookings: number;
};

export type FleetFinanceRow = {
  id: string;
  busNumber: string;
  operatorId: string;
  operatorName: string;
  revenue: number;
  commission: number;
  profit: number;
  outstanding: number;
  paidBookings: number;
};

/** Master control-centre ledger: collected fares, partner share, and unpaid payouts. */
export async function platformFinanceSnapshot() {
  const [paid, payouts, buses, partners] = await Promise.all([
    prisma.booking.findMany({
      where: { paymentStatus: PaymentStatus.PAID },
      select: {
        totalPrice: true,
        trip: {
          select: {
            busId: true,
            bus: {
              select: {
                operatorId: true,
              },
            },
          },
        },
      },
    }),
    prisma.partnerPayout.findMany({
      where: { status: "CLEARED" },
      select: { operatorId: true, amount: true },
    }),
    prisma.bus.findMany({
      orderBy: { busNumber: "asc" },
      select: {
        id: true,
        busNumber: true,
        operatorId: true,
        operator: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: UserRole.OPERATOR },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const clearedByPartner = new Map<string, number>();
  for (const payout of payouts) {
    clearedByPartner.set(
      payout.operatorId,
      (clearedByPartner.get(payout.operatorId) ?? 0) + money(payout.amount),
    );
  }

  const partnerAgg = new Map<
    string,
    { revenue: number; paidBookings: number }
  >();
  const busAgg = new Map<string, { revenue: number; paidBookings: number }>();

  for (const booking of paid) {
    const amount = money(booking.totalPrice);
    const operatorId = booking.trip.bus.operatorId;
    const busId = booking.trip.busId;
    const partner = partnerAgg.get(operatorId) ?? {
      revenue: 0,
      paidBookings: 0,
    };
    partner.revenue += amount;
    partner.paidBookings += 1;
    partnerAgg.set(operatorId, partner);
    const bus = busAgg.get(busId) ?? { revenue: 0, paidBookings: 0 };
    bus.revenue += amount;
    bus.paidBookings += 1;
    busAgg.set(busId, bus);
  }

  const byPartner: PartnerFinanceRow[] = partners.map((partner) => {
    const row = partnerAgg.get(partner.id) ?? { revenue: 0, paidBookings: 0 };
    const commission = commissionOn(row.revenue);
    const profit = row.revenue - commission;
    const cleared = clearedByPartner.get(partner.id) ?? 0;
    return {
      id: partner.id,
      name: partner.name,
      email: partner.email,
      revenue: row.revenue,
      commission,
      profit,
      cleared,
      outstanding: Math.max(0, profit - cleared),
      paidBookings: row.paidBookings,
    };
  });

  const outstandingByPartner = new Map(
    byPartner.map((row) => [row.id, row.outstanding]),
  );
  const profitByPartner = new Map(byPartner.map((row) => [row.id, row.profit]));

  const byFleet: FleetFinanceRow[] = buses.map((bus) => {
    const row = busAgg.get(bus.id) ?? { revenue: 0, paidBookings: 0 };
    const commission = commissionOn(row.revenue);
    const profit = row.revenue - commission;
    const partnerProfit = profitByPartner.get(bus.operatorId) ?? 0;
    const partnerOutstanding = outstandingByPartner.get(bus.operatorId) ?? 0;
    const outstanding =
      partnerProfit > 0
        ? Math.round(partnerOutstanding * (profit / partnerProfit))
        : 0;
    return {
      id: bus.id,
      busNumber: bus.busNumber,
      operatorId: bus.operatorId,
      operatorName: bus.operator.name,
      revenue: row.revenue,
      commission,
      profit,
      outstanding,
      paidBookings: row.paidBookings,
    };
  });

  const totalRevenue = byPartner.reduce((sum, row) => sum + row.revenue, 0);
  const totalCommission = byPartner.reduce(
    (sum, row) => sum + row.commission,
    0,
  );
  const totalPartnerProfit = byPartner.reduce((sum, row) => sum + row.profit, 0);
  const totalCleared = byPartner.reduce((sum, row) => sum + row.cleared, 0);
  const totalOutstanding = byPartner.reduce(
    (sum, row) => sum + row.outstanding,
    0,
  );

  return {
    totalRevenue,
    totalCommission,
    totalPartnerProfit,
    totalCleared,
    totalOutstanding,
    byPartner,
    byFleet,
  };
}

export async function tripSeatSnapshot(tripId: string, totalSeats: number) {
  const [holds, inventory, tickets, prismaLocks, locks] = await Promise.all([
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
    listActivePrismaLocks(tripId),
    Promise.race([
      getActiveLocksForTrip(tripId),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("lock scan timeout")), 400),
      ),
    ]).catch(() => []),
  ]);

  const held = new Set(holds.map((h) => h.seatNumber));
  const booked = new Set([
    ...inventory.map((s) => s.seatNumber),
    ...tickets.map((t) => t.seatNumber),
  ]);
  const locked = new Set([
    ...locks.map((l) => l.seatNumber),
    ...prismaLocks.map((l) => l.seatNumber),
  ]);

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
