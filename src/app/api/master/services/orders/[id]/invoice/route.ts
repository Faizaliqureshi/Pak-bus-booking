import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { pdfResponse } from "@/lib/booking-pdf";
import { prisma } from "@/lib/prisma";
import { buildServiceInvoicePdf } from "@/lib/service-invoice-pdf";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
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
  const order = await prisma.serviceOrder.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json(
      { success: false, message: "Invoice not found." },
      { status: 404 },
    );
  }

  const bytes = await buildServiceInvoicePdf({
    ...order,
    amountPkr: Number(order.amountPkr),
  });
  const suffix = order.paymentStatus === "PAID" ? "paid" : "unpaid";
  return pdfResponse(bytes, `TicketPass-${order.reference}-${suffix}.pdf`);
}
