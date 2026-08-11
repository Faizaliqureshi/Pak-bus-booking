import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generatePnr } from "@/lib/checkout-utils";
import { buildSeatLockKey } from "@/lib/redis-lock";
import { getRedis } from "@/lib/redis";

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
 * Creates a PENDING booking from Redis-held seats and redirects client to checkout.
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

    const redis = getRedis();
    const lockExpiryCandidates: number[] = [];

    for (const seat of seats) {
      const key = buildSeatLockKey(tripId.trim(), seat);
      const holder = await redis.get(key);
      if (holder !== userId.trim()) {
        return NextResponse.json(
          {
            success: false,
            message: `Seat ${seat} is not locked by you. Please reselect seats.`,
          },
          { status: 409 },
        );
      }
      const ttl = await redis.ttl(key);
      if (ttl > 0) {
        lockExpiryCandidates.push(Date.now() + ttl * 1000);
      }
    }

    const dbLocks = await prisma.seatLock.findMany({
      where: {
        tripId: tripId.trim(),
        userId: userId.trim(),
        seatNumber: { in: seats },
      },
    });

    for (const lock of dbLocks) {
      lockExpiryCandidates.push(lock.expiresAt.getTime());
    }

    if (lockExpiryCandidates.length === 0) {
      return NextResponse.json(
        { success: false, message: "Seat locks have expired." },
        { status: 409 },
      );
    }

    const lockExpiresAt = new Date(Math.min(...lockExpiryCandidates));
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
