import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminJwtResponse, requireAdminJwt } from "@/lib/rbac";
import { provisionTripSeats } from "@/lib/trip-inventory";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminJwt();
  if (!auth.ok) return adminJwtResponse(auth);

  const trips = await prisma.trip.findMany({
    orderBy: { departureTime: "asc" },
    include: {
      bus: true,
      route: {
        include: { stops: { orderBy: { stopOrder: "asc" } } },
      },
      _count: {
        select: {
          bookings: true,
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    data: trips.map((t) => ({
      id: t.id,
      departureTime: t.departureTime.toISOString(),
      arrivalTime: t.arrivalTime.toISOString(),
      basePrice: Number(t.basePrice),
      bus: {
        id: t.bus.id,
        busNumber: t.bus.busNumber,
        layoutType: t.bus.layoutType,
        totalSeats: t.bus.totalSeats,
      },
      route: {
        id: t.route.id,
        name: t.route.name,
        originCity: t.route.originCity,
        destinationCity: t.route.destinationCity,
        stops: t.route.stops.map((s) => ({
          id: s.id,
          name: s.stationName,
          order: s.stopOrder,
        })),
      },
      bookingCount: t._count.bookings,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminJwt();
  if (!auth.ok) return adminJwtResponse(auth);

  const body = await request.json();
  const busId = String(body.busId ?? "").trim();
  const routeId = String(body.routeId ?? "").trim();
  const departureTime = new Date(String(body.departureTime ?? ""));
  const arrivalTime = new Date(String(body.arrivalTime ?? ""));
  const basePrice = Number(body.basePrice);

  if (
    !busId ||
    !routeId ||
    Number.isNaN(departureTime.getTime()) ||
    Number.isNaN(arrivalTime.getTime()) ||
    !Number.isFinite(basePrice) ||
    arrivalTime <= departureTime
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "busId, routeId, departureTime, arrivalTime, and basePrice are required.",
      },
      { status: 400 },
    );
  }

  const [bus, route] = await Promise.all([
    prisma.bus.findUnique({ where: { id: busId } }),
    prisma.route.findUnique({ where: { id: routeId } }),
  ]);

  if (!bus || !route) {
    return NextResponse.json(
      { success: false, message: "Bus or route not found." },
      { status: 404 },
    );
  }

  const trip = await prisma.trip.create({
    data: {
      busId,
      routeId,
      departureTime,
      arrivalTime,
      basePrice,
    },
  });

  await provisionTripSeats(trip.id);

  return NextResponse.json({ success: true, data: trip }, { status: 201 });
}
