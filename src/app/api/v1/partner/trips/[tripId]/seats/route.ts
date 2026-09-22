import { NextRequest, NextResponse } from "next/server";
import { TripSeatStatus } from "@prisma/client";
import { requirePartnerApiKey } from "@/lib/partner-api";
import { prisma } from "@/lib/prisma";
import { provisionTripSeats } from "@/lib/trip-inventory";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tripId: string }> };

const SYNCABLE = new Set<TripSeatStatus>([
  TripSeatStatus.AVAILABLE,
  TripSeatStatus.BOOKED,
]);

async function loadOwnTrip(partnerId: string, tripId: string) {
  return prisma.trip.findFirst({
    where: { id: tripId, bus: { operatorId: partnerId } },
    select: { id: true, busId: true },
  });
}

/** GET /api/v1/partner/trips/:tripId/seats */
export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const auth = await requirePartnerApiKey(request);
  if (!auth.ok) return auth.response;

  const { tripId } = await context.params;
  const trip = await loadOwnTrip(auth.partner.id, tripId);
  if (!trip) {
    return NextResponse.json(
      { success: false, message: "Trip not found." },
      { status: 404 },
    );
  }

  await provisionTripSeats(trip.id);
  const [seats, holds] = await Promise.all([
    prisma.tripSeat.findMany({
      where: { tripId: trip.id },
      orderBy: { seatNumber: "asc" },
    }),
    prisma.partnerSeatHold.findMany({
      where: { tripId: trip.id },
      select: { seatNumber: true },
    }),
  ]);
  const held = new Set(holds.map((h) => h.seatNumber));

  return NextResponse.json({
    success: true,
    data: seats.map((s) => ({
      seatNumber: s.seatNumber,
      status: held.has(s.seatNumber) ? "RESERVED" : s.status,
      bookingId: s.bookingId,
    })),
  });
}

/**
 * PUT /api/v1/partner/trips/:tripId/seats
 * Push GDS availability. TicketPass LOCKED/BOOKED (our sale) is never overwritten.
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  const auth = await requirePartnerApiKey(request);
  if (!auth.ok) return auth.response;

  const { tripId } = await context.params;
  const trip = await loadOwnTrip(auth.partner.id, tripId);
  if (!trip) {
    return NextResponse.json(
      { success: false, message: "Trip not found." },
      { status: 404 },
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

  if (!Array.isArray(body.seats)) {
    return NextResponse.json(
      { success: false, message: "seats array is required." },
      { status: 400 },
    );
  }

  await provisionTripSeats(trip.id);

  const skipped: { seatNumber: string; reason: string }[] = [];
  let updated = 0;

  for (const raw of body.seats as Record<string, unknown>[]) {
    const seatNumber = String(raw.seatNumber ?? "").trim();
    const statusRaw = String(raw.status ?? "")
      .trim()
      .toUpperCase();
    const status = statusRaw as TripSeatStatus;
    if (!seatNumber || !SYNCABLE.has(status)) {
      skipped.push({
        seatNumber: seatNumber || "?",
        reason: "status must be AVAILABLE or BOOKED",
      });
      continue;
    }

    const current = await prisma.tripSeat.findUnique({
      where: { tripId_seatNumber: { tripId: trip.id, seatNumber } },
    });
    if (!current) {
      skipped.push({ seatNumber, reason: "unknown seat" });
      continue;
    }

    if (current.status === TripSeatStatus.LOCKED) {
      skipped.push({ seatNumber, reason: "held on TicketPass" });
      continue;
    }
    if (
      current.status === TripSeatStatus.BOOKED &&
      current.bookingId &&
      status === TripSeatStatus.AVAILABLE
    ) {
      skipped.push({
        seatNumber,
        reason: "sold on TicketPass",
      });
      continue;
    }

    await prisma.tripSeat.update({
      where: { id: current.id },
      data: {
        status,
        ...(status === TripSeatStatus.AVAILABLE
          ? { bookingId: null, lockedByUserId: null, lockedUntil: null }
          : {}),
      },
    });
    updated += 1;
  }

  return NextResponse.json({
    success: true,
    data: { updated, skipped },
  });
}
