import { NextRequest, NextResponse } from "next/server";
import { loadOwnedPaidBooking } from "@/lib/booking-documents";
import { buildInvoicePdf, pdfResponse } from "@/lib/booking-pdf";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ pnr: string }> },
) {
  const { pnr } = await context.params;
  const doc = await loadOwnedPaidBooking(pnr);
  if (!doc) {
    return NextResponse.json(
      { success: false, message: "Invoice not found." },
      { status: 404 },
    );
  }

  try {
    const bytes = await buildInvoicePdf(doc);
    return pdfResponse(bytes, `TicketPass-${doc.pnr}-invoice.pdf`);
  } catch (error) {
    console.error("[GET /api/account/bookings/[pnr]/invoice]", error);
    return NextResponse.json(
      { success: false, message: "Could not generate invoice PDF." },
      { status: 500 },
    );
  }
}
