import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { HELPLINE_DISPLAY } from "@/lib/helpline";
import { INVOICE_BANK } from "@/lib/invoice-bank";

const NAVY = rgb(10 / 255, 47 / 255, 107 / 255);
const GOLD = rgb(245 / 255, 166 / 255, 35 / 255);
const INK = rgb(26 / 255, 35 / 255, 51 / 255);
const MUTED = rgb(100 / 255, 116 / 255, 139 / 255);
const FILL = rgb(243 / 255, 246 / 255, 251 / 255);
const WHITE = rgb(1, 1, 1);

export function invoiceMoney(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString("en-US")}`;
}

export function invoiceSafe(text: string): string {
  return text
    .replace(/\u20A8|\u20B9/g, "Rs")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[·•]/g, "|")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x20-\x7E]/g, "?");
}

function issuedLabel(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export type InvoiceDraft = {
  title: "PROFORMA INVOICE" | "TAX INVOICE";
  reference: string;
  billedName: string;
  billedPhone: string;
  billedEmail?: string | null;
  paid: boolean;
  serviceLine: string;
  serviceDetail?: string | null;
  amountPkr: number;
  issuedAt: Date;
  paidAt?: Date | null;
  notes?: string[];
};

/** Canonical TicketPass invoice — matches the saved proforma sample. */
export async function buildBrandedInvoicePdf(
  draft: InvoiceDraft,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();
  const left = 48;
  const right = width - 48;
  const col = 360;

  page.drawRectangle({ x: 0, y: height - 104, width, height: 104, color: NAVY });
  page.drawRectangle({ x: 0, y: height - 108, width, height: 4, color: GOLD });

  page.drawText("Ticket", {
    x: left,
    y: height - 40,
    size: 20,
    font: bold,
    color: WHITE,
  });
  page.drawText("Pass", {
    x: left + bold.widthOfTextAtSize("Ticket", 20),
    y: height - 40,
    size: 20,
    font: bold,
    color: GOLD,
  });
  page.drawText("SMART ACCESS SOLUTIONS", {
    x: left,
    y: height - 58,
    size: 8,
    font: bold,
    color: rgb(0.72, 0.84, 0.95),
  });
  page.drawText(draft.title, {
    x: left,
    y: height - 86,
    size: 12,
    font: bold,
    color: GOLD,
  });

  const ref = invoiceSafe(draft.reference);
  page.drawText("REFERENCE NUMBER", {
    x: right - bold.widthOfTextAtSize("REFERENCE NUMBER", 8),
    y: height - 58,
    size: 8,
    font: bold,
    color: rgb(0.72, 0.84, 0.95),
  });
  page.drawText(ref, {
    x: right - bold.widthOfTextAtSize(ref, 13),
    y: height - 78,
    size: 13,
    font: bold,
    color: WHITE,
  });

  let y = height - 140;
  page.drawText("Billed To", { x: left, y, size: 8, font: bold, color: MUTED });
  page.drawText(draft.paid ? "Paid" : "Due", {
    x: col,
    y,
    size: 8,
    font: bold,
    color: MUTED,
  });
  y -= 16;
  page.drawText(invoiceSafe(draft.billedName), {
    x: left,
    y,
    size: 13,
    font: bold,
    color: INK,
  });
  page.drawText(draft.paid ? "PAID" : "UNPAID", {
    x: col,
    y,
    size: 13,
    font: bold,
    color: draft.paid ? rgb(0.09, 0.55, 0.33) : rgb(0.7, 0.2, 0.15),
  });
  y -= 16;
  page.drawText(invoiceSafe(draft.billedPhone || "-"), {
    x: left,
    y,
    size: 10,
    font,
    color: MUTED,
  });
  if (draft.billedEmail) {
    y -= 14;
    page.drawText(invoiceSafe(draft.billedEmail), {
      x: left,
      y,
      size: 10,
      font,
      color: MUTED,
    });
  }

  y -= 28;
  page.drawText("Service", { x: left, y, size: 8, font: bold, color: MUTED });
  y -= 16;
  page.drawText(invoiceSafe(draft.serviceLine), {
    x: left,
    y,
    size: 12,
    font: bold,
    color: INK,
  });
  if (draft.serviceDetail) {
    y -= 14;
    page.drawText(invoiceSafe(draft.serviceDetail), {
      x: left,
      y,
      size: 10,
      font,
      color: MUTED,
    });
  }

  y -= 32;
  const amountLabel = draft.paid ? "Total paid" : "Amount due";
  const amount = invoiceMoney(draft.amountPkr);
  page.drawText(amountLabel, { x: left, y, size: 12, font: bold, color: NAVY });
  page.drawText(amount, {
    x: right - bold.widthOfTextAtSize(amount, 16),
    y,
    size: 16,
    font: bold,
    color: NAVY,
  });

  y -= 22;
  let issued = `Issued ${issuedLabel(draft.issuedAt)}`;
  if (draft.paidAt) issued += `  |  Paid ${issuedLabel(draft.paidAt)}`;
  page.drawText(invoiceSafe(issued), { x: left, y, size: 9, font, color: MUTED });

  if (draft.notes?.length) {
    y -= 22;
    for (const note of draft.notes) {
      page.drawText(invoiceSafe(note), { x: left, y, size: 9, font, color: MUTED });
      y -= 13;
    }
  }

  y -= 28;
  drawInvoiceBankBlock(page, font, bold, y, left, right);

  const footer = "TicketPass | Smart Access Solutions";
  const refFooter = `Reference: ${ref}`;
  page.drawText(footer, { x: left, y: 48, size: 8, font, color: MUTED });
  page.drawText(refFooter, {
    x: right - font.widthOfTextAtSize(refFooter, 8),
    y: 48,
    size: 8,
    font,
    color: MUTED,
  });

  return pdf.save();
}

export function drawInvoiceBankBlock(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  topY: number,
  left = 48,
  right = page.getWidth() - 48,
): number {
  const rows = [
    ["Account Title", INVOICE_BANK.accountTitle],
    ["Account Number", INVOICE_BANK.accountNumber],
    ["IBAN", INVOICE_BANK.iban],
    ["Bank Name", INVOICE_BANK.bankName],
    ["For queries", HELPLINE_DISPLAY],
  ] as const;
  const boxH = 34 + rows.length * 16;
  page.drawRectangle({
    x: left,
    y: topY - boxH + 16,
    width: right - left,
    height: boxH,
    color: FILL,
  });
  page.drawText("Payment Method via Bank transfers only;", {
    x: left + 12,
    y: topY,
    size: 9,
    font: bold,
    color: INK,
  });
  let y = topY - 18;
  for (const [label, value] of rows) {
    page.drawText(`${label}:`, { x: left + 12, y, size: 9, font, color: MUTED });
    page.drawText(value, { x: left + 140, y, size: 9, font: bold, color: INK });
    y -= 16;
  }
  return y;
}
