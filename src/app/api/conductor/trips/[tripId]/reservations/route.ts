import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { getConductorUser } from "@/lib/admin-auth";
import { conductorOwnsTrip } from "@/lib/conductor-scope";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tripId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const conductor = await getConductorUser();
  if (!conductor) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const { tripId } = await context.params;
  if (!(await conductorOwnsTrip(conductor, tripId))) {
    return NextResponse.json(
      { success: false, message: "Trip not found." },
      { status: 404 },
    );
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      bus: { select: { busNumber: true, totalSeats: true } },
      route: {
        select: { name: true, originCity: true, destinationCity: true },
      },
    },
  });

  if (!trip) {
    return NextResponse.json(
      { success: false, message: "Trip not found." },
      { status: 404 },
    );
  }

  const tickets = await prisma.ticket.findMany({
    where: {
      booking: {
        tripId,
        paymentStatus: PaymentStatus.PAID,
      },
    },
    include: {
      boardingStop: true,
      dropStop: true,
      booking: {
        select: {
          pnr: true,
          contactPhone: true,
          paymentStatus: true,
        },
      },
    },
    orderBy: { seatNumber: "asc" },
  });

  return NextResponse.json({
    success: true,
    data: {
      trip: {
        id: trip.id,
        departureTime: trip.departureTime.toISOString(),
        busNumber: trip.bus.busNumber,
        totalSeats: trip.bus.totalSeats,
        routeName: trip.route.name,
        originCity: trip.route.originCity,
        destinationCity: trip.route.destinationCity,
      },
      passengers: tickets.map((t) => ({
        seatNumber: t.seatNumber,
        name: t.passengerName,
        gender: t.passengerGender,
        pnr: t.booking.pnr,
        phone: t.booking.contactPhone,
        isBoarded: t.isBoarded,
        boardedAt: t.boardedAt?.toISOString() ?? null,
        boardingStop: t.boardingStop.stationName,
        dropStop: t.dropStop.stationName,
      })),
    },
  });
}
