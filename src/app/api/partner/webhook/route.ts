import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getPartnerUser } from "@/lib/admin-auth";
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

export async function GET() {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const hook = await prisma.partnerWebhook.findUnique({
    where: { operatorId: partner.id },
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

export async function PUT(request: Request) {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: { url?: string; rotateSecret?: boolean };
  try {
    body = (await request.json()) as { url?: string; rotateSecret?: boolean };
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const url = body.url?.trim() ?? "";
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
    where: { operatorId: partner.id },
  });
  const rotate = body.rotateSecret === true;
  const secret =
    !existing || rotate ? randomBytes(32).toString("hex") : existing.secret;

  const hook = await prisma.partnerWebhook.upsert({
    where: { operatorId: partner.id },
    create: {
      operatorId: partner.id,
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
