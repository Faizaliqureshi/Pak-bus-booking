import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    take: 12,
    orderBy: { createdAt: "desc" },
    include: {
      tickets: { take: 1, orderBy: { seatNumber: "asc" } },
      trip: {
        include: {
          route: true,
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    data: bookings.map((b) => ({
      id: b.id,
      pnr: b.pnr,
      passengerName: b.tickets[0]?.passengerName ?? "—",
      route: `${b.trip.route.originCity} → ${b.trip.route.destinationCity}`,
      totalPrice: Number(b.totalPrice),
      paymentStatus: b.paymentStatus,
      createdAt: b.createdAt.toISOString(),
    })),
  });
}
