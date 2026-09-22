import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { PaymentStatus } from "@prisma/client";
import { HELPLINE_DISPLAY } from "@/lib/helpline";
import { drawInvoiceBankDetails } from "@/lib/invoice-bank";

const NAVY = rgb(10 / 255, 47 / 255, 107 / 255);
const GOLD = rgb(245 / 255, 166 / 255, 35 / 255);
const INK = rgb(26 / 255, 35 / 255, 51 / 255);
const MUTED = rgb(100 / 255, 116 / 255, 139 / 255);

function money(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString("en-US")}`;
}

function pdfSafe(text: string): string {
  return text
    .replace(/[^\x20-\x7E]/g, (ch) => (ch === "·" ? "|" : "?"));
}

export async function buildServiceInvoicePdf(order: {
  reference: string;
  kind: string;
  country: string;
  productLabel: string;
  customerName: string;
  customerPhone: string;
  amountPkr: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  createdAt: Date;
  paidAt: Date | null;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();
  const paid = order.paymentStatus === PaymentStatus.PAID;
  const title = paid ? "TAX INVOICE" : "PROFORMA INVOICE";

  page.drawRectangle({ x: 0, y: height - 88, width, height: 88, color: NAVY });
  page.drawRectangle({ x: 0, y: height - 92, width, height: 4, color: GOLD });
  page.drawText("TicketPass", {
    x: 48,
    y: height - 42,
    size: 18,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText(title, { x: 48, y: height - 66, size: 11, font, color: GOLD });
  page.drawText(order.reference, {
    x: width - 48 - bold.widthOfTextAtSize(order.reference, 12),
    y: height - 48,
    size: 12,
    font: bold,
    color: rgb(1, 1, 1),
  });

  let y = height - 130;
  page.drawText("Billed to", { x: 48, y, size: 8, font: bold, color: MUTED });
  page.drawText(paid ? "Paid" : "Due", { x: 320, y, size: 8, font: bold, color: MUTED });
  y -= 16;
  page.drawText(pdfSafe(order.customerName), { x: 48, y, size: 13, font: bold, color: INK });
  page.drawText(paid ? "PAID" : "UNPAID", {
    x: 320,
    y,
    size: 13,
    font: bold,
    color: paid ? rgb(0.09, 0.55, 0.33) : rgb(0.7, 0.2, 0.15),
  });
  y -= 16;
  page.drawText(pdfSafe(order.customerPhone), { x: 48, y, size: 10, font, color: MUTED });
  y -= 28;
  page.drawText("Service", { x: 48, y, size: 8, font: bold, color: MUTED });
  y -= 16;
  page.drawText(pdfSafe(`${order.kind}  |  ${order.country}`), {
    x: 48,
    y,
    size: 12,
    font: bold,
    color: INK,
  });
  y -= 14;
  page.drawText(pdfSafe(order.productLabel), { x: 48, y, size: 10, font, color: MUTED });
  y -= 32;
  const amount = money(Number(order.amountPkr));
  page.drawText(paid ? "Total paid" : "Amount due", {
    x: 48,
    y,
    size: 12,
    font: bold,
    color: NAVY,
  });
  page.drawText(amount, {
    x: width - 48 - bold.widthOfTextAtSize(amount, 16),
    y,
    size: 16,
    font: bold,
    color: NAVY,
  });
  y -= 24;
  page.drawText(
    pdfSafe(
      `Issued ${order.createdAt.toLocaleDateString("en-GB")}${
        order.paidAt ? `  |  Paid ${order.paidAt.toLocaleDateString("en-GB")}` : ""
      }`,
    ),
    { x: 48, y, size: 9, font, color: MUTED },
  );
  y -= 14;
  page.drawText(
    pdfSafe(`Method ${order.paymentMethod ?? (paid ? "DESK" : "Pending")}`),
    { x: 48, y, size: 9, font, color: MUTED },
  );
  y -= 36;
  if (!paid) {
    page.drawText("Transfer the amount due to the account below.", {
      x: 48,
      y,
      size: 9,
      font,
      color: MUTED,
    });
    y -= 18;
  }
  drawInvoiceBankDetails(page, font, bold, y);

  page.drawText(
    "This invoice is for TicketPass visa, Umrah, or holiday services. Not a bus ticket.",
    { x: 48, y: 52, size: 8, font, color: MUTED },
  );
  page.drawText(`Helpline / WhatsApp ${HELPLINE_DISPLAY}`, {
    x: 48,
    y: 38,
    size: 8,
    font,
    color: MUTED,
  });
  return pdf.save();
}
