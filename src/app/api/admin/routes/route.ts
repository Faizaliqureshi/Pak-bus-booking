import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminJwtResponse, requireAdminJwt } from "@/lib/rbac";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminJwt();
  if (!auth.ok) return adminJwtResponse(auth);

  const routes = await prisma.route.findMany({
    include: {
      stops: { orderBy: { stopOrder: "asc" } },
      trips: {
        take: 5,
        orderBy: { departureTime: "desc" },
        include: { bus: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    success: true,
    data: routes.map((r) => ({
      id: r.id,
      name: r.name,
      originCity: r.originCity,
      destinationCity: r.destinationCity,
      distanceKm: r.distanceKm,
      stops: r.stops.map((s) => ({
        id: s.id,
        stationName: s.stationName,
        stopOrder: s.stopOrder,
        distanceFromOrigin: s.distanceFromOrigin,
      })),
      recentTrips: r.trips.map((t) => ({
        id: t.id,
        busNumber: t.bus.busNumber,
        departureTime: t.departureTime.toISOString(),
        arrivalTime: t.arrivalTime.toISOString(),
        basePrice: Number(t.basePrice),
      })),
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminJwt();
  if (!auth.ok) return adminJwtResponse(auth);

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const originCity = String(body.originCity ?? "").trim();
  const destinationCity = String(body.destinationCity ?? "").trim();
  const distanceKm = Number(body.distanceKm);

  if (!name || !originCity || !destinationCity || !Number.isFinite(distanceKm)) {
    return NextResponse.json(
      { success: false, message: "name, originCity, destinationCity, distanceKm required." },
      { status: 400 },
    );
  }

  const route = await prisma.route.create({
    data: {
      name,
      originCity,
      destinationCity,
      distanceKm,
      stops: {
        create: [
          {
            stationName: `${originCity} Terminal`,
            stopOrder: 1,
            distanceFromOrigin: 0,
          },
          {
            stationName: `${destinationCity} Terminal`,
            stopOrder: 2,
            distanceFromOrigin: distanceKm,
          },
        ],
      },
    },
    include: { stops: { orderBy: { stopOrder: "asc" } } },
  });

  return NextResponse.json({ success: true, data: route }, { status: 201 });
}
