import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { getPartnerUser } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** GET /api/partner/bookings — paid TicketPass bookings on this partner's fleet. */
export async function GET() {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const bookings = await prisma.booking.findMany({
    where: {
      paymentStatus: PaymentStatus.PAID,
      trip: { bus: { operatorId: partner.id } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { name: true, email: true, phone: true } },
      tickets: {
        select: { seatNumber: true, passengerName: true },
        orderBy: { seatNumber: "asc" },
      },
      trip: {
        select: {
          id: true,
          departureTime: true,
          bus: { select: { id: true, busNumber: true } },
          route: { select: { originCity: true, destinationCity: true } },
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    data: bookings.map((b) => ({
      id: b.id,
      pnr: b.pnr,
      totalPrice: Number(b.totalPrice),
      paymentMethod: b.paymentMethod,
      createdAt: b.createdAt.toISOString(),
      passenger: b.user.name,
      email: b.user.email,
      phone: b.user.phone ?? b.contactPhone,
      seats: b.tickets.map((t) => t.seatNumber),
      tripId: b.trip.id,
      busId: b.trip.bus.id,
      busNumber: b.trip.bus.busNumber,
      originCity: b.trip.route.originCity,
      destinationCity: b.trip.route.destinationCity,
      departureTime: b.trip.departureTime.toISOString(),
    })),
  });
}
