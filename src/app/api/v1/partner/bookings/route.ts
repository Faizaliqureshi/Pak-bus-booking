import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { parseHeldSeats } from "@/lib/checkout-utils";
import { requirePartnerApiKey } from "@/lib/partner-api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** GET /api/v1/partner/bookings — paid tickets sold on TicketPass for this operator */
export async function GET(request: NextRequest) {
  const auth = await requirePartnerApiKey(request);
  if (!auth.ok) return auth.response;

  const take = Math.min(
    100,
    Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 50)),
  );

  const bookings = await prisma.booking.findMany({
    where: {
      paymentStatus: PaymentStatus.PAID,
      trip: { bus: { operatorId: auth.partner.id } },
    },
    include: {
      tickets: {
        select: { seatNumber: true, passengerName: true, passengerGender: true },
      },
      trip: {
        select: {
          id: true,
          externalId: true,
          departureTime: true,
          bus: { select: { busNumber: true, externalId: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json({
    success: true,
    data: bookings.map((b) => ({
      id: b.id,
      pnr: b.pnr,
      paymentStatus: b.paymentStatus,
      totalFare: Number(b.totalPrice),
      seats: b.tickets.length
        ? b.tickets.map((t) => t.seatNumber)
        : parseHeldSeats(b.heldSeats),
      passengers: b.tickets,
      tripId: b.trip.id,
      tripExternalId: b.trip.externalId,
      busNumber: b.trip.bus.busNumber,
      busExternalId: b.trip.bus.externalId,
      departureTime: b.trip.departureTime.toISOString(),
      createdAt: b.createdAt.toISOString(),
    })),
  });
}
