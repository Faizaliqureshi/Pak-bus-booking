import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import type { BookingDocument } from "@/lib/booking-documents";
import { formatTime } from "@/lib/booking-utils";
import { maskCnic } from "@/lib/checkout-utils";

const NAVY = rgb(10 / 255, 47 / 255, 107 / 255);
const GOLD = rgb(245 / 255, 166 / 255, 35 / 255);
const INK = rgb(26 / 255, 35 / 255, 51 / 255);
const MUTED = rgb(100 / 255, 116 / 255, 139 / 255);
const LINE = rgb(226 / 255, 232 / 255, 240 / 255);

/** Helvetica is WinAnsi — keep ticket amounts ASCII-safe. */
function money(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString("en-US")}`;
}

function pdfSafe(text: string): string {
  return text
    .replace(/\u20A8|\u20B9/g, "Rs")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/·/g, "|")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x20-\x7E]/g, "?");
}

function issuedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function travelDate(iso: string): string {
  return new Date(iso).toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

async function drawHeader(
  page: ReturnType<PDFDocument["addPage"]>,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  title: string,
  subtitle: string,
) {
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: height - 88, width, height: 88, color: NAVY });
  page.drawRectangle({ x: 0, y: height - 92, width, height: 4, color: GOLD });
  page.drawText("TicketPass", {
    x: 48,
    y: height - 42,
    size: 18,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText(pdfSafe(title), {
    x: 48,
    y: height - 66,
    size: 11,
    font,
    color: GOLD,
  });
  const sub = pdfSafe(subtitle);
  page.drawText(sub, {
    x: width - 48 - bold.widthOfTextAtSize(sub, 12),
    y: height - 48,
    size: 12,
    font: bold,
    color: rgb(1, 1, 1),
  });
}

export async function buildETicketPdf(doc: BookingDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();

  await drawHeader(page, font, bold, "E-TICKET", doc.pnr);

  let y = height - 128;
  page.drawText(pdfSafe(doc.operatorName), { x: 48, y, size: 16, font: bold, color: INK });
  y -= 18;
  page.drawText(pdfSafe(doc.routeName), { x: 48, y, size: 11, font, color: MUTED });
  y -= 28;
  page.drawText(pdfSafe(`${doc.originCity}  to  ${doc.destinationCity}`), {
    x: 48,
    y,
    size: 13,
    font: bold,
    color: NAVY,
  });

  y -= 36;
  page.drawText("BOARDING", { x: 48, y, size: 8, font: bold, color: MUTED });
  page.drawText("DROP-OFF", { x: 300, y, size: 8, font: bold, color: MUTED });
  y -= 16;
  page.drawText(pdfSafe(formatTime(doc.departureTime)), {
    x: 48,
    y,
    size: 14,
    font: bold,
    color: INK,
  });
  page.drawText(pdfSafe(formatTime(doc.arrivalTime)), {
    x: 300,
    y,
    size: 14,
    font: bold,
    color: INK,
  });
  y -= 16;
  page.drawText(pdfSafe(doc.boardingTerminal), { x: 48, y, size: 10, font, color: MUTED });
  page.drawText(pdfSafe(doc.dropTerminal), { x: 300, y, size: 10, font, color: MUTED });
  y -= 14;
  page.drawText(pdfSafe(travelDate(doc.departureTime)), {
    x: 48,
    y,
    size: 9,
    font,
    color: MUTED,
  });

  y -= 28;
  page.drawRectangle({
    x: 48,
    y: y - 8,
    width: width - 96,
    height: 52,
    color: rgb(243 / 255, 246 / 255, 251 / 255),
  });
  page.drawText("Bus", { x: 60, y: y + 24, size: 8, font, color: MUTED });
  page.drawText(pdfSafe(doc.busNumber), { x: 60, y: y + 10, size: 11, font: bold, color: INK });
  const seats = doc.passengers.map((p) => p.seatNumber).join(", ");
  page.drawText("Seat(s)", { x: 220, y: y + 24, size: 8, font, color: MUTED });
  page.drawText(pdfSafe(seats || "-"), { x: 220, y: y + 10, size: 11, font: bold, color: INK });
  page.drawText("Paid", { x: 380, y: y + 24, size: 8, font, color: MUTED });
  page.drawText(money(doc.fare.totalPaid), {
    x: 380,
    y: y + 10,
    size: 11,
    font: bold,
    color: INK,
  });

  y -= 40;
  page.drawText("PASSENGERS", { x: 48, y, size: 8, font: bold, color: MUTED });
  y -= 18;
  for (const p of doc.passengers) {
    page.drawText(pdfSafe(p.name), { x: 48, y, size: 11, font: bold, color: INK });
    page.drawText(pdfSafe(`Seat ${p.seatNumber}`), {
      x: 300,
      y,
      size: 10,
      font,
      color: NAVY,
    });
    y -= 14;
    page.drawText(pdfSafe(`CNIC ${p.cnic ? maskCnic(p.cnic) : "-"}`), {
      x: 48,
      y,
      size: 9,
      font,
      color: MUTED,
    });
    y -= 18;
  }

  const qrPng = await QRCode.toBuffer(doc.qrPayload, {
    type: "png",
    margin: 1,
    width: 220,
    errorCorrectionLevel: "M",
  });
  const qrImage = await pdf.embedPng(qrPng);
  const qrSize = 128;
  page.drawImage(qrImage, {
    x: width - 48 - qrSize,
    y: 120,
    width: qrSize,
    height: qrSize,
  });
  page.drawText("Show this QR at the terminal gate", {
    x: width - 48 - qrSize,
    y: 104,
    size: 8,
    font,
    color: MUTED,
  });

  page.drawLine({
    start: { x: 48, y: 72 },
    end: { x: width - 48, y: 72 },
    thickness: 1,
    color: LINE,
  });
  page.drawText(
    pdfSafe(
      `TicketPass e-ticket · Helpline 021-111-172-782 · ${doc.contactPhone ?? ""}`,
    ),
    { x: 48, y: 52, size: 8, font, color: MUTED },
  );

  return pdf.save();
}

export async function buildInvoicePdf(doc: BookingDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();

  await drawHeader(page, font, bold, "TAX INVOICE", doc.invoiceNumber);

  let y = height - 128;
  page.drawText("Billed to", { x: 48, y, size: 8, font: bold, color: MUTED });
  page.drawText("Issued", { x: 320, y, size: 8, font: bold, color: MUTED });
  y -= 16;
  const billedName = pdfSafe(doc.passengers[0]?.name ?? "Passenger");
  page.drawText(billedName, { x: 48, y, size: 12, font: bold, color: INK });
  page.drawText(pdfSafe(issuedDate(doc.issuedAt)), {
    x: 320,
    y,
    size: 11,
    font,
    color: INK,
  });
  y -= 14;
  page.drawText(pdfSafe(doc.contactEmail ?? "-"), { x: 48, y, size: 10, font, color: MUTED });
  y -= 12;
  page.drawText(pdfSafe(doc.contactPhone ?? "-"), { x: 48, y, size: 10, font, color: MUTED });

  y -= 28;
  page.drawText("From", { x: 48, y, size: 8, font: bold, color: MUTED });
  page.drawText("TicketPass Technologies (Private) Limited", {
    x: 48,
    y: y - 14,
    size: 10,
    font,
    color: INK,
  });
  page.drawText("Online travel marketplace | Pakistan", {
    x: 48,
    y: y - 28,
    size: 9,
    font,
    color: MUTED,
  });

  y -= 56;
  page.drawRectangle({
    x: 48,
    y: y - 6,
    width: width - 96,
    height: 22,
    color: rgb(243 / 255, 246 / 255, 251 / 255),
  });
  page.drawText("Description", { x: 56, y, size: 9, font: bold, color: MUTED });
  page.drawText("Amount", {
    x: width - 56 - bold.widthOfTextAtSize("Amount", 9),
    y,
    size: 9,
    font: bold,
    color: MUTED,
  });

  y -= 28;
  page.drawText(
    pdfSafe(`Intercity bus · ${doc.originCity} to ${doc.destinationCity}`),
    {
      x: 56,
      y,
      size: 11,
      font: bold,
      color: INK,
    },
  );
  const fareText = money(doc.fare.baseFare);
  page.drawText(fareText, {
    x: width - 56 - font.widthOfTextAtSize(fareText, 11),
    y,
    size: 11,
    font,
    color: INK,
  });
  y -= 14;
  page.drawText(
    pdfSafe(
      `${doc.operatorName} · ${doc.busNumber} · Seats ${doc.passengers
        .map((p) => p.seatNumber)
        .join(", ")}`,
    ),
    { x: 56, y, size: 9, font, color: MUTED },
  );
  y -= 12;
  page.drawText(pdfSafe(`Travel ${travelDate(doc.departureTime)}`), {
    x: 56,
    y,
    size: 9,
    font,
    color: MUTED,
  });

  if (doc.fare.flatFee > 0 || doc.fare.percentageAmount > 0) {
    y -= 22;
    page.drawText(
      pdfSafe(
        `Payment gateway fee (${doc.fare.gatewayName ?? "PSP"}${
          doc.fare.percentageFee > 0 ? ` ${doc.fare.percentageFee}%` : ""
        })`,
      ),
      { x: 56, y, size: 10, font, color: INK },
    );
    const feeText = money(doc.fare.flatFee + doc.fare.percentageAmount);
    page.drawText(feeText, {
      x: width - 56 - font.widthOfTextAtSize(feeText, 10),
      y,
      size: 10,
      font,
      color: INK,
    });
  }

  y -= 28;
  page.drawLine({
    start: { x: 48, y: y + 10 },
    end: { x: width - 48, y: y + 10 },
    thickness: 1,
    color: LINE,
  });
  page.drawText("Total paid", { x: 56, y, size: 12, font: bold, color: NAVY });
  const totalText = money(doc.fare.totalPaid);
  page.drawText(totalText, {
    x: width - 56 - bold.widthOfTextAtSize(totalText, 14),
    y,
    size: 14,
    font: bold,
    color: NAVY,
  });

  y -= 36;
  page.drawText(pdfSafe(`PNR ${doc.pnr}`), { x: 56, y, size: 10, font: bold, color: INK });
  y -= 14;
  page.drawText(
    pdfSafe(`Paid via ${doc.paymentMethod?.replace("_", " / ") ?? "-"}`),
    { x: 56, y, size: 10, font, color: MUTED },
  );

  y -= 40;
  page.drawText("Passengers", { x: 56, y, size: 8, font: bold, color: MUTED });
  y -= 16;
  for (const p of doc.passengers) {
    page.drawText(pdfSafe(`${p.name}  ·  Seat ${p.seatNumber}`), {
      x: 56,
      y,
      size: 10,
      font,
      color: INK,
    });
    y -= 14;
  }

  page.drawLine({
    start: { x: 48, y: 72 },
    end: { x: width - 48, y: 72 },
    thickness: 1,
    color: LINE,
  });
  page.drawText(
    "This invoice is for the TicketPass booking platform. Carriage is provided by the listed operator.",
    { x: 48, y: 52, size: 8, font, color: MUTED },
  );
  page.drawText("Helpline 021-111-172-782  |  support@pakbus.com", {
    x: 48,
    y: 38,
    size: 8,
    font,
    color: MUTED,
  });

  return pdf.save();
}

export function pdfResponse(bytes: Uint8Array, filename: string): Response {
  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
