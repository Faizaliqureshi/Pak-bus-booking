import { rgb, type PDFFont, type PDFPage } from "pdf-lib";

export const INVOICE_BANK = {
  accountTitle: "Faiz Ali",
  accountNumber: "50147100614561",
  iban: "PK24HABB0050147100614561",
  bankName: "HBL (Habib Bank Limited)",
} as const;

const INK = rgb(26 / 255, 35 / 255, 51 / 255);
const MUTED = rgb(100 / 255, 116 / 255, 139 / 255);
const FILL = rgb(243 / 255, 246 / 255, 251 / 255);

export function drawInvoiceBankDetails(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  topY: number,
): number {
  const width = page.getWidth();
  const rows = [
    ["Account Title", INVOICE_BANK.accountTitle],
    ["Account Number", INVOICE_BANK.accountNumber],
    ["IBAN", INVOICE_BANK.iban],
    ["Bank Name", INVOICE_BANK.bankName],
  ] as const;
  const boxH = 28 + rows.length * 16;
  page.drawRectangle({
    x: 48,
    y: topY - boxH + 14,
    width: width - 96,
    height: boxH,
    color: FILL,
  });
  page.drawText("Bank transfer details", {
    x: 60,
    y: topY,
    size: 8,
    font: bold,
    color: MUTED,
  });
  let y = topY - 16;
  for (const [label, value] of rows) {
    page.drawText(label, { x: 60, y, size: 9, font, color: MUTED });
    page.drawText(value, { x: 188, y, size: 9, font: bold, color: INK });
    y -= 16;
  }
  return y;
}
