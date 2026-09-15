import { NextResponse } from "next/server";
import { getPartnerUser } from "@/lib/admin-auth";
import { generatePartnerApiKey } from "@/lib/partner-api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** GET /api/partner/api-keys — list prefixes (never the secret). */
export async function GET() {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const keys = await prisma.partnerApiKey.findMany({
    where: { operatorId: partner.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      isActive: true,
      lastUsedAt: true,
      createdAt: true,
      revokedAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: keys.map((k) => ({
      ...k,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
      revokedAt: k.revokedAt?.toISOString() ?? null,
    })),
  });
}

/** POST /api/partner/api-keys — mint a live key (plaintext returned once). */
export async function POST(request: Request) {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  let name = "Live key";
  try {
    const body = (await request.json()) as { name?: string };
    if (body.name?.trim()) name = body.name.trim().slice(0, 80);
  } catch {
    // empty body is fine
  }

  const generated = generatePartnerApiKey();
  const record = await prisma.partnerApiKey.create({
    data: {
      operatorId: partner.id,
      name,
      keyPrefix: generated.prefix,
      keyHash: generated.hash,
    },
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        id: record.id,
        name: record.name,
        keyPrefix: record.keyPrefix,
        apiKey: generated.plaintext,
        createdAt: record.createdAt.toISOString(),
      },
      message: "Copy this API key now. TicketPass will not show it again.",
    },
    { status: 201 },
  );
}
