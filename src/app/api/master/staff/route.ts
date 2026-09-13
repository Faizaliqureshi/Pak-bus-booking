import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getMasterUser } from "@/lib/admin-auth";
import { generateTempPassword, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const CREATABLE: UserRole[] = [UserRole.ADMIN, UserRole.OPERATOR];

/**
 * POST /api/master/staff
 * Master creates Platform staff (ADMIN) or Partner (OPERATOR).
 */
export async function POST(request: Request) {
  const master = await getMasterUser();
  if (!master) {
    return NextResponse.json(
      { success: false, message: "Unauthorized — Master only." },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as {
      role?: string;
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
    };

    const roleRaw = (body.role ?? "").toUpperCase();
    const role =
      roleRaw === "PARTNER" || roleRaw === "OPERATOR"
        ? UserRole.OPERATOR
        : roleRaw === "ADMIN"
          ? UserRole.ADMIN
          : null;

    if (!role || !CREATABLE.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          message: "Role must be ADMIN (platform staff) or PARTNER.",
        },
        { status: 400 },
      );
    }

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
        role,
        createdById: master.id,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    const roleLabel =
      role === UserRole.OPERATOR ? "Partner" : "Platform staff";

    return NextResponse.json(
      {
        success: true,
        data: {
          ...user,
          temporaryPassword: password,
          loginUrl: "/staff/login",
          roleLabel,
        },
        message: `${roleLabel} created. Share credentials securely.`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/master/staff]", error);
    return NextResponse.json(
      { success: false, message: "Could not create staff account." },
      { status: 500 },
    );
  }
}
