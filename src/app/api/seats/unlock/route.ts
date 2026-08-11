import { NextRequest, NextResponse } from "next/server";
import { unlockSeat } from "@/lib/redis-lock";

export const runtime = "nodejs";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * POST /api/seats/unlock
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

    const result = await unlockSeat(
      tripId.trim(),
      seatNumber.trim(),
      userId.trim(),
    );

    if (!result.success) {
      const status =
        result.message === "Seat held by another passenger."
          ? 409
          : result.message.includes("No active lock")
            ? 404
            : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[POST /api/seats/unlock]", error);
    return NextResponse.json(
      { success: false, message: "Failed to unlock seat." },
      { status: 500 },
    );
  }
}
