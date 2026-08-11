import { NextRequest, NextResponse } from "next/server";
import {
  getAvailableSeatsForSegment,
  SeatAvailabilityError,
} from "@/lib/seat-availability";

export const runtime = "nodejs";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

type RouteContext = {
  params: Promise<{ tripId: string }>;
};

/**
 * GET /api/trips/[tripId]/seats?boardingStopId=&dropStopId=&userId=
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { tripId } = await context.params;
    const { searchParams } = request.nextUrl;
    const boardingStopId = searchParams.get("boardingStopId");
    const dropStopId = searchParams.get("dropStopId");
    const userId = searchParams.get("userId") ?? undefined;

    if (!isNonEmptyString(tripId)) {
      return NextResponse.json(
        { success: false, message: "tripId is required." },
        { status: 400 },
      );
    }

    if (!isNonEmptyString(boardingStopId) || !isNonEmptyString(dropStopId)) {
      return NextResponse.json(
        {
          success: false,
          message: "boardingStopId and dropStopId are required.",
        },
        { status: 400 },
      );
    }

    const data = await getAvailableSeatsForSegment(
      tripId.trim(),
      boardingStopId.trim(),
      dropStopId.trim(),
      userId?.trim() || undefined,
    );

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    if (error instanceof SeatAvailabilityError) {
      return NextResponse.json(
        { success: false, message: error.message, code: error.code },
        { status: error.statusCode },
      );
    }

    console.error("[GET /api/trips/[tripId]/seats]", error);
    return NextResponse.json(
      { success: false, message: "Failed to load seat availability." },
      { status: 500 },
    );
  }
}
