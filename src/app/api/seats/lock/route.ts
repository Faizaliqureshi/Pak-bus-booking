import { NextRequest, NextResponse } from "next/server";
import { lockSeat } from "@/lib/redis-lock";

export const runtime = "nodejs";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * POST /api/seats/lock
 * Body: { tripId, seatNumber, userId }
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
      const status =
        result.message === "Seat held by another passenger." ? 409 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(
      {
        success: true,
        message: result.extended
          ? "Seat lock extended."
          : "Seat locked successfully.",
        data: {
          tripId: result.tripId,
          seatNumber: result.seatNumber,
          userId: result.userId,
          lockToken: result.lockToken,
          expiresAt: result.expiresAt.toISOString(),
          ttlSeconds: result.ttlSeconds,
          extended: result.extended,
        },
      },
      { status: result.extended ? 200 : 201 },
    );
  } catch (error) {
    console.error("[POST /api/seats/lock]", error);
    return NextResponse.json(
      { success: false, message: "Failed to lock seat." },
      { status: 500 },
    );
  }
}
