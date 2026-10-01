import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  normalizeCityForSearch,
  textMatchesSearchCity,
} from "@/lib/booking-utils";
import { averageRating, photoPublicUrl } from "@/lib/bus-catalog";

export const runtime = "nodejs";

function dayBoundsPkt(dateStr: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const start = new Date(`${dateStr}T00:00:00+05:00`);
  const end = new Date(`${dateStr}T23:59:59.999+05:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

function pickBoardingDrop(
  stops: { id: string; stationName: string; stopOrder: number }[],
  originCity: string,
  destinationCity: string,
  originCities: string[],
  destinationCities: string[],
) {
  const first = stops[0] ?? null;
  const last = stops[stops.length - 1] ?? null;
  const originExact = originCities.includes(originCity);
  const destExact = destinationCities.includes(destinationCity);

  if (originExact && destExact) {
    return { boarding: first, drop: last };
  }

  let boarding = originExact ? first : null;
  for (const stop of stops) {
    if (!boarding && textMatchesSearchCity(stop.stationName, originCities)) {
      boarding = stop;
      continue;
    }
    if (
      boarding &&
      stop.id !== boarding.id &&
      textMatchesSearchCity(stop.stationName, destinationCities)
    ) {
      return { boarding, drop: stop };
    }
  }

  if (boarding && destExact && last && last.id !== boarding.id) {
    return { boarding, drop: last };
  }

  return null;
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
      },
      include: {
        bus: {
          include: {
            operator: {
              select: { id: true, name: true },
            },
            photos: {
              select: { id: true },
              orderBy: { sortOrder: "asc" },
            },
            reviews: {
              select: {
                id: true,
                rating: true,
                comment: true,
                updatedAt: true,
                user: { select: { name: true } },
              },
              orderBy: { updatedAt: "desc" },
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

    const serialized = trips.map((trip) => {
      const match = pickBoardingDrop(
        trip.route.stops,
        trip.route.originCity,
        trip.route.destinationCity,
        originCities,
        destinationCities,
      );
      const firstStop = trip.route.stops[0];
      const lastStop = trip.route.stops[trip.route.stops.length - 1];
      const boarding = match?.boarding ?? firstStop;
      const drop = match?.drop ?? lastStop;
      const durationMs =
        trip.arrivalTime.getTime() - trip.departureTime.getTime();

      return {
        id: trip.id,
        matchesCorridor: Boolean(match),
        departureTime: trip.departureTime.toISOString(),
        arrivalTime: trip.arrivalTime.toISOString(),
        durationMs,
        basePrice: Number(trip.basePrice),
        bus: {
          id: trip.bus.id,
          busNumber: trip.bus.busNumber,
          layoutType: trip.bus.layoutType,
          totalSeats: trip.bus.totalSeats,
          features: trip.bus.features,
          photos: trip.bus.photos.map((p) => photoPublicUrl(p.id)),
          rating: averageRating(trip.bus.reviews.map((r) => r.rating)),
          reviews: trip.bus.reviews.slice(0, 5).map((r) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            name: r.user.name,
            updatedAt: r.updatedAt.toISOString(),
          })),
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
        boardingStop: boarding
          ? {
              id: boarding.id,
              name: boarding.stationName,
              order: boarding.stopOrder,
            }
          : null,
        dropStop: drop
          ? {
              id: drop.id,
              name: drop.stationName,
              order: drop.stopOrder,
            }
          : null,
        stops: trip.route.stops.map((s) => ({
          id: s.id,
          name: s.stationName,
          order: s.stopOrder,
        })),
      };
    });

    const data = serialized.filter((trip) => trip.matchesCorridor);
    const alsoOnDate = serialized.filter((trip) => !trip.matchesCorridor);

    return NextResponse.json(
      { success: true, data, alsoOnDate },
      { status: 200 },
    );
  } catch (error) {
    console.error("[GET /api/trips/search]", error);
    return NextResponse.json(
      { success: false, message: "Failed to search trips." },
      { status: 500 },
    );
  }
}
