import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus, UserRole } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import {
  buildTrackStops,
  computeJourneyProgress,
  etaIso,
  interpolatePosition,
  locateAlongStops,
} from "@/lib/bus-track";
import { parseHeldSeats } from "@/lib/checkout-utils";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function serializeTrip(trip: {
  id: string;
  departureTime: Date;
  arrivalTime: Date;
  bus: {
    busNumber: string;
    operator: { id: string; name: string };
  };
  route: {
    name: string;
    originCity: string;
    destinationCity: string;
    stops: {
      id: string;
      stationName: string;
      stopOrder: number;
      distanceFromOrigin: number;
    }[];
  };
}) {
  const stops = buildTrackStops(
    trip.route.stops,
    trip.route.originCity,
    trip.route.destinationCity,
  );
  const { progress, phase } = computeJourneyProgress(
    trip.departureTime,
    trip.arrivalTime,
  );
  const { lastStop, nextStop } = locateAlongStops(stops, progress);
  const position = interpolatePosition(stops, progress);

  return {
    tripId: trip.id,
    busNumber: trip.bus.busNumber,
    operatorName: trip.bus.operator.name,
    routeName: trip.route.name,
    originCity: trip.route.originCity,
    destinationCity: trip.route.destinationCity,
    departureTime: trip.departureTime.toISOString(),
    arrivalTime: trip.arrivalTime.toISOString(),
    phase,
    progress: Math.round(progress * 1000) / 1000,
    eta: etaIso(trip.arrivalTime, phase),
    lastStop: { name: lastStop.name, order: lastStop.order },
    nextStop: nextStop
      ? { name: nextStop.name, order: nextStop.order }
      : null,
    position,
    stops: stops.map((s) => ({
      id: s.id,
      name: s.name,
      order: s.order,
      lat: s.lat,
      lng: s.lng,
    })),
  };
}

const tripInclude = {
  bus: {
    include: { operator: { select: { id: true, name: true } } },
  },
  route: {
    include: { stops: { orderBy: { stopOrder: "asc" as const } } },
  },
} as const;

function pickActiveTrip<
  T extends { departureTime: Date; arrivalTime: Date },
>(trips: T[]): T | null {
  if (trips.length === 0) return null;
  const now = Date.now();
  const enRoute = trips.find(
    (t) =>
      t.departureTime.getTime() <= now && t.arrivalTime.getTime() >= now,
  );
  if (enRoute) return enRoute;
  const upcoming = trips
    .filter((t) => t.departureTime.getTime() > now)
    .sort((a, b) => a.departureTime.getTime() - b.departureTime.getTime())[0];
  if (upcoming) return upcoming;
  return trips
    .slice()
    .sort((a, b) => b.departureTime.getTime() - a.departureTime.getTime())[0];
}

function seatsForBooking(booking: {
  heldSeats: string | null;
  tickets: { seatNumber: string }[];
}): string[] {
  const held = parseHeldSeats(booking.heldSeats);
  if (held.length > 0) return held;
  return booking.tickets.map((t) => t.seatNumber);
}

/**
 * GET /api/track?pnr= | ?bookingId= | ?busNumber=
 * Login required. Passengers use PNR/booking id; Master/Partner use bus number.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Sign in to track a bus." },
      { status: 401 },
    );
  }

  const pnr = request.nextUrl.searchParams.get("pnr")?.trim();
  const bookingId = request.nextUrl.searchParams.get("bookingId")?.trim();
  const busNumber = request.nextUrl.searchParams
    .get("busNumber")
    ?.trim()
    .toUpperCase();

  const isStaff =
    user.role === UserRole.MASTER ||
    user.role === UserRole.ADMIN ||
    user.role === UserRole.OPERATOR ||
    user.role === UserRole.CONDUCTOR;

  try {
    if (pnr || bookingId) {
      const booking = await prisma.booking.findFirst({
        where: pnr
          ? { pnr: { equals: pnr, mode: "insensitive" } }
          : { id: bookingId },
        include: {
          trip: { include: tripInclude },
          tickets: { select: { seatNumber: true } },
        },
      });

      if (!booking) {
        return NextResponse.json(
          { success: false, message: "Booking not found." },
          { status: 404 },
        );
      }

      if (
        user.role === UserRole.PASSENGER &&
        booking.userId !== user.id
      ) {
        return NextResponse.json(
          { success: false, message: "Booking not found." },
          { status: 404 },
        );
      }

      if (user.role === UserRole.OPERATOR) {
        if (booking.trip.bus.operator.id !== user.id) {
          return NextResponse.json(
            { success: false, message: "Booking not found." },
            { status: 404 },
          );
        }
      }

      if (user.role === UserRole.CONDUCTOR) {
        if (
          !user.createdById ||
          booking.trip.bus.operator.id !== user.createdById
        ) {
          return NextResponse.json(
            { success: false, message: "Booking not found." },
            { status: 404 },
          );
        }
      }

      if (booking.paymentStatus !== PaymentStatus.PAID && !isStaff) {
        return NextResponse.json(
          {
            success: false,
            message: "Tracking is available after the ticket is paid.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          lookup: "booking",
          booking: {
            id: booking.id,
            pnr: booking.pnr,
            paymentStatus: booking.paymentStatus,
            seats: seatsForBooking(booking),
          },
          trip: serializeTrip(booking.trip),
        },
      });
    }

    if (busNumber) {
      if (user.role === UserRole.PASSENGER) {
        return NextResponse.json(
          {
            success: false,
            message: "Passengers track with a PNR or booking ID.",
          },
          { status: 403 },
        );
      }

      const bus = await prisma.bus.findFirst({
        where: {
          busNumber: { equals: busNumber, mode: "insensitive" },
          ...(user.role === UserRole.OPERATOR
            ? { operatorId: user.id }
            : user.role === UserRole.CONDUCTOR
              ? { operatorId: user.createdById ?? "__none__" }
              : {}),
        },
      });

      if (!bus) {
        return NextResponse.json(
          { success: false, message: "Bus not found." },
          { status: 404 },
        );
      }

      const trips = await prisma.trip.findMany({
        where: { busId: bus.id },
        orderBy: { departureTime: "desc" },
        take: 40,
        include: tripInclude,
      });

      const trip = pickActiveTrip(trips);
      if (!trip) {
        return NextResponse.json(
          {
            success: false,
            message: "No recent or upcoming trip for this bus.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          lookup: "bus",
          busNumber: bus.busNumber,
          trip: serializeTrip(trip),
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: isStaff
          ? "busNumber is required."
          : "pnr or bookingId is required.",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("[GET /api/track]", error);
    return NextResponse.json(
      { success: false, message: "Could not load tracking." },
      { status: 500 },
    );
  }
}
