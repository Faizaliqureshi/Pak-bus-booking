import { NextRequest, NextResponse } from "next/server";
import { getPartnerUser } from "@/lib/admin-auth";
import {
  MAX_BUS_PHOTOS,
  photoPublicUrl,
  readUploadedPhotos,
  toPrismaBytes,
} from "@/lib/bus-catalog";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/partner/buses/:id/photos — add coach pictures. */
export async function POST(request: NextRequest, context: RouteContext) {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const bus = await prisma.bus.findFirst({
    where: { id, operatorId: partner.id },
    include: {
      photos: { select: { id: true, sortOrder: true } },
    },
  });
  if (!bus) {
    return NextResponse.json(
      { success: false, message: "Bus not found." },
      { status: 404 },
    );
  }

  try {
    const form = await request.formData();
    const photos = await readUploadedPhotos(form.getAll("photos"));
    if (photos.length === 0) {
      return NextResponse.json(
        { success: false, message: "Choose at least one picture." },
        { status: 400 },
      );
    }
    if (bus.photos.length + photos.length > MAX_BUS_PHOTOS) {
      return NextResponse.json(
        {
          success: false,
          message: `A bus can have at most ${MAX_BUS_PHOTOS} pictures.`,
        },
        { status: 400 },
      );
    }

    const start =
      bus.photos.reduce((max, p) => Math.max(max, p.sortOrder), -1) + 1;
    const created = await prisma.$transaction(
      photos.map((photo, i) =>
        prisma.busPhoto.create({
          data: {
            busId: bus.id,
            mimeType: photo.mimeType,
            data: toPrismaBytes(photo.data),
            sortOrder: start + i,
          },
          select: { id: true },
        }),
      ),
    );

    return NextResponse.json({
      success: true,
      data: created.map((p) => ({ id: p.id, url: photoPublicUrl(p.id) })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not upload pictures.";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
