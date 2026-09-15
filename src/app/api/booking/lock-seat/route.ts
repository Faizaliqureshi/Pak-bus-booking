import { NextRequest, NextResponse } from "next/server";
import { TripSeatStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { markTripSeatLocked } from "@/lib/trip-inventory";
import {
  SEAT_LOCK_TTL_SECONDS,
  bookingSeatLockKey,
  getUpstashRedis,
} from "@/lib/upstash";

export const runtime = "nodejs";

const LOCK_HELD_MESSAGE = "Seat is temporarily locked by another user";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * POST /api/booking/lock-seat
 * Body: { tripId, seatNumber, userId }
 *
 * Atomic SET NX + EX 600s on lock:trip:{tripId}:seat:{seatNumber}.
 * GET-then-SET is not used — that race would let two users lock the same seat.
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

    const { tripId, seatNumber, userId } = (body ?? {}) as Record<
      string,
      unknown
    >;

    if (
      !isNonEmptyString(tripId) ||
      !isNonEmptyString(seatNumber) ||
      !isNonEmptyString(userId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "tripId, seatNumber, and userId are required.",
        },
        { status: 400 },
      );
    }

    const trip = tripId.trim();
    const seat = seatNumber.trim();
    const holder = userId.trim();

    const inventory = await prisma.tripSeat.findUnique({
      where: { tripId_seatNumber: { tripId: trip, seatNumber: seat } },
      select: { status: true },
    });
    if (inventory?.status === TripSeatStatus.BOOKED) {
      return NextResponse.json(
        { success: false, message: "Seat is already booked." },
        { status: 409 },
      );
    }

    const key = bookingSeatLockKey(trip, seat);
    const redis = getUpstashRedis();

    const acquired = await redis.set(key, holder, {
      nx: true,
      ex: SEAT_LOCK_TTL_SECONDS,
    });

    if (acquired === "OK") {
      await markTripSeatLocked(trip, seat, holder).catch((err) => {
        console.error("[POST /api/booking/lock-seat] tripSeat mirror", err);
      });
      return NextResponse.json(
        {
          success: true,
          message: "Seat locked successfully.",
          data: {
            tripId: trip,
            seatNumber: seat,
            userId: holder,
            ttlSeconds: SEAT_LOCK_TTL_SECONDS,
            key,
          },
        },
        { status: 200 },
      );
    }

    const currentHolder = await redis.get<string>(key);
    if (currentHolder === holder) {
      await redis.expire(key, SEAT_LOCK_TTL_SECONDS);
      await markTripSeatLocked(trip, seat, holder).catch((err) => {
        console.error("[POST /api/booking/lock-seat] tripSeat mirror", err);
      });
      return NextResponse.json(
        {
          success: true,
          message: "Seat lock extended.",
          data: {
            tripId: trip,
            seatNumber: seat,
            userId: holder,
            ttlSeconds: SEAT_LOCK_TTL_SECONDS,
            key,
            extended: true,
          },
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { success: false, message: LOCK_HELD_MESSAGE },
      { status: 400 },
    );
  } catch (error) {
    console.error("[POST /api/booking/lock-seat]", error);
    const message =
      error instanceof Error && error.message.includes("UPSTASH_REDIS")
        ? error.message
        : "Failed to lock seat.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
