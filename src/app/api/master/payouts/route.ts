import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getMasterUser } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** POST /api/master/payouts — record a cleared TicketPass payout to a partner. */
export async function POST(request: NextRequest) {
  const master = await getMasterUser();
  if (!master) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as {
      operatorId?: string;
      amount?: unknown;
      note?: string;
    };
    const operatorId = String(body.operatorId ?? "").trim();
    const amount = Number(body.amount);
    const note = String(body.note ?? "").trim() || null;

    if (!operatorId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "operatorId and a positive amount are required." },
        { status: 400 },
      );
    }

    const partner = await prisma.user.findFirst({
      where: { id: operatorId, role: UserRole.OPERATOR },
      select: { id: true },
    });
    if (!partner) {
      return NextResponse.json(
        { success: false, message: "Partner not found." },
        { status: 404 },
      );
    }

    const payout = await prisma.partnerPayout.create({
      data: {
        operatorId: partner.id,
        amount,
        status: "CLEARED",
        reference: `TP-PAY-${Date.now().toString(36).toUpperCase()}`,
        note,
        clearedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: payout.id,
        reference: payout.reference,
        amount: Number(payout.amount),
        status: payout.status,
      },
    });
  } catch (error) {
    console.error("[POST /api/master/payouts]", error);
    return NextResponse.json(
      { success: false, message: "Could not record payout." },
      { status: 500 },
    );
  }
}
