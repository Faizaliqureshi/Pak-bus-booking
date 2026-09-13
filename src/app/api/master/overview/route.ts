import { NextResponse } from "next/server";
import { PaymentStatus, UserRole } from "@prisma/client";
import { getAdminUser } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/master/overview
 * Platform-wide staff, fleet, bookings, and finance snapshot for Master portal.
 */
export async function GET() {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const [
      admins,
      partners,
      conductors,
      buses,
      bookingCounts,
      revenueAgg,
      pendingAgg,
      recentBookings,
      walletAgg,
    ] = await Promise.all([
      prisma.user.findMany({
        where: { role: UserRole.ADMIN },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          createdUsers: {
            where: { role: UserRole.OPERATOR },
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.user.findMany({
        where: { role: UserRole.OPERATOR },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          createdBy: { select: { id: true, name: true, email: true, role: true } },
          operatedBuses: {
            select: {
              id: true,
              busNumber: true,
              layoutType: true,
              totalSeats: true,
              _count: { select: { trips: true } },
            },
          },
          createdUsers: {
            where: { role: UserRole.CONDUCTOR },
            select: { id: true, name: true, email: true, phone: true },
          },
        },
      }),
      prisma.user.findMany({
        where: { role: UserRole.CONDUCTOR },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          createdBy: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.bus.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          busNumber: true,
          layoutType: true,
          totalSeats: true,
          createdAt: true,
          operator: { select: { id: true, name: true, email: true } },
          _count: { select: { trips: true } },
        },
      }),
      prisma.booking.groupBy({
        by: ["paymentStatus"],
        _count: { _all: true },
      }),
      prisma.booking.aggregate({
        where: { paymentStatus: PaymentStatus.PAID },
        _sum: { totalPrice: true },
        _count: { _all: true },
      }),
      prisma.booking.aggregate({
        where: { paymentStatus: PaymentStatus.PENDING },
        _sum: { totalPrice: true },
        _count: { _all: true },
      }),
      prisma.booking.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          pnr: true,
          totalPrice: true,
          paymentStatus: true,
          paymentMethod: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
          trip: {
            select: {
              departureTime: true,
              bus: {
                select: {
                  busNumber: true,
                  operator: { select: { name: true } },
                },
              },
              route: {
                select: { originCity: true, destinationCity: true },
              },
            },
          },
        },
      }),
      prisma.wallet.aggregate({
        _sum: { balance: true },
        _count: { _all: true },
      }),
    ]);

    const statusMap = Object.fromEntries(
      bookingCounts.map((row) => [row.paymentStatus, row._count._all]),
    ) as Record<string, number>;

    const totalStaff = admins.length + partners.length + conductors.length;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalStaff,
          admins: admins.length,
          partners: partners.length,
          conductors: conductors.length,
          fleetBuses: buses.length,
          fleetSeats: buses.reduce((sum, b) => sum + b.totalSeats, 0),
          bookingsPaid: statusMap.PAID ?? 0,
          bookingsPending: statusMap.PENDING ?? 0,
          bookingsFailed: statusMap.FAILED ?? 0,
          bookingsRefunded: statusMap.REFUNDED ?? 0,
          bookingsTotal: Object.values(statusMap).reduce((a, b) => a + b, 0),
        },
        finance: {
          paidRevenue: Number(revenueAgg._sum.totalPrice ?? 0),
          paidBookings: revenueAgg._count._all,
          pendingValue: Number(pendingAgg._sum.totalPrice ?? 0),
          pendingBookings: pendingAgg._count._all,
          walletAccounts: walletAgg._count._all,
          walletBalancesTotal: Number(walletAgg._sum.balance ?? 0),
        },
        admins: admins.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          phone: a.phone,
          createdAt: a.createdAt.toISOString(),
          partners: a.createdUsers,
          partnersCount: a.createdUsers.length,
        })),
        partners: partners.map((p) => ({
          id: p.id,
          name: p.name,
          email: p.email,
          phone: p.phone,
          createdAt: p.createdAt.toISOString(),
          createdBy: p.createdBy,
          buses: p.operatedBuses.map((b) => ({
            id: b.id,
            busNumber: b.busNumber,
            layoutType: b.layoutType,
            totalSeats: b.totalSeats,
            tripsCount: b._count.trips,
          })),
          busCount: p.operatedBuses.length,
          conductors: p.createdUsers,
          conductorsCount: p.createdUsers.length,
        })),
        conductors: conductors.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          createdAt: c.createdAt.toISOString(),
          createdBy: c.createdBy,
        })),
        fleet: buses.map((b) => ({
          id: b.id,
          busNumber: b.busNumber,
          layoutType: b.layoutType,
          totalSeats: b.totalSeats,
          tripsCount: b._count.trips,
          createdAt: b.createdAt.toISOString(),
          operator: b.operator,
        })),
        recentBookings: recentBookings.map((b) => ({
          id: b.id,
          pnr: b.pnr,
          totalPrice: Number(b.totalPrice),
          paymentStatus: b.paymentStatus,
          paymentMethod: b.paymentMethod,
          createdAt: b.createdAt.toISOString(),
          passenger: b.user,
          operatorName: b.trip.bus.operator.name,
          busNumber: b.trip.bus.busNumber,
          route: `${b.trip.route.originCity} → ${b.trip.route.destinationCity}`,
          departureTime: b.trip.departureTime.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("[GET /api/master/overview]", error);
    return NextResponse.json(
      { success: false, message: "Could not load master overview." },
      { status: 500 },
    );
  }
}
