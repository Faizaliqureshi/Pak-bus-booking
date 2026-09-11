import { NextResponse } from "next/server";
import {
  setSessionCookie,
  staffHomeForRole,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 },
      );
    }

    if (
      user.role !== "MASTER" &&
      user.role !== "ADMIN" &&
      user.role !== "OPERATOR" &&
      user.role !== "CONDUCTOR"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This login is for master, admin, partner, and conductor accounts.",
        },
        { status: 403 },
      );
    }

    await setSessionCookie(user.id);

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        redirectTo: staffHomeForRole(user.role),
      },
    });
  } catch (error) {
    console.error("[POST /api/auth/staff-signin]", error);
    return NextResponse.json(
      { success: false, message: "Could not sign in." },
      { status: 500 },
    );
  }
}
