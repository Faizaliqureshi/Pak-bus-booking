import { NextRequest, NextResponse } from "next/server";
import { getPartnerUser } from "@/lib/admin-auth";
import { partnerTrip, tripSeatSnapshot } from "@/lib/partner-ops";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tripId: string }> };

function seatList(body: unknown): string[] {
  const raw = (body as { seatNumbers?: unknown })?.seatNumbers;
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .map((s) => String(s ?? "").trim())
        .filter((s) => /^\d+$/.test(s)),
    ),
  ];
}

/** POST — reserve seats so passengers cannot book them. */
export async function POST(request: NextRequest, context: RouteContext) {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const { tripId } = await context.params;
  const trip = await partnerTrip(partner.id, tripId);
  if (!trip) {
    return NextResponse.json(
      { success: false, message: "Trip not found." },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const seatNumbers = seatList(body);
  if (seatNumbers.length === 0) {
    return NextResponse.json(
      { success: false, message: "seatNumbers are required." },
      { status: 400 },
    );
  }

  const snapshot = await tripSeatSnapshot(trip.id, trip.bus.totalSeats);
  const blocked = seatNumbers.filter((seat) => {
    const row = snapshot.seats.find((s) => s.seatNumber === seat);
    return !row || row.status === "PAID" || row.status === "LOCKED";
  });
  if (blocked.length > 0) {
    return NextResponse.json(
      {
        success: false,
        message: `Seat ${blocked.join(", ")} is already sold or held.`,
      },
      { status: 409 },
    );
  }

  try {
    await prisma.$transaction(
      seatNumbers.map((seatNumber) =>
        prisma.partnerSeatHold.upsert({
          where: { tripId_seatNumber: { tripId: trip.id, seatNumber } },
          create: {
            tripId: trip.id,
            operatorId: partner.id,
            seatNumber,
          },
          update: { operatorId: partner.id },
        }),
      ),
    );
  } catch (error) {
    console.error("[POST /api/partner/trips/:id/holds]", error);
    return NextResponse.json(
      { success: false, message: "Could not reserve that seat." },
      { status: 500 },
    );
  }

  const next = await tripSeatSnapshot(trip.id, trip.bus.totalSeats);
  return NextResponse.json({ success: true, data: { seats: next.seats } });
}

/** DELETE — release partner-reserved seats. */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const { tripId } = await context.params;
  const trip = await partnerTrip(partner.id, tripId);
  if (!trip) {
    return NextResponse.json(
      { success: false, message: "Trip not found." },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const seatNumbers = seatList(body);
  if (seatNumbers.length === 0) {
    return NextResponse.json(
      { success: false, message: "seatNumbers are required." },
      { status: 400 },
    );
  }

  await prisma.partnerSeatHold.deleteMany({
    where: {
      tripId: trip.id,
      operatorId: partner.id,
      seatNumber: { in: seatNumbers },
    },
  });

  const next = await tripSeatSnapshot(trip.id, trip.bus.totalSeats);
  return NextResponse.json({ success: true, data: { seats: next.seats } });
}
