import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getMasterUser } from "@/lib/admin-auth";
import { generateTempPassword, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const master = await getMasterUser();
  if (!master) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const admins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      createdById: true,
      _count: { select: { createdUsers: true } },
    },
  });

  return NextResponse.json({
    success: true,
    data: admins.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      phone: a.phone,
      createdAt: a.createdAt.toISOString(),
      partnersCreated: a._count.createdUsers,
    })),
  });
}

export async function POST(request: Request) {
  const master = await getMasterUser();
  if (!master) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
    };

    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const phone = body.phone?.trim() || null;
    const password = body.password?.trim() || generateTempPassword(12);

    if (name.length < 2 || !email.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Name and valid email are required." },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters." },
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

    const admin = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash: hashPassword(password),
        role: UserRole.ADMIN,
        createdById: master.id,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...admin,
          temporaryPassword: password,
        },
        message: "Admin created. Share these credentials securely.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/master/admins]", error);
    return NextResponse.json(
      { success: false, message: "Could not create admin." },
      { status: 500 },
    );
  }
}
