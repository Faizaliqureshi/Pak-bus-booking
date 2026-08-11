import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { getAdminUser } from "@/lib/admin-auth";
import { getActiveLocksForTrip } from "@/lib/redis-lock";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tripId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await context.params;

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      bus: true,
      route: {
        include: { stops: { orderBy: { stopOrder: "asc" } } },
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
          contactEmail: true,
          paymentStatus: true,
        },
      },
    },
    orderBy: { seatNumber: "asc" },
  });

  let locks: Array<{ seatNumber: string; userId: string }> = [];
  try {
    locks = await getActiveLocksForTrip(tripId);
  } catch {
    locks = [];
  }

  const firstStop = trip.route.stops[0];
  const lastStop = trip.route.stops[trip.route.stops.length - 1];

  const seats = Array.from({ length: trip.bus.totalSeats }, (_, i) => {
    const seatNumber = String(i + 1);
    const seatTickets = tickets.filter((t) => t.seatNumber === seatNumber);
    const lock = locks.find((l) => l.seatNumber === seatNumber);

    // Full-trip occupancy for manifest grid (any paid ticket on seat)
    const occupied = seatTickets.length > 0;

    return {
      seatNumber,
      status: occupied
        ? "BOOKED"
        : lock
          ? "LOCKED"
          : "AVAILABLE",
      passengers: seatTickets.map((t) => ({
        name: t.passengerName,
        cnic: t.passengerCnic,
        phone: t.booking.contactPhone,
        pnr: t.booking.pnr,
        isBoarded: t.isBoarded,
        boardedAt: t.boardedAt?.toISOString() ?? null,
        boardingStop: t.boardingStop.stationName,
        dropStop: t.dropStop.stationName,
        boardingStopId: t.boardingStopId,
        dropStopId: t.dropStopId,
      })),
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      trip: {
        id: trip.id,
        departureTime: trip.departureTime.toISOString(),
        arrivalTime: trip.arrivalTime.toISOString(),
        basePrice: Number(trip.basePrice),
        busNumber: trip.bus.busNumber,
        layoutType: trip.bus.layoutType,
        totalSeats: trip.bus.totalSeats,
        routeName: trip.route.name,
        originCity: trip.route.originCity,
        destinationCity: trip.route.destinationCity,
        stops: trip.route.stops.map((s) => ({
          id: s.id,
          name: s.stationName,
          order: s.stopOrder,
        })),
        defaultBoardingStopId: firstStop?.id ?? null,
        defaultDropStopId: lastStop?.id ?? null,
      },
      seats,
      passengers: tickets.map((t) => ({
        seatNumber: t.seatNumber,
        name: t.passengerName,
        cnic: t.passengerCnic,
        phone: t.booking.contactPhone,
        pnr: t.booking.pnr,
        isBoarded: t.isBoarded,
        boardedAt: t.boardedAt?.toISOString() ?? null,
        boardingStop: t.boardingStop.stationName,
        dropStop: t.dropStop.stationName,
      })),
    },
  });
}
