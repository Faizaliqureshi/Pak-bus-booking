import { NextRequest, NextResponse } from "next/server";
import { getPartnerUser } from "@/lib/admin-auth";
import {
  PartnerInventoryError,
  publishPartnerLive,
  serializeLiveResult,
} from "@/lib/partner-inventory";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** GET /api/partner/live — buses + live departures for the signed-in partner. */
export async function GET() {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const [buses, trips] = await Promise.all([
    prisma.bus.findMany({
      where: { operatorId: partner.id },
      orderBy: { busNumber: "asc" },
    }),
    prisma.trip.findMany({
      where: { bus: { operatorId: partner.id } },
      include: {
        bus: { select: { busNumber: true } },
        route: {
          select: { name: true, originCity: true, destinationCity: true },
        },
      },
      orderBy: { departureTime: "desc" },
      take: 40,
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      buses: buses.map((b) => ({
        id: b.id,
        busNumber: b.busNumber,
        layoutType: b.layoutType,
        totalSeats: b.totalSeats,
      })),
      trips: trips.map((t) => ({
        id: t.id,
        busNumber: t.bus.busNumber,
        routeName: t.route.name,
        originCity: t.route.originCity,
        destinationCity: t.route.destinationCity,
        departureTime: t.departureTime.toISOString(),
        arrivalTime: t.arrivalTime.toISOString(),
        basePrice: Number(t.basePrice),
      })),
    },
  });
}

/** POST /api/partner/live — portal form publishes a searchable departure. */
export async function POST(request: NextRequest) {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  try {
    const result = await publishPartnerLive(partner.id, {
      bus: {
        busId: typeof body.busId === "string" ? body.busId : undefined,
        busNumber:
          typeof body.busNumber === "string" ? body.busNumber : undefined,
        layoutType:
          typeof body.layoutType === "string" ? body.layoutType : undefined,
        totalSeats:
          body.totalSeats === undefined ? undefined : Number(body.totalSeats),
      },
      route: {
        name: String(body.name ?? "").trim(),
        originCity: String(body.originCity ?? "").trim(),
        destinationCity: String(body.destinationCity ?? "").trim(),
        distanceKm: Number(body.distanceKm),
        baseFare: Number(body.baseFare ?? body.basePrice ?? 0),
      },
      trip: {
        departureTime: new Date(String(body.departureTime ?? "")),
        arrivalTime: new Date(String(body.arrivalTime ?? "")),
        basePrice: Number(body.basePrice ?? body.baseFare ?? 0),
      },
    });

    return NextResponse.json(
      { success: true, data: serializeLiveResult(result) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PartnerInventoryError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status },
      );
    }
    console.error("[POST /api/partner/live]", error);
    return NextResponse.json(
      { success: false, message: "Could not publish live route." },
      { status: 500 },
    );
  }
}
