import { createHmac, randomBytes } from "crypto";

const CNIC_DIGITS = /^\d{13}$/;
const CNIC_FORMATTED = /^\d{5}-\d{7}-\d$/;
const PK_PHONE = /^03\d{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PaymentMethod = "JAZZCASH" | "EASYPAISA" | "CARD";

export function stripCnic(value: string): string {
  return value.replace(/\D/g, "").slice(0, 13);
}

/** Format raw digits as 00000-0000000-0 */
export function formatCnic(value: string): string {
  const digits = stripCnic(value);
  const p1 = digits.slice(0, 5);
  const p2 = digits.slice(5, 12);
  const p3 = digits.slice(12, 13);
  if (digits.length <= 5) return p1;
  if (digits.length <= 12) return `${p1}-${p2}`;
  return `${p1}-${p2}-${p3}`;
}

export function isValidCnic(value: string): boolean {
  const digits = stripCnic(value);
  if (!CNIC_DIGITS.test(digits)) return false;
  const formatted = formatCnic(digits);
  return CNIC_FORMATTED.test(formatted);
}

export function maskCnic(value: string): string {
  const formatted = formatCnic(value);
  if (!isValidCnic(formatted)) return "*****-*******-*";
  return `${formatted.slice(0, 6)}*******${formatted.slice(-2)}`;
}

export function isValidPkPhone(value: string): boolean {
  return PK_PHONE.test(value.replace(/[\s-]/g, ""));
}

export function isValidEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

export function generatePnr(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  const bytes = randomBytes(5);
  for (let i = 0; i < 5; i++) {
    suffix += alphabet[bytes[i] % alphabet.length];
  }
  return `PKR-${suffix}`;
}

export function buildQrPayload(input: {
  pnr: string;
  tripId: string;
  seats: string[];
}): string {
  const seats = [...input.seats].sort((a, b) => Number(a) - Number(b)).join(",");
  return `PNR:${input.pnr}|TRIP:${input.tripId}|SEATS:${seats}`;
}

/** HMAC signature appended for tamper evidence */
export function signQrPayload(payload: string): string {
  const secret =
    process.env.TICKET_QR_SECRET || "ticketpass-dev-ticket-secret-change-me";
  const sig = createHmac("sha256", secret).update(payload).digest("hex").slice(0, 16);
  return `${payload}|SIG:${sig}`;
}

export function parseHeldSeats(heldSeats: string | null | undefined): string[] {
  if (!heldSeats?.trim()) return [];
  return heldSeats
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Extract PNR (and optional tripId) from signed QR payload or raw PNR text. */
export function parseTicketQr(raw: string): { pnr: string; tripId?: string } | null {
  const text = raw.trim();
  if (!text) return null;

  if (/^PKR-[A-Z0-9]+$/i.test(text)) {
    return { pnr: text.toUpperCase() };
  }

  const parts = Object.fromEntries(
    text.split("|").map((chunk) => {
      const idx = chunk.indexOf(":");
      if (idx === -1) return [chunk, ""];
      return [chunk.slice(0, idx), chunk.slice(idx + 1)];
    }),
  ) as Record<string, string>;

  if (parts.PNR) {
    return {
      pnr: parts.PNR.trim().toUpperCase(),
      tripId: parts.TRIP?.trim() || undefined,
    };
  }

  const pnrMatch = text.match(/PKR-[A-Z0-9]+/i);
  if (pnrMatch) {
    return { pnr: pnrMatch[0].toUpperCase() };
  }

  return null;
}
