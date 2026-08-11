import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/demo-user
 * Returns the seeded demo passenger for Phase 3 seat locking.
 */
export async function GET() {
  try {
    const user =
      (await prisma.user.findFirst({
        where: { email: "ali.khan@example.pk", role: UserRole.PASSENGER },
        select: { id: true, name: true, email: true },
      })) ??
      (await prisma.user.findFirst({
        where: { role: UserRole.PASSENGER },
        select: { id: true, name: true, email: true },
      }));

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "No demo passenger found. Run `npx prisma db seed`.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: user }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/demo-user]", error);
    return NextResponse.json(
      { success: false, message: "Failed to load demo user." },
      { status: 500 },
    );
  }
}
