import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  BookingCancelError,
  cancelBookedSeats,
} from "@/lib/booking-cancel";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ pnr: string }> };

/**
 * POST /api/account/bookings/:pnr/cancel
 * Body: { seatNumbers: string[] }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Please sign in." },
        { status: 401 },
      );
    }

    const { pnr } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const result = await cancelBookedSeats({
      actor: { type: "passenger", userId: session.id },
      pnr: decodeURIComponent(pnr),
      seatNumbers: (body as { seatNumbers?: unknown })?.seatNumbers,
    });

    return NextResponse.json({
      success: true,
      message:
        result.refundedAmount > 0
          ? `${result.companyName} cancelled seat ${result.cancelledSeats.join(", ")} at ${result.refundPercent}% — Rs ${result.refundedAmount} refunded to your wallet.`
          : `${result.companyName} cancelled seat ${result.cancelledSeats.join(", ")}. This slab has no refund.`,
      data: result,
    });
  } catch (error) {
    if (error instanceof BookingCancelError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.statusCode },
      );
    }
    console.error("[POST /api/account/bookings/:pnr/cancel]", error);
    return NextResponse.json(
      { success: false, message: "Could not cancel that seat." },
      { status: 500 },
    );
  }
}
