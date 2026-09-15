import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminJwtResponse, requireAdminJwt } from "@/lib/rbac";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminJwt();
  if (!auth.ok) return adminJwtResponse(auth);

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
