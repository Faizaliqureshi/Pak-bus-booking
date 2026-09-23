import { NextRequest, NextResponse } from "next/server";
import { lockSeat } from "@/lib/redis-lock";

export const runtime = "nodejs";

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

    const result = await lockSeat(
      tripId.trim(),
      seatNumber.trim(),
      userId.trim(),
    );
    if (!result.success) {
      const conflict =
        result.message.includes("reserved") ||
        result.message.includes("booked") ||
        result.message.includes("held");
      return NextResponse.json(result, { status: conflict ? 409 : 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.extended
        ? "Seat lock extended."
        : "Seat locked successfully.",
      data: {
        tripId: result.tripId,
        seatNumber: result.seatNumber,
        userId: result.userId,
        ttlSeconds: result.ttlSeconds,
        lockToken: result.lockToken,
        extended: result.extended,
      },
    });
  } catch (error) {
    console.error("[POST /api/booking/lock-seat]", error);
    return NextResponse.json(
      { success: false, message: "Failed to lock seat." },
      { status: 500 },
    );
  }
}
