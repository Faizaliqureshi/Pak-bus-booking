import { NextRequest, NextResponse } from "next/server";
import { isAllowedBusLayoutType } from "@/lib/booking-utils";
import {
  asOptionalString,
  requirePartnerApiKey,
} from "@/lib/partner-api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function serializeBus(bus: {
  id: string;
  busNumber: string;
  layoutType: string;
  totalSeats: number;
  externalId: string | null;
  createdAt: Date;
}) {
  return {
    id: bus.id,
    busNumber: bus.busNumber,
    layoutType: bus.layoutType,
    totalSeats: bus.totalSeats,
    externalId: bus.externalId,
    createdAt: bus.createdAt.toISOString(),
  };
}

/** GET /api/v1/partner/buses */
export async function GET(request: NextRequest) {
  const auth = await requirePartnerApiKey(request);
  if (!auth.ok) return auth.response;

  const buses = await prisma.bus.findMany({
    where: { operatorId: auth.partner.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: buses.map(serializeBus),
  });
}

/**
 * POST /api/v1/partner/buses
 * Upserts by externalId when provided.
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

  const busNumber = asOptionalString(body.busNumber)?.toUpperCase();
  const layoutType = asOptionalString(body.layoutType);
  const totalSeats = Number(body.totalSeats);
  const externalId = asOptionalString(body.externalId);

  if (
    !busNumber ||
    !layoutType ||
    !Number.isInteger(totalSeats) ||
    totalSeats < 1
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "busNumber, layoutType, and totalSeats are required.",
      },
      { status: 400 },
    );
  }
  if (!isAllowedBusLayoutType(layoutType)) {
    return NextResponse.json(
      {
        success: false,
        message: "layoutType must be 2x2, 2x1, or 2x1_SLEEPER.",
      },
      { status: 400 },
    );
  }

  try {
    if (externalId) {
      const existing = await prisma.bus.findFirst({
        where: { operatorId: auth.partner.id, externalId },
      });
      if (existing) {
        const updated = await prisma.bus.update({
          where: { id: existing.id },
          data: { busNumber, layoutType, totalSeats },
        });
        return NextResponse.json({
          success: true,
          data: serializeBus(updated),
          upserted: true,
        });
      }
    }

    const created = await prisma.bus.create({
      data: {
        operatorId: auth.partner.id,
        busNumber,
        layoutType,
        totalSeats,
        externalId: externalId ?? null,
      },
    });
    return NextResponse.json(
      { success: true, data: serializeBus(created) },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Bus number may already exist." },
      { status: 409 },
    );
  }
}
