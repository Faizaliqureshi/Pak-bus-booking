import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getPartnerUser } from "@/lib/admin-auth";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function ownConductor(partnerId: string, id: string) {
  return prisma.user.findFirst({
    where: { id, role: UserRole.CONDUCTOR, createdById: partnerId },
    select: { id: true, name: true, email: true, phone: true },
  });
}

/** PATCH — update name/phone or reset password for a partner's conductor. */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const existing = await ownConductor(partner.id, id);
  if (!existing) {
    return NextResponse.json(
      { success: false, message: "Conductor not found." },
      { status: 404 },
    );
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      phone?: string;
      password?: string;
    };

    const name = body.name?.trim();
    const phone = body.phone === undefined ? undefined : body.phone.trim() || null;
    const password = body.password?.trim();

    if (name !== undefined && name.length < 2) {
      return NextResponse.json(
        { success: false, message: "Name must be at least 2 characters." },
        { status: 400 },
      );
    }
    if (password !== undefined && password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(password ? { passwordHash: hashPassword(password) } : {}),
      },
      select: { id: true, name: true, email: true, phone: true },
    });

    return NextResponse.json({
      success: true,
      data: user,
      message: password ? "Conductor updated. New password is set." : "Conductor updated.",
    });
  } catch (error) {
    console.error("[PATCH /api/partner/conductors/:id]", error);
    return NextResponse.json(
      { success: false, message: "Could not update conductor." },
      { status: 500 },
    );
  }
}
