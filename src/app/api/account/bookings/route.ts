import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { cityCode, formatDuration } from "@/lib/booking-utils";
import {
  getCompanyPolicy,
  quoteCompanyRefund,
} from "@/lib/cancel-policy";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function operatorLabel(name: string): string {
  return name.replace(/\s+Operator$/i, "").trim();
}

/**
 * GET /api/account/bookings
 * Passenger's own bookings for Manage My Booking.
 */
export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Please sign in." },
        { status: 401 },
      );
    }

    const rows = await prisma.booking.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      include: {
        tickets: { select: { seatNumber: true }, orderBy: { seatNumber: "asc" } },
        trip: {
          include: {
            bus: {
              include: {
                operator: { select: { name: true } },
                reviews: {
                  where: { userId: session.id },
                  select: {
                    rating: true,
                    comment: true,
                    updatedAt: true,
                  },
                  take: 1,
                },
              },
            },
            route: {
              select: { originCity: true, destinationCity: true, name: true },
            },
          },
        },
      },
    });

    const now = Date.now();
    const bookings = await Promise.all(rows.map(async (b) => {
      const departure = b.trip.departureTime;
      const arrival = b.trip.arrivalTime;
      const issued = b.paymentStatus === PaymentStatus.PAID;
      const expired = arrival.getTime() < now;
      const seats = b.tickets.map((t) => t.seatNumber);
      const policy = await getCompanyPolicy(
        b.trip.bus.operatorId,
        operatorLabel(b.trip.bus.operator.name),
      );
      const quote = quoteCompanyRefund({
        policy,
        departure,
        fare: Number(b.totalPrice),
        actor: "passenger",
      });
      return {
        id: b.id,
        pnr: b.pnr,
        paymentStatus: b.paymentStatus,
        totalPrice: Number(b.totalPrice),
        seats,
        cancellable: issued && quote.allowed,
        refundPercent: quote.refundPercent,
        estimatedRefund: quote.refundAmount,
        cancelReason: quote.reason,
        policyNote: policy.note,
        cutoffHours: policy.cutoffHours,
        createdAt: b.createdAt.toISOString(),
        departureTime: departure.toISOString(),
        arrivalTime: arrival.toISOString(),
        duration: formatDuration(arrival.getTime() - departure.getTime()),
        originCity: b.trip.route.originCity,
        destinationCity: b.trip.route.destinationCity,
        originCode: cityCode(b.trip.route.originCity),
        destinationCode: cityCode(b.trip.route.destinationCity),
        operatorName: operatorLabel(b.trip.bus.operator.name),
        busId: b.trip.bus.id,
        busNumber: b.trip.bus.busNumber,
        routeName: b.trip.route.name,
        issued,
        expired,
        review: b.trip.bus.reviews[0]
          ? {
              rating: b.trip.bus.reviews[0].rating,
              comment: b.trip.bus.reviews[0].comment,
              updatedAt: b.trip.bus.reviews[0].updatedAt.toISOString(),
            }
          : null,
      };
    }));

    return NextResponse.json({ success: true, data: { bookings } });
  } catch (error) {
    console.error("[GET /api/account/bookings]", error);
    return NextResponse.json(
      { success: false, message: "Could not load bookings." },
      { status: 500 },
    );
  }
}
