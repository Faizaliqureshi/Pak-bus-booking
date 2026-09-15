import { NextRequest, NextResponse } from "next/server";
import {
  asOptionalString,
  requirePartnerApiKey,
} from "@/lib/partner-api";
import { prisma } from "@/lib/prisma";
import { provisionTripSeats } from "@/lib/trip-inventory";

export const runtime = "nodejs";

function serializeTrip(trip: {
  id: string;
  departureTime: Date;
  arrivalTime: Date;
  basePrice: { toString(): string } | number;
  externalId: string | null;
  busId: string;
  routeId: string;
  bus: { busNumber: string; externalId: string | null };
  route: {
    name: string;
    originCity: string;
    destinationCity: string;
    externalId: string | null;
  };
}) {
  return {
    id: trip.id,
    busId: trip.busId,
    routeId: trip.routeId,
    externalId: trip.externalId,
    departureTime: trip.departureTime.toISOString(),
    arrivalTime: trip.arrivalTime.toISOString(),
    basePrice: Number(trip.basePrice),
    busNumber: trip.bus.busNumber,
    busExternalId: trip.bus.externalId,
    routeName: trip.route.name,
    originCity: trip.route.originCity,
    destinationCity: trip.route.destinationCity,
    routeExternalId: trip.route.externalId,
  };
}

const tripInclude = {
  bus: { select: { busNumber: true, externalId: true } },
  route: {
    select: {
      name: true,
      originCity: true,
      destinationCity: true,
      externalId: true,
    },
  },
} as const;

/** GET /api/v1/partner/trips */
export async function GET(request: NextRequest) {
  const auth = await requirePartnerApiKey(request);
  if (!auth.ok) return auth.response;

  const trips = await prisma.trip.findMany({
    where: { bus: { operatorId: auth.partner.id } },
    include: tripInclude,
    orderBy: { departureTime: "asc" },
  });

  return NextResponse.json({
    success: true,
    data: trips.map(serializeTrip),
  });
}

/**
 * POST /api/v1/partner/trips
 * Body: busId or busExternalId, routeId or routeExternalId,
 * departureTime, arrivalTime, basePrice, externalId?
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

  const busId = asOptionalString(body.busId);
  const busExternalId = asOptionalString(body.busExternalId);
  const routeId = asOptionalString(body.routeId);
  const routeExternalId = asOptionalString(body.routeExternalId);
  const externalId = asOptionalString(body.externalId);
  const departureTime = new Date(String(body.departureTime ?? ""));
  const arrivalTime = new Date(String(body.arrivalTime ?? ""));
  const basePrice = Number(body.basePrice);

  if (
    Number.isNaN(departureTime.getTime()) ||
    Number.isNaN(arrivalTime.getTime()) ||
    !Number.isFinite(basePrice) ||
    arrivalTime <= departureTime
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "departureTime, arrivalTime, and basePrice are required (arrival after departure).",
      },
      { status: 400 },
    );
  }

  const bus = busId
    ? await prisma.bus.findFirst({
        where: { id: busId, operatorId: auth.partner.id },
      })
    : busExternalId
      ? await prisma.bus.findFirst({
          where: { operatorId: auth.partner.id, externalId: busExternalId },
        })
      : null;

  const route = routeId
    ? await prisma.route.findFirst({
        where: {
          id: routeId,
          OR: [{ operatorId: auth.partner.id }, { operatorId: null }],
        },
      })
    : routeExternalId
      ? await prisma.route.findFirst({
          where: { operatorId: auth.partner.id, externalId: routeExternalId },
        })
      : null;

  if (!bus || !route) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Bus or route not found. Use ids you own, or a public platform routeId.",
      },
      { status: 404 },
    );
  }

  if (externalId) {
    const existing = await prisma.trip.findFirst({
      where: { busId: bus.id, externalId },
      include: tripInclude,
    });
    if (existing) {
      const updated = await prisma.trip.update({
        where: { id: existing.id },
        data: {
          routeId: route.id,
          departureTime,
          arrivalTime,
          basePrice,
        },
        include: tripInclude,
      });
      await provisionTripSeats(updated.id);
      return NextResponse.json({
        success: true,
        data: serializeTrip(updated),
        upserted: true,
      });
    }
  }

  const created = await prisma.trip.create({
    data: {
      busId: bus.id,
      routeId: route.id,
      departureTime,
      arrivalTime,
      basePrice,
      externalId: externalId ?? null,
    },
    include: tripInclude,
  });
  await provisionTripSeats(created.id);

  return NextResponse.json(
    { success: true, data: serializeTrip(created) },
    { status: 201 },
  );
}
