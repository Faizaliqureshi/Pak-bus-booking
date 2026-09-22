import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { getAdminUser } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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
  const body = (await request.json()) as {
    markPaid?: boolean;
    paymentMethod?: string;
    amountPkr?: number;
  };

  try {
    const existing = await prisma.serviceOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Invoice not found." },
        { status: 404 },
      );
    }

    const paid = body.markPaid === true;
    const order = await prisma.serviceOrder.update({
      where: { id },
      data: {
        ...(Number.isFinite(Number(body.amountPkr)) && Number(body.amountPkr) > 0
          ? { amountPkr: Number(body.amountPkr) }
          : {}),
        ...(paid
          ? {
              paymentStatus: PaymentStatus.PAID,
              paidAt: existing.paidAt ?? new Date(),
              paymentMethod: body.paymentMethod?.trim() || existing.paymentMethod || "DESK",
            }
          : {}),
      },
    });

    if (paid && existing.inquiryId) {
      await prisma.serviceInquiry.update({
        where: { id: existing.inquiryId },
        data: { status: "CONVERTED" },
      });
    }

    return NextResponse.json({
      success: true,
      data: { id: order.id, reference: order.reference, paymentStatus: order.paymentStatus },
    });
  } catch (error) {
    console.error("[PATCH /api/master/services/orders]", error);
    return NextResponse.json(
      { success: false, message: "Could not update invoice." },
      { status: 500 },
    );
  }
}
