import { NextRequest, NextResponse } from "next/server";
import { getPartnerUser } from "@/lib/admin-auth";
import { isAllowedBusLayoutType } from "@/lib/booking-utils";
import {
  MAX_BUS_PHOTOS,
  normalizeFeatures,
  photoPublicUrl,
  readUploadedPhotos,
} from "@/lib/bus-catalog";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function serializePartnerBus(bus: {
  id: string;
  busNumber: string;
  layoutType: string;
  totalSeats: number;
  features: string[];
  createdAt: Date;
  photos: { id: string }[];
  _count?: { trips: number };
}) {
  return {
    id: bus.id,
    busNumber: bus.busNumber,
    layoutType: bus.layoutType,
    totalSeats: bus.totalSeats,
    features: bus.features,
    photos: bus.photos.map((p) => ({
      id: p.id,
      url: photoPublicUrl(p.id),
    })),
    tripCount: bus._count?.trips ?? 0,
    createdAt: bus.createdAt.toISOString(),
  };
}

export async function GET() {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const buses = await prisma.bus.findMany({
    where: { operatorId: partner.id },
    include: {
      _count: { select: { trips: true } },
      photos: {
        select: { id: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: buses.map(serializePartnerBus),
  });
}

export async function POST(request: NextRequest) {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let busNumber = "";
  let layoutType = "";
  let totalSeats = 0;
  let features: string[] = [];
  let photos: { mimeType: string; data: Buffer }[] = [];

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      busNumber = String(form.get("busNumber") ?? "").trim().toUpperCase();
      layoutType = String(form.get("layoutType") ?? "").trim();
      totalSeats = Number(form.get("totalSeats"));
      features = normalizeFeatures(form.getAll("features"));
      photos = await readUploadedPhotos(form.getAll("photos"));
    } else {
      const body = await request.json();
      busNumber = String(body.busNumber ?? "").trim().toUpperCase();
      layoutType = String(body.layoutType ?? "").trim();
      totalSeats = Number(body.totalSeats);
      features = normalizeFeatures(body.features);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid bus details.";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }

  if (!busNumber || !layoutType || !Number.isInteger(totalSeats) || totalSeats < 1) {
    return NextResponse.json(
      { success: false, message: "busNumber, layoutType, and totalSeats are required." },
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
  if (photos.length > MAX_BUS_PHOTOS) {
    return NextResponse.json(
      {
        success: false,
        message: `A bus can have at most ${MAX_BUS_PHOTOS} pictures.`,
      },
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
        features,
        photos: {
          create: photos.map((photo, i) => ({
            mimeType: photo.mimeType,
            data: photo.data,
            sortOrder: i,
          })),
        },
      },
      include: {
        photos: { select: { id: true }, orderBy: { sortOrder: "asc" } },
      },
    });
    return NextResponse.json(
      { success: true, data: serializePartnerBus(bus) },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Bus number may already exist." },
      { status: 409 },
    );
  }
}
