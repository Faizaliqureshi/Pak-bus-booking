import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { cityCode, formatDuration } from "@/lib/booking-utils";
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
        trip: {
          include: {
            bus: {
              include: { operator: { select: { name: true } } },
            },
            route: {
              select: { originCity: true, destinationCity: true, name: true },
            },
          },
        },
      },
    });

    const now = Date.now();
    const bookings = rows.map((b) => {
      const departure = b.trip.departureTime;
      const arrival = b.trip.arrivalTime;
      const issued = b.paymentStatus === PaymentStatus.PAID;
      const expired = arrival.getTime() < now;
      return {
        id: b.id,
        pnr: b.pnr,
        paymentStatus: b.paymentStatus,
        createdAt: b.createdAt.toISOString(),
        departureTime: departure.toISOString(),
        arrivalTime: arrival.toISOString(),
        duration: formatDuration(arrival.getTime() - departure.getTime()),
        originCity: b.trip.route.originCity,
        destinationCity: b.trip.route.destinationCity,
        originCode: cityCode(b.trip.route.originCity),
        destinationCode: cityCode(b.trip.route.destinationCity),
        operatorName: operatorLabel(b.trip.bus.operator.name),
        busNumber: b.trip.bus.busNumber,
        routeName: b.trip.route.name,
        issued,
        expired,
      };
    });

    return NextResponse.json({ success: true, data: { bookings } });
  } catch (error) {
    console.error("[GET /api/account/bookings]", error);
    return NextResponse.json(
      { success: false, message: "Could not load bookings." },
      { status: 500 },
    );
  }
}
