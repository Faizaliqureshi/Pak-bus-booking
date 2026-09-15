import { NextResponse } from "next/server";
import { getPartnerUser } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ keyId: string }> };

/** DELETE /api/partner/api-keys/:keyId — revoke */
export async function DELETE(_request: Request, context: RouteContext) {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const { keyId } = await context.params;
  const existing = await prisma.partnerApiKey.findFirst({
    where: { id: keyId, operatorId: partner.id },
  });
  if (!existing) {
    return NextResponse.json(
      { success: false, message: "Key not found." },
      { status: 404 },
    );
  }

  await prisma.partnerApiKey.update({
    where: { id: existing.id },
    data: { isActive: false, revokedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
