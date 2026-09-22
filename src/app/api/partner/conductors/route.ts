import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getPartnerUser } from "@/lib/admin-auth";
import { generateTempPassword, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** GET /api/partner/conductors — conductors tagged to this partner. */
export async function GET() {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const conductors = await prisma.user.findMany({
    where: { role: UserRole.CONDUCTOR, createdById: partner.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, data: conductors });
}

/** POST /api/partner/conductors — partner creates a conductor under this account. */
export async function POST(request: Request) {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
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

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash: hashPassword(password),
        role: UserRole.CONDUCTOR,
        createdById: partner.id,
      },
      select: { id: true, name: true, email: true, phone: true },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...user,
          temporaryPassword: password,
          loginUrl: "/staff/login",
        },
        message: "Conductor created. Share credentials securely.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/partner/conductors]", error);
    return NextResponse.json(
      { success: false, message: "Could not create conductor." },
      { status: 500 },
    );
  }
}
