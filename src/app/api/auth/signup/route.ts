import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import {
  hashPassword,
  normalizePkPhone,
  setSessionCookie,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
    };

    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const phone = body.phone?.trim() ?? "";
    const password = body.password ?? "";

    if (name.length < 2) {
      return NextResponse.json(
        { success: false, message: "Please enter your full name." },
        { status: 400 },
      );
    }
    if (!isEmail(email)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email." },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }
    if (phone && phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid Pakistani mobile number." },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone ? normalizePkPhone(phone) : null,
        passwordHash: hashPassword(password),
        role: UserRole.PASSENGER,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    await setSessionCookie(user.id);

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/auth/signup]", error);
    return NextResponse.json(
      { success: false, message: "Could not create account." },
      { status: 500 },
    );
  }
}
