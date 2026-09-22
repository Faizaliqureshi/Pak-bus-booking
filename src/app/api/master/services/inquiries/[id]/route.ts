import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const STATUSES = ["NEW", "CONTACTED", "CONVERTED", "CLOSED"] as const;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const body = (await request.json()) as { status?: string };
  const status = (body.status ?? "").toUpperCase();
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
    return NextResponse.json(
      { success: false, message: "Invalid status." },
      { status: 400 },
    );
  }

  try {
    await prisma.serviceInquiry.update({
      where: { id },
      data: { status },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/master/services/inquiries]", error);
    return NextResponse.json(
      { success: false, message: "Could not update inquiry." },
      { status: 500 },
    );
  }
}
