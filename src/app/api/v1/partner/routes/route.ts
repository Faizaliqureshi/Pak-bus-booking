import { NextRequest, NextResponse } from "next/server";
import {
  asOptionalString,
  requirePartnerApiKey,
} from "@/lib/partner-api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type StopInput = {
  stationName: string;
  stopOrder: number;
  distanceFromOrigin: number;
};

function serializeRoute(route: {
  id: string;
  name: string;
  originCity: string;
  destinationCity: string;
  distanceKm: number;
  baseFare: { toString(): string } | number;
  externalId: string | null;
  stops: {
    id: string;
    stationName: string;
    stopOrder: number;
    distanceFromOrigin: number;
  }[];
}) {
  return {
    id: route.id,
    name: route.name,
    originCity: route.originCity,
    destinationCity: route.destinationCity,
    distanceKm: route.distanceKm,
    baseFare: Number(route.baseFare),
    externalId: route.externalId,
    stops: route.stops.map((s) => ({
      id: s.id,
      stationName: s.stationName,
      stopOrder: s.stopOrder,
      distanceFromOrigin: s.distanceFromOrigin,
    })),
  };
}

/** GET /api/v1/partner/routes */
export async function GET(request: NextRequest) {
  const auth = await requirePartnerApiKey(request);
  if (!auth.ok) return auth.response;

  const routes = await prisma.route.findMany({
    where: { operatorId: auth.partner.id },
    include: { stops: { orderBy: { stopOrder: "asc" } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    success: true,
    data: routes.map(serializeRoute),
  });
}

/** POST /api/v1/partner/routes — upsert by externalId */
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

  const name = asOptionalString(body.name);
  const originCity = asOptionalString(body.originCity);
  const destinationCity = asOptionalString(body.destinationCity);
  const distanceKm = Number(body.distanceKm);
  const baseFare = Number(body.baseFare ?? 0);
  const externalId = asOptionalString(body.externalId);

  if (
    !name ||
    !originCity ||
    !destinationCity ||
    !Number.isFinite(distanceKm)
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "name, originCity, destinationCity, and distanceKm are required.",
      },
      { status: 400 },
    );
  }

  const stopRows: StopInput[] = Array.isArray(body.stops)
    ? (body.stops as Record<string, unknown>[])
        .map((s) => ({
          stationName: String(s.stationName ?? "").trim(),
          stopOrder: Number(s.stopOrder),
          distanceFromOrigin: Number(s.distanceFromOrigin),
        }))
        .filter(
          (s) =>
            s.stationName &&
            Number.isFinite(s.stopOrder) &&
            Number.isFinite(s.distanceFromOrigin),
        )
    : [
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
      ];

  if (externalId) {
    const existing = await prisma.route.findFirst({
      where: { operatorId: auth.partner.id, externalId },
    });
    if (existing) {
      const updated = await prisma.route.update({
        where: { id: existing.id },
        data: {
          name,
          originCity,
          destinationCity,
          distanceKm,
          baseFare: Number.isFinite(baseFare) ? baseFare : 0,
          stops: {
            deleteMany: {},
            create: stopRows,
          },
        },
        include: { stops: { orderBy: { stopOrder: "asc" } } },
      });
      return NextResponse.json({
        success: true,
        data: serializeRoute(updated),
        upserted: true,
      });
    }
  }

  const created = await prisma.route.create({
    data: {
      name,
      originCity,
      destinationCity,
      distanceKm,
      baseFare: Number.isFinite(baseFare) ? baseFare : 0,
      operatorId: auth.partner.id,
      externalId: externalId ?? null,
      stops: { create: stopRows },
    },
    include: { stops: { orderBy: { stopOrder: "asc" } } },
  });

  return NextResponse.json(
    { success: true, data: serializeRoute(created) },
    { status: 201 },
  );
}
