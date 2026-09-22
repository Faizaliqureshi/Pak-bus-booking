import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { getPartnerUser } from "@/lib/admin-auth";
import {
  TICKETPASS_COMMISSION_RATE,
  commissionOn,
  money,
} from "@/lib/partner-ops";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** GET /api/partner/finance — bus-wise income and TicketPass settlement. */
export async function GET() {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const fleetWhere = { trip: { bus: { operatorId: partner.id } } };

  const [paid, pending, refunded, payouts, buses, ticketCount, holdCount] =
    await Promise.all([
      prisma.booking.findMany({
        where: { ...fleetWhere, paymentStatus: PaymentStatus.PAID },
        select: {
          totalPrice: true,
          paymentMethod: true,
          trip: { select: { busId: true } },
        },
      }),
      prisma.booking.aggregate({
        where: { ...fleetWhere, paymentStatus: PaymentStatus.PENDING },
        _sum: { totalPrice: true },
        _count: { _all: true },
      }),
      prisma.booking.aggregate({
        where: { ...fleetWhere, paymentStatus: PaymentStatus.REFUNDED },
        _sum: { totalPrice: true },
        _count: { _all: true },
      }),
      prisma.partnerPayout.findMany({
        where: { operatorId: partner.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.bus.findMany({
        where: { operatorId: partner.id },
        orderBy: { busNumber: "asc" },
        select: {
          id: true,
          busNumber: true,
          _count: { select: { trips: true } },
        },
      }),
      prisma.ticket.count({
        where: {
          booking: {
            paymentStatus: PaymentStatus.PAID,
            trip: { bus: { operatorId: partner.id } },
          },
        },
      }),
      prisma.partnerSeatHold.count({
        where: { operatorId: partner.id },
      }),
    ]);

  const gross = paid.reduce((sum, b) => sum + money(b.totalPrice), 0);
  const commission = commissionOn(gross);
  const net = gross - commission;
  const cleared = payouts
    .filter((p) => p.status === "CLEARED")
    .reduce((sum, p) => sum + money(p.amount), 0);
  const outstanding = Math.max(0, net - cleared);

  const methods: Record<string, { count: number; amount: number }> = {};
  const byBus = new Map<
    string,
    { bookings: number; gross: number }
  >();
  for (const booking of paid) {
    const method = booking.paymentMethod || "OTHER";
    const amount = money(booking.totalPrice);
    methods[method] = methods[method] ?? { count: 0, amount: 0 };
    methods[method].count += 1;
    methods[method].amount += amount;
    const row = byBus.get(booking.trip.busId) ?? { bookings: 0, gross: 0 };
    row.bookings += 1;
    row.gross += amount;
    byBus.set(booking.trip.busId, row);
  }

  return NextResponse.json({
    success: true,
    data: {
      commissionRate: TICKETPASS_COMMISSION_RATE,
      summary: {
        gross,
        commission,
        net,
        cleared,
        outstanding,
        paidBookings: paid.length,
        ticketsSold: ticketCount,
        pendingBookings: pending._count._all,
        pendingValue: money(pending._sum.totalPrice),
        refunds: refunded._count._all,
        refundedValue: money(refunded._sum.totalPrice),
        reservedSeats: holdCount,
      },
      buses: buses.map((bus) => {
        const row = byBus.get(bus.id) ?? { bookings: 0, gross: 0 };
        const fee = commissionOn(row.gross);
        return {
          id: bus.id,
          busNumber: bus.busNumber,
          trips: bus._count.trips,
          paidBookings: row.bookings,
          gross: row.gross,
          commission: fee,
          net: row.gross - fee,
        };
      }),
      methods: Object.entries(methods).map(([method, row]) => ({
        method,
        ...row,
      })),
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: money(p.amount),
        status: p.status,
        reference: p.reference,
        note: p.note,
        clearedAt: p.clearedAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
      })),
    },
  });
}
