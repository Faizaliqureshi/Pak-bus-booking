import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getAdminUser } from "@/lib/admin-auth";
import { generateTempPassword, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const partners = await prisma.user.findMany({
    where: {
      role: UserRole.OPERATOR,
      ...(admin.role === UserRole.ADMIN ? { createdById: admin.id } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      _count: { select: { operatedBuses: true } },
    },
  });

  return NextResponse.json({
    success: true,
    data: partners.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      createdAt: p.createdAt.toISOString(),
      busCount: p._count.operatedBuses,
    })),
  });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin || (admin.role !== UserRole.ADMIN && admin.role !== UserRole.MASTER)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      companyName?: string;
      contactName?: string;
      email?: string;
      phone?: string;
      password?: string;
    };

    const companyName = body.companyName?.trim() ?? "";
    const contactName = body.contactName?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const phone = body.phone?.trim() || null;
    const password = body.password?.trim() || generateTempPassword(12);
    const displayName = companyName || contactName;

    if (displayName.length < 2 || !email.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Company/contact name and email are required." },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Email already registered." },
        { status: 409 },
      );
    }

    const partner = await prisma.user.create({
      data: {
        name: displayName,
        email,
        phone,
        passwordHash: hashPassword(password),
        role: UserRole.OPERATOR,
        createdById: admin.id,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...partner,
          temporaryPassword: password,
          loginUrl: "/staff/login",
        },
        message: "Partner account created. Share login credentials with the operator.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/admin/partners]", error);
    return NextResponse.json(
      { success: false, message: "Could not create partner." },
      { status: 500 },
    );
  }
}
