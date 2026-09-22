import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { getPartnerUser } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** GET /api/partner/trips — live departures with paid + reserved counts. */
export async function GET() {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const trips = await prisma.trip.findMany({
    where: { bus: { operatorId: partner.id } },
    include: {
      bus: { select: { id: true, busNumber: true, totalSeats: true } },
      route: {
        select: { name: true, originCity: true, destinationCity: true },
      },
      _count: {
        select: {
          bookings: { where: { paymentStatus: PaymentStatus.PAID } },
          seatHolds: true,
        },
      },
    },
    orderBy: { departureTime: "desc" },
    take: 80,
  });

  return NextResponse.json({
    success: true,
    data: trips.map((t) => ({
      id: t.id,
      busId: t.bus.id,
      busNumber: t.bus.busNumber,
      totalSeats: t.bus.totalSeats,
      routeName: t.route.name,
      originCity: t.route.originCity,
      destinationCity: t.route.destinationCity,
      departureTime: t.departureTime.toISOString(),
      arrivalTime: t.arrivalTime.toISOString(),
      basePrice: Number(t.basePrice),
      paidBookings: t._count.bookings,
      reservedSeats: t._count.seatHolds,
    })),
  });
}
