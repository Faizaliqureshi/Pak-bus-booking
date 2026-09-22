import { NextResponse } from "next/server";
import { getPartnerUser } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; photoId: string }> };

/** DELETE /api/partner/buses/:id/photos/:photoId */
export async function DELETE(_request: Request, context: RouteContext) {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id, photoId } = await context.params;
  const photo = await prisma.busPhoto.findFirst({
    where: {
      id: photoId,
      bus: { id, operatorId: partner.id },
    },
    select: { id: true },
  });
  if (!photo) {
    return NextResponse.json(
      { success: false, message: "Picture not found." },
      { status: 404 },
    );
  }

  await prisma.busPhoto.delete({ where: { id: photo.id } });
  return NextResponse.json({ success: true });
}
