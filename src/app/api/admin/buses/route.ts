import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { isAllowedBusLayoutType } from "@/lib/booking-utils";
import { prisma } from "@/lib/prisma";
import { adminJwtResponse, requireAdminJwt } from "@/lib/rbac";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminJwt();
  if (!auth.ok) return adminJwtResponse(auth);

  const buses = await prisma.bus.findMany({
    include: {
      operator: { select: { id: true, name: true } },
      _count: { select: { trips: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: buses.map((b) => ({
      id: b.id,
      busNumber: b.busNumber,
      layoutType: b.layoutType,
      totalSeats: b.totalSeats,
      createdAt: b.createdAt.toISOString(),
      operator: b.operator,
      tripCount: b._count.trips,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminJwt();
  if (!auth.ok) return adminJwtResponse(auth);
  const admin = auth.user;

  const body = await request.json();
  const busNumber = String(body.busNumber ?? "").trim().toUpperCase();
  const layoutType = String(body.layoutType ?? "").trim();
  const totalSeats = Number(body.totalSeats);
  let operatorId = String(body.operatorId ?? "").trim();

  if (!busNumber || !layoutType || !Number.isInteger(totalSeats) || totalSeats < 1) {
    return NextResponse.json(
      {
        success: false,
        message: "busNumber, layoutType, and totalSeats are required.",
      },
      { status: 400 },
    );
  }

  if (!isAllowedBusLayoutType(layoutType)) {
    return NextResponse.json(
      {
        success: false,
        message: "layoutType must be 2x2, 2x1, or 2x1_SLEEPER.",
      },
      { status: 400 },
    );
  }

  if (!operatorId) {
    operatorId = admin.id;
    if (admin.role === UserRole.ADMIN) {
      const operator = await prisma.user.findFirst({
        where: { role: UserRole.OPERATOR },
      });
      if (operator) operatorId = operator.id;
    }
  }

  try {
    const bus = await prisma.bus.create({
      data: {
        busNumber,
        layoutType,
        totalSeats,
        operatorId,
      },
      include: {
        operator: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: bus }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, message: "Bus number may already exist." },
      { status: 409 },
    );
  }
}
