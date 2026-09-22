import { NextRequest, NextResponse } from "next/server";
import { asOptionalString, requirePartnerApiKey } from "@/lib/partner-api";
import {
  PartnerInventoryError,
  publishPartnerLive,
  serializeLiveResult,
  type PartnerStopInput,
} from "@/lib/partner-inventory";

export const runtime = "nodejs";

function asStops(value: unknown): PartnerStopInput[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const stops = value
    .map((row) => {
      const s = row as Record<string, unknown>;
      return {
        stationName: String(s.stationName ?? "").trim(),
        stopOrder: Number(s.stopOrder),
        distanceFromOrigin: Number(s.distanceFromOrigin),
      };
    })
    .filter(
      (s) =>
        s.stationName &&
        Number.isFinite(s.stopOrder) &&
        Number.isFinite(s.distanceFromOrigin),
    );
  return stops.length >= 2 ? stops : undefined;
}

/**
 * POST /api/v1/partner/live
 * Create a coach (if needed) and publish a live, searchable route + departure.
 */
export async function POST(request: NextRequest) {
  const auth = await requirePartnerApiKey(request);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const bus = (body.bus as Record<string, unknown> | undefined) ?? body;
  const route = (body.route as Record<string, unknown> | undefined) ?? body;
  const trip = (body.trip as Record<string, unknown> | undefined) ?? body;

  try {
    const result = await publishPartnerLive(auth.partner.id, {
      bus: {
        busId: asOptionalString(bus.busId),
        busNumber: asOptionalString(bus.busNumber),
        layoutType: asOptionalString(bus.layoutType),
        totalSeats:
          bus.totalSeats === undefined ? undefined : Number(bus.totalSeats),
        externalId: asOptionalString(bus.externalId),
      },
      route: {
        routeId: asOptionalString(route.routeId),
        name: asOptionalString(route.name) ?? "",
        originCity: asOptionalString(route.originCity) ?? "",
        destinationCity: asOptionalString(route.destinationCity) ?? "",
        distanceKm: Number(route.distanceKm),
        baseFare:
          route.baseFare === undefined ? undefined : Number(route.baseFare),
        stops: asStops(route.stops),
        externalId: asOptionalString(route.externalId),
      },
      trip: {
        departureTime: new Date(String(trip.departureTime ?? "")),
        arrivalTime: new Date(String(trip.arrivalTime ?? "")),
        basePrice: Number(trip.basePrice ?? route.baseFare ?? 0),
        externalId: asOptionalString(trip.externalId),
      },
    });

    return NextResponse.json(
      { success: true, data: serializeLiveResult(result) },
      { status: result.created.trip ? 201 : 200 },
    );
  } catch (error) {
    if (error instanceof PartnerInventoryError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status },
      );
    }
    console.error("[POST /api/v1/partner/live]", error);
    return NextResponse.json(
      { success: false, message: "Could not publish live route." },
      { status: 500 },
    );
  }
}
