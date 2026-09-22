import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { getPartnerUser } from "@/lib/admin-auth";
import { partnerTrip, tripSeatSnapshot } from "@/lib/partner-ops";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tripId: string }> };

/** GET /api/partner/trips/:tripId — seat map + paid bookings. */
export async function GET(_request: Request, context: RouteContext) {
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

  const [snapshot, bookings] = await Promise.all([
    tripSeatSnapshot(trip.id, trip.bus.totalSeats),
    prisma.booking.findMany({
      where: { tripId: trip.id, paymentStatus: PaymentStatus.PAID },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        tickets: {
          select: {
            seatNumber: true,
            passengerName: true,
            passengerGender: true,
          },
          orderBy: { seatNumber: "asc" },
        },
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      trip: {
        id: trip.id,
        busId: trip.bus.id,
        busNumber: trip.bus.busNumber,
        totalSeats: trip.bus.totalSeats,
        layoutType: trip.bus.layoutType,
        routeName: trip.route.name,
        originCity: trip.route.originCity,
        destinationCity: trip.route.destinationCity,
        departureTime: trip.departureTime.toISOString(),
        arrivalTime: trip.arrivalTime.toISOString(),
        basePrice: Number(trip.basePrice),
      },
      seats: snapshot.seats,
      bookings: bookings.map((b) => ({
        id: b.id,
        pnr: b.pnr,
        totalPrice: Number(b.totalPrice),
        paymentMethod: b.paymentMethod,
        createdAt: b.createdAt.toISOString(),
        passenger: b.user.name,
        email: b.user.email,
        phone: b.user.phone ?? b.contactPhone,
        seats: b.tickets.map((t) => t.seatNumber),
        passengers: b.tickets.map((t) => ({
          seatNumber: t.seatNumber,
          name: t.passengerName,
          gender: t.passengerGender,
        })),
      })),
    },
  });
}
