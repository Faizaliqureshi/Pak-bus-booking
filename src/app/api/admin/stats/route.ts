import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { dayBoundsPkt, getAdminUser } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { start, end } = dayBoundsPkt();

  const [paidTicketsToday, tripsToday, buses, paidBookingsToday] =
    await Promise.all([
      prisma.ticket.findMany({
        where: {
          booking: {
            paymentStatus: PaymentStatus.PAID,
            createdAt: { gte: start, lte: end },
          },
        },
        include: {
          booking: { select: { totalPrice: true, createdAt: true } },
        },
      }),
      prisma.trip.findMany({
        where: { departureTime: { gte: start, lte: end } },
        include: { bus: true },
      }),
      prisma.bus.findMany({ select: { totalSeats: true } }),
      prisma.booking.findMany({
        where: {
          paymentStatus: PaymentStatus.PAID,
          createdAt: { gte: start, lte: end },
        },
        select: { totalPrice: true },
      }),
    ]);

  const revenueToday = paidBookingsToday.reduce(
    (sum, b) => sum + Number(b.totalPrice),
    0,
  );

  const ticketsSoldToday = paidTicketsToday.length;

  const capacityToday = tripsToday.reduce(
    (sum, t) => sum + t.bus.totalSeats,
    0,
  );

  // Occupancy: paid tickets on today's trips / total seats on today's trips
  const ticketsOnTodaysTrips = await prisma.ticket.count({
    where: {
      booking: {
        paymentStatus: PaymentStatus.PAID,
        tripId: { in: tripsToday.map((t) => t.id) },
      },
    },
  });

  const occupancyRate =
    capacityToday > 0
      ? Math.round((ticketsOnTodaysTrips / capacityToday) * 1000) / 10
      : 0;

  return NextResponse.json({
    success: true,
    data: {
      revenueToday,
      occupancyRate,
      ticketsSoldToday,
      activeTripsToday: tripsToday.length,
      fleetSize: buses.length,
    },
  });
}
