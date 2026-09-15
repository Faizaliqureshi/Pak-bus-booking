import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { asOptionalString, requirePartnerApiKey } from "@/lib/partner-api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.hostname === "localhost";
  } catch {
    return false;
  }
}

/** GET /api/v1/partner/webhook */
export async function GET(request: NextRequest) {
  const auth = await requirePartnerApiKey(request);
  if (!auth.ok) return auth.response;

  const hook = await prisma.partnerWebhook.findUnique({
    where: { operatorId: auth.partner.id },
  });

  return NextResponse.json({
    success: true,
    data: hook
      ? {
          url: hook.url,
          isActive: hook.isActive,
          updatedAt: hook.updatedAt.toISOString(),
        }
      : null,
  });
}

/**
 * PUT /api/v1/partner/webhook
 * Registers the GDS callback URL. Returns the signing secret once on create.
 */
export async function PUT(request: NextRequest) {
  const auth = await requirePartnerApiKey(request);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const url = asOptionalString(body.url);
  if (!url || !isHttpsUrl(url)) {
    return NextResponse.json(
      {
        success: false,
        message: "A valid https webhook url is required (localhost allowed).",
      },
      { status: 400 },
    );
  }

  const existing = await prisma.partnerWebhook.findUnique({
    where: { operatorId: auth.partner.id },
  });
  const rotate = body.rotateSecret === true;
  const secret =
    !existing || rotate ? randomBytes(32).toString("hex") : existing.secret;

  const hook = await prisma.partnerWebhook.upsert({
    where: { operatorId: auth.partner.id },
    create: {
      operatorId: auth.partner.id,
      url,
      secret,
      isActive: true,
    },
    update: {
      url,
      isActive: true,
      ...(rotate || !existing ? { secret } : {}),
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      url: hook.url,
      isActive: hook.isActive,
      ...(!existing || rotate ? { secret } : {}),
    },
    message:
      !existing || rotate
        ? "Store the webhook secret now — it is not shown again."
        : "Webhook URL updated.",
  });
}
