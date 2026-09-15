import { createHmac, timingSafeEqual } from "crypto";
import { PaymentStatus, TripSeatStatus } from "@prisma/client";
import { parseHeldSeats } from "@/lib/checkout-utils";
import { prisma } from "@/lib/prisma";
import { notifyPartnerBookingPaid } from "@/lib/partner-notify";
import {
  bookingSeatLockKey,
  getUpstashRedis,
} from "@/lib/upstash";

const HASH_KEYS = new Set([
  "hash",
  "signature",
  "securehash",
  "secure_hash",
  "pp_securehash",
]);

const SUCCESS_STATUSES = new Set([
  "SUCCESSFUL",
  "SUCCESS",
  "PAID",
  "COMPLETED",
  "CAPTURED",
  "00",
  "000",
]);

const FAILED_STATUSES = new Set([
  "FAILED",
  "FAILURE",
  "DECLINED",
  "CANCELLED",
  "CANCELED",
  "EXPIRED",
]);

export const WEBHOOK_ACK = "VERIFIED";

export type PaymentWebhookPayload = Record<string, unknown>;

export function paymentWebhookSecret(): string {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("PAYMENT_WEBHOOK_SECRET is not configured.");
  }
  return secret;
}

export function parsePaymentWebhookBody(
  rawBody: string,
  contentType: string | null,
): PaymentWebhookPayload {
  const trimmed = rawBody.trim();
  if (!trimmed) return {};

  if (contentType?.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(trimmed));
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as PaymentWebhookPayload;
    }
  } catch {
    return Object.fromEntries(new URLSearchParams(trimmed));
  }

  return {};
}

function hmacHex(secret: string, message: string): string {
  return createHmac("sha256", secret).update(message, "utf8").digest("hex");
}

function normalizeSignature(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^sha256=/, "")
    .replace(/^0x/, "");
}

function signaturesMatch(provided: string, expectedHex: string): boolean {
  const a = Buffer.from(normalizeSignature(provided), "utf8");
  const b = Buffer.from(expectedHex.toLowerCase(), "utf8");
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function canonicalPayloadString(payload: PaymentWebhookPayload): string {
  const entries = Object.entries(payload)
    .filter(([key]) => !HASH_KEYS.has(key.toLowerCase()))
    .map(([key, value]) => {
      const serialized =
        value === null || value === undefined
          ? ""
          : typeof value === "string"
            ? value
            : JSON.stringify(value);
      return [key, serialized] as const;
    })
    .sort(([a], [b]) => a.localeCompare(b));

  return entries.map(([key, value]) => `${key}=${value}`).join("&");
}

function extractProvidedSignature(
  payload: PaymentWebhookPayload,
  headerSignature: string | null,
): string | null {
  if (headerSignature?.trim()) return headerSignature.trim();

  for (const key of Object.keys(payload)) {
    if (!HASH_KEYS.has(key.toLowerCase())) continue;
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/**
 * HMAC-SHA256 authorization hash.
 * Accepts `x-payment-signature` / `x-webhook-signature` over the raw body,
 * or a body `secureHash`/`hash` over sorted `key=value` fields.
 */
export function verifyPaymentWebhookHash(
  rawBody: string,
  payload: PaymentWebhookPayload,
  headerSignature: string | null,
  secret: string,
): boolean {
  const provided = extractProvidedSignature(payload, headerSignature);
  if (!provided) return false;

  const rawHmac = hmacHex(secret, rawBody);
  const canonicalHmac = hmacHex(secret, canonicalPayloadString(payload));
  return (
    signaturesMatch(provided, rawHmac) ||
    signaturesMatch(provided, canonicalHmac)
  );
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

export function readWebhookPaymentStatus(
  payload: PaymentWebhookPayload,
): "SUCCESSFUL" | "FAILED" | "OTHER" {
  const raw = (
    asString(payload.status) ??
    asString(payload.paymentStatus) ??
    asString(payload.pp_ResponseCode) ??
    asString(payload.responseCode) ??
    ""
  ).toUpperCase();

  if (SUCCESS_STATUSES.has(raw)) return "SUCCESSFUL";
  if (FAILED_STATUSES.has(raw)) return "FAILED";
  return "OTHER";
}

export function readWebhookBookingRef(
  payload: PaymentWebhookPayload,
): { bookingId?: string; pnr?: string } {
  return {
    bookingId:
      asString(payload.bookingId) ??
      asString(payload.orderId) ??
      asString(payload.merchantReference) ??
      asString(payload.pp_BillReference),
    pnr: asString(payload.pnr) ?? asString(payload.PNR),
  };
}

function readWebhookSeats(payload: PaymentWebhookPayload): string[] {
  const raw = payload.seats ?? payload.seatNumbers;
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof raw === "string") return parseHeldSeats(raw);
  return [];
}

function readGatewayType(payload: PaymentWebhookPayload): string | undefined {
  return (
    asString(payload.gatewayType) ??
    asString(payload.paymentMethod) ??
    asString(payload.pp_TxnType)
  )?.toUpperCase();
}

export async function findWebhookBooking(
  payload: PaymentWebhookPayload,
) {
  const { bookingId, pnr } = readWebhookBookingRef(payload);
  if (bookingId) {
    const byId = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (byId) return byId;
  }
  if (pnr) {
    return prisma.booking.findUnique({ where: { pnr } });
  }
  return null;
}

async function clearUpstashSeatKeys(
  tripId: string,
  seatNumbers: string[],
): Promise<void> {
  if (seatNumbers.length === 0) return;

  const redis = getUpstashRedis();
  const keys = seatNumbers.flatMap((seat) => [
    bookingSeatLockKey(tripId, seat),
    `seat_lock:${tripId}:${seat}`,
  ]);
  await redis.del(...keys);
}

/**
 * Vendor SUCCESSFUL → Prisma PAID (live captured/success state).
 * LOCKED TripSeat rows for this booking become BOOKED.
 */
export async function settleSuccessfulPayment(
  payload: PaymentWebhookPayload,
): Promise<{ found: boolean; bookingId?: string }> {
  const booking = await findWebhookBooking(payload);
  if (!booking) return { found: false };

  if (booking.paymentStatus === PaymentStatus.REFUNDED) {
    return { found: true, bookingId: booking.id };
  }

  const payloadSeats = readWebhookSeats(payload);
  const heldSeats = parseHeldSeats(booking.heldSeats);
  const gatewayType = readGatewayType(payload);

  const seatNumbers = await prisma.$transaction(async (tx) => {
    const gateway = gatewayType
      ? await tx.paymentGateway.findUnique({
          where: { gatewayType },
        })
      : null;

    const lockedSeats = await tx.tripSeat.findMany({
      where: {
        tripId: booking.tripId,
        status: TripSeatStatus.LOCKED,
        OR: [
          { bookingId: booking.id },
          { lockedByUserId: booking.userId },
          ...(heldSeats.length > 0
            ? [{ seatNumber: { in: heldSeats } }]
            : []),
          ...(payloadSeats.length > 0
            ? [{ seatNumber: { in: payloadSeats } }]
            : []),
        ],
      },
      select: { seatNumber: true },
    });

    const seats = [
      ...new Set([
        ...heldSeats,
        ...payloadSeats,
        ...lockedSeats.map((s) => s.seatNumber),
      ]),
    ];

    if (booking.paymentStatus !== PaymentStatus.PAID) {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          ...(gatewayType ? { paymentMethod: gatewayType } : {}),
          ...(gateway ? { paymentGatewayId: gateway.id } : {}),
        },
      });
    }

    if (seats.length > 0) {
      await tx.tripSeat.updateMany({
        where: {
          tripId: booking.tripId,
          seatNumber: { in: seats },
          status: TripSeatStatus.LOCKED,
        },
        data: {
          status: TripSeatStatus.BOOKED,
          bookingId: booking.id,
          lockedByUserId: null,
          lockedUntil: null,
        },
      });

      await tx.seatLock.deleteMany({
        where: {
          tripId: booking.tripId,
          seatNumber: { in: seats },
        },
      });
    }

    return seats;
  });

  try {
    await clearUpstashSeatKeys(booking.tripId, seatNumbers);
  } catch (error) {
    console.error("[payment-webhook] Upstash lock cleanup", error);
  }

  void notifyPartnerBookingPaid(booking.id);

  return { found: true, bookingId: booking.id };
}

export async function markWebhookPaymentFailed(
  payload: PaymentWebhookPayload,
): Promise<{ found: boolean; bookingId?: string }> {
  const booking = await findWebhookBooking(payload);
  if (!booking) return { found: false };

  if (booking.paymentStatus === PaymentStatus.PENDING) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentStatus: PaymentStatus.FAILED },
    });
  }

  return { found: true, bookingId: booking.id };
}
