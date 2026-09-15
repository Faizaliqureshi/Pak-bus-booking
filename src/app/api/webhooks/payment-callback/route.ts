import { NextRequest, NextResponse } from "next/server";
import {
  WEBHOOK_ACK,
  markWebhookPaymentFailed,
  parsePaymentWebhookBody,
  paymentWebhookSecret,
  readWebhookPaymentStatus,
  settleSuccessfulPayment,
  verifyPaymentWebhookHash,
} from "@/lib/payment-webhook";

export const runtime = "nodejs";

function ack(): NextResponse {
  return new NextResponse(WEBHOOK_ACK, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * POST /api/webhooks/payment-callback
 *
 * Local PSP IPN. HMAC-SHA256 with PAYMENT_WEBHOOK_SECRET.
 * SUCCESSFUL → Booking.paymentStatus PAID, TripSeat LOCKED→BOOKED, Upstash lock keys deleted.
 * Always ACKs the vendor with HTTP 200 + "VERIFIED" after a valid hash.
 */
export async function POST(request: NextRequest) {
  let secret: string;
  try {
    secret = paymentWebhookSecret();
  } catch (error) {
    console.error("[POST /api/webhooks/payment-callback]", error);
    return NextResponse.json(
      { success: false, message: "Webhook secret is not configured." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const payload = parsePaymentWebhookBody(
    rawBody,
    request.headers.get("content-type"),
  );

  const headerSignature =
    request.headers.get("x-payment-signature") ??
    request.headers.get("x-webhook-signature") ??
    request.headers.get("x-secure-hash");

  if (!verifyPaymentWebhookHash(rawBody, payload, headerSignature, secret)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const outcome = readWebhookPaymentStatus(payload);

    if (outcome === "SUCCESSFUL") {
      await settleSuccessfulPayment(payload);
    } else if (outcome === "FAILED") {
      await markWebhookPaymentFailed(payload);
    }

    return ack();
  } catch (error) {
    console.error("[POST /api/webhooks/payment-callback]", error);
    return NextResponse.json(
      { success: false, message: "Failed to process payment callback." },
      { status: 500 },
    );
  }
}
