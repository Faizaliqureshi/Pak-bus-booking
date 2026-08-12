import { NextRequest, NextResponse } from "next/server";
import { getPartnerUser } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const buses = await prisma.bus.findMany({
    where: { operatorId: partner.id },
    include: { _count: { select: { trips: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: buses.map((b) => ({
      id: b.id,
      busNumber: b.busNumber,
      layoutType: b.layoutType,
      totalSeats: b.totalSeats,
      tripCount: b._count.trips,
      createdAt: b.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const busNumber = String(body.busNumber ?? "").trim().toUpperCase();
  const layoutType = String(body.layoutType ?? "").trim();
  const totalSeats = Number(body.totalSeats);

  if (!busNumber || !layoutType || !Number.isInteger(totalSeats) || totalSeats < 1) {
    return NextResponse.json(
      { success: false, message: "busNumber, layoutType, and totalSeats are required." },
      { status: 400 },
    );
  }
  if (!["2x2", "2x1_SLEEPER"].includes(layoutType)) {
    return NextResponse.json(
      { success: false, message: "layoutType must be 2x2 or 2x1_SLEEPER." },
      { status: 400 },
    );
  }

  try {
    const bus = await prisma.bus.create({
      data: {
        busNumber,
        layoutType,
        totalSeats,
        operatorId: partner.id,
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
