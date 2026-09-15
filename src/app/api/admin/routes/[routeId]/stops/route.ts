import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminJwtResponse, requireAdminJwt } from "@/lib/rbac";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ routeId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminJwt();
  if (!auth.ok) return adminJwtResponse(auth);

  const { routeId } = await context.params;
  const body = await request.json();
  const stationName = String(body.stationName ?? "").trim();
  const stopOrder = Number(body.stopOrder);
  const distanceFromOrigin = Number(body.distanceFromOrigin);

  if (
    !stationName ||
    !Number.isInteger(stopOrder) ||
    stopOrder < 1 ||
    !Number.isFinite(distanceFromOrigin)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "stationName, stopOrder, and distanceFromOrigin are required.",
      },
      { status: 400 },
    );
  }

  const route = await prisma.route.findUnique({ where: { id: routeId } });
  if (!route) {
    return NextResponse.json(
      { success: false, message: "Route not found." },
      { status: 404 },
    );
  }

  const stop = await prisma.routeStop.create({
    data: {
      routeId,
      stationName,
      stopOrder,
      distanceFromOrigin,
    },
  });

  return NextResponse.json({ success: true, data: stop }, { status: 201 });
}
