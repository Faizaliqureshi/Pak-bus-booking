import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/bus-photos/:id — public coach photo. */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const photo = await prisma.busPhoto.findUnique({
    where: { id },
    select: { data: true, mimeType: true },
  });
  if (!photo) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mimeType || "image/jpeg",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
