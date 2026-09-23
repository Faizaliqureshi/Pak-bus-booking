import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generatePnr } from "@/lib/checkout-utils";
import { verifySeatsHeldByUser } from "@/lib/trip-inventory";

export const runtime = "nodejs";

interface CreateCheckoutBody {
  tripId: string;
  userId: string;
  seatNumbers: string[];
  boardingStopId: string;
  dropStopId: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * POST /api/checkout/create
 * Creates a PENDING booking from Neon-held seats and redirects client to checkout.
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const { tripId, userId, seatNumbers, boardingStopId, dropStopId } =
      (body ?? {}) as Partial<CreateCheckoutBody>;

    if (
      !isNonEmptyString(tripId) ||
      !isNonEmptyString(userId) ||
      !isNonEmptyString(boardingStopId) ||
      !isNonEmptyString(dropStopId) ||
      !Array.isArray(seatNumbers) ||
      seatNumbers.length === 0 ||
      !seatNumbers.every(isNonEmptyString)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "tripId, userId, boardingStopId, dropStopId, and seatNumbers are required.",
        },
        { status: 400 },
      );
    }

    const seats = [...new Set(seatNumbers.map((s) => s.trim()))].sort(
      (a, b) => Number(a) - Number(b),
    );

    const trip = await prisma.trip.findUnique({
      where: { id: tripId.trim() },
      include: {
        route: {
          include: { stops: true },
        },
      },
    });

    if (!trip) {
      return NextResponse.json(
        { success: false, message: "Trip not found." },
        { status: 404 },
      );
    }

    const boarding = trip.route.stops.find((s) => s.id === boardingStopId);
    const drop = trip.route.stops.find((s) => s.id === dropStopId);
    if (!boarding || !drop || boarding.stopOrder >= drop.stopOrder) {
      return NextResponse.json(
        { success: false, message: "Invalid boarding/drop stops." },
        { status: 400 },
      );
    }

    const held = await prisma.partnerSeatHold.findMany({
      where: { tripId: tripId.trim(), seatNumber: { in: seats } },
      select: { seatNumber: true },
    });
    if (held.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Seat ${held.map((h) => h.seatNumber).join(", ")} is reserved by the operator.`,
        },
        { status: 409 },
      );
    }

    const ownership = await verifySeatsHeldByUser(
      tripId.trim(),
      seats,
      userId.trim(),
    );
    if (!ownership.ok) {
      return NextResponse.json(
        {
          success: false,
          message: `Seat ${ownership.seatNumber} is not locked by you. Please reselect seats.`,
        },
        { status: 409 },
      );
    }

    const lockExpiresAt = ownership.expiresAt;
    if (lockExpiresAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { success: false, message: "Seat locks have expired." },
        { status: 409 },
      );
    }

    const totalPrice = Number(trip.basePrice) * seats.length;
    let pnr = generatePnr();
    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = await prisma.booking.findUnique({ where: { pnr } });
      if (!exists) break;
      pnr = generatePnr();
    }

    const booking = await prisma.booking.create({
      data: {
        pnr,
        userId: userId.trim(),
        tripId: tripId.trim(),
        totalPrice,
        paymentStatus: PaymentStatus.PENDING,
        heldSeats: seats.join(","),
        boardingStopId: boardingStopId.trim(),
        dropStopId: dropStopId.trim(),
        lockExpiresAt,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          bookingId: booking.id,
          pnr: booking.pnr,
          lockExpiresAt: booking.lockExpiresAt?.toISOString(),
          checkoutUrl: `/checkout/${booking.id}`,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/checkout/create]", error);
    return NextResponse.json(
      { success: false, message: "Failed to start checkout." },
      { status: 500 },
    );
  }
}
