import { NextRequest, NextResponse } from "next/server";
import { getPartnerUser } from "@/lib/admin-auth";
import { normalizeFeatures, photoPublicUrl } from "@/lib/bus-catalog";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function ownBus(partnerId: string, id: string) {
  return prisma.bus.findFirst({
    where: { id, operatorId: partnerId },
    include: {
      photos: {
        select: { id: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

/** PATCH /api/partner/buses/:id — update facilities. */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const existing = await ownBus(partner.id, id);
  if (!existing) {
    return NextResponse.json(
      { success: false, message: "Bus not found." },
      { status: 404 },
    );
  }

  try {
    const body = (await request.json()) as { features?: unknown };
    const features = normalizeFeatures(body.features);
    const bus = await prisma.bus.update({
      where: { id: existing.id },
      data: { features },
      include: {
        photos: {
          select: { id: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: bus.id,
        busNumber: bus.busNumber,
        layoutType: bus.layoutType,
        totalSeats: bus.totalSeats,
        features: bus.features,
        photos: bus.photos.map((p) => ({
          id: p.id,
          url: photoPublicUrl(p.id),
        })),
      },
    });
  } catch (error) {
    console.error("[PATCH /api/partner/buses/:id]", error);
    return NextResponse.json(
      { success: false, message: "Could not update bus." },
      { status: 500 },
    );
  }
}
