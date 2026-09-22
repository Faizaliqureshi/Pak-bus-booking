import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { getConductorUser } from "@/lib/admin-auth";
import {
  conductorFleetWhere,
  partnerIdForConductor,
} from "@/lib/conductor-scope";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Upcoming and recent trips with paid reservation counts. */
export async function GET() {
  const conductor = await getConductorUser();
  if (!conductor) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const from = new Date();
  from.setDate(from.getDate() - 1);
  const to = new Date();
  to.setDate(to.getDate() + 7);

  const partnerId = partnerIdForConductor(conductor);
  const trips = await prisma.trip.findMany({
    where: {
      departureTime: { gte: from, lte: to },
      ...conductorFleetWhere(partnerId),
    },
    orderBy: { departureTime: "asc" },
    include: {
      bus: { select: { busNumber: true, totalSeats: true } },
      route: {
        select: { name: true, originCity: true, destinationCity: true },
      },
      bookings: {
        where: { paymentStatus: PaymentStatus.PAID },
        select: {
          tickets: {
            select: { isBoarded: true },
          },
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    data: trips.map((t) => {
      const tickets = t.bookings.flatMap((b) => b.tickets);
      const boarded = tickets.filter((x) => x.isBoarded).length;
      return {
        id: t.id,
        departureTime: t.departureTime.toISOString(),
        arrivalTime: t.arrivalTime.toISOString(),
        busNumber: t.bus.busNumber,
        totalSeats: t.bus.totalSeats,
        routeName: t.route.name,
        originCity: t.route.originCity,
        destinationCity: t.route.destinationCity,
        reservedCount: tickets.length,
        boardedCount: boarded,
      };
    }),
  });
}
