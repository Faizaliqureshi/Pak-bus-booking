import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCityForSearch } from "@/lib/booking-utils";

export const runtime = "nodejs";

function dayBoundsPkt(dateStr: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const start = new Date(`${dateStr}T00:00:00+05:00`);
  const end = new Date(`${dateStr}T23:59:59.999+05:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

/**
 * GET /api/trips/search?origin=&destination=&date=YYYY-MM-DD
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const origin = searchParams.get("origin")?.trim();
    const destination = searchParams.get("destination")?.trim();
    const date = searchParams.get("date")?.trim();

    if (!origin || !destination || !date) {
      return NextResponse.json(
        {
          success: false,
          message: "origin, destination, and date are required.",
        },
        { status: 400 },
      );
    }

    if (origin === destination) {
      return NextResponse.json(
        {
          success: false,
          message: "Origin and destination must be different.",
        },
        { status: 400 },
      );
    }

    const bounds = dayBoundsPkt(date);
    if (!bounds) {
      return NextResponse.json(
        { success: false, message: "date must be YYYY-MM-DD." },
        { status: 400 },
      );
    }

    const originCities = normalizeCityForSearch(origin);
    const destinationCities = normalizeCityForSearch(destination);

    const trips = await prisma.trip.findMany({
      where: {
        departureTime: {
          gte: bounds.start,
          lte: bounds.end,
        },
        route: {
          originCity: { in: originCities },
          destinationCity: { in: destinationCities },
        },
      },
      include: {
        bus: {
          include: {
            operator: {
              select: { id: true, name: true },
            },
          },
        },
        route: {
          include: {
            stops: { orderBy: { stopOrder: "asc" } },
          },
        },
      },
      orderBy: { departureTime: "asc" },
    });

    const data = trips.map((trip) => {
      const firstStop = trip.route.stops[0];
      const lastStop = trip.route.stops[trip.route.stops.length - 1];
      const durationMs =
        trip.arrivalTime.getTime() - trip.departureTime.getTime();

      return {
        id: trip.id,
        departureTime: trip.departureTime.toISOString(),
        arrivalTime: trip.arrivalTime.toISOString(),
        durationMs,
        basePrice: Number(trip.basePrice),
        bus: {
          id: trip.bus.id,
          busNumber: trip.bus.busNumber,
          layoutType: trip.bus.layoutType,
          totalSeats: trip.bus.totalSeats,
        },
        operator: {
          id: trip.bus.operator.id,
          name: trip.bus.operator.name.replace(/\s+Operator$/i, ""),
        },
        route: {
          id: trip.route.id,
          name: trip.route.name,
          originCity: trip.route.originCity,
          destinationCity: trip.route.destinationCity,
          distanceKm: trip.route.distanceKm,
        },
        boardingStop: firstStop
          ? {
              id: firstStop.id,
              name: firstStop.stationName,
              order: firstStop.stopOrder,
            }
          : null,
        dropStop: lastStop
          ? {
              id: lastStop.id,
              name: lastStop.stationName,
              order: lastStop.stopOrder,
            }
          : null,
        stops: trip.route.stops.map((s) => ({
          id: s.id,
          name: s.stationName,
          order: s.stopOrder,
        })),
      };
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/trips/search]", error);
    return NextResponse.json(
      { success: false, message: "Failed to search trips." },
      { status: 500 },
    );
  }
}
