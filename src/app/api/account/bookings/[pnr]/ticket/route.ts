import { NextRequest, NextResponse } from "next/server";
import { loadOwnedPaidBooking } from "@/lib/booking-documents";
import { buildETicketPdf, pdfResponse } from "@/lib/booking-pdf";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ pnr: string }> },
) {
  const { pnr } = await context.params;
  const doc = await loadOwnedPaidBooking(pnr);
  if (!doc) {
    return NextResponse.json(
      { success: false, message: "E-ticket not found." },
      { status: 404 },
    );
  }

  try {
    const bytes = await buildETicketPdf(doc);
    return pdfResponse(bytes, `TicketPass-${doc.pnr}-eticket.pdf`);
  } catch (error) {
    console.error("[GET /api/account/bookings/[pnr]/ticket]", error);
    return NextResponse.json(
      { success: false, message: "Could not generate e-ticket PDF." },
      { status: 500 },
    );
  }
}
