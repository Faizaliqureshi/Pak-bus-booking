import { NextRequest, NextResponse } from "next/server";
import { getPartnerUser } from "@/lib/admin-auth";
import {
  BookingCancelError,
  cancelBookedSeats,
} from "@/lib/booking-cancel";
import { partnerTrip, tripSeatSnapshot } from "@/lib/partner-ops";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tripId: string }> };

/**
 * POST /api/partner/trips/:tripId/cancel-seats
 * Body: { seatNumbers: string[] }
 */
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

  try {
    const result = await cancelBookedSeats({
      actor: { type: "partner", userId: partner.id },
      tripId: trip.id,
      seatNumbers: (body as { seatNumbers?: unknown })?.seatNumbers,
    });
    const next = await tripSeatSnapshot(trip.id, trip.bus.totalSeats);
    return NextResponse.json({
      success: true,
      message:
        result.refundedAmount > 0
          ? `Seat ${result.cancelledSeats.join(", ")} cancelled under ${result.companyName} rules (${result.refundPercent}% / Rs ${result.refundedAmount} to passenger wallet).`
          : `Seat ${result.cancelledSeats.join(", ")} cancelled under ${result.companyName} rules. This slab has no refund.`,
      data: { ...result, seats: next.seats },
    });
  } catch (error) {
    if (error instanceof BookingCancelError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.statusCode },
      );
    }
    console.error("[POST /api/partner/trips/:id/cancel-seats]", error);
    return NextResponse.json(
      { success: false, message: "Could not cancel that seat." },
      { status: 500 },
    );
  }
}
