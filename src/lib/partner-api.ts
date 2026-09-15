import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PARTNER_API_KEY_PREFIX = "tp_live_";

export type PartnerActor = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  apiKeyId: string;
};

export function hashPartnerApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext.trim()).digest("hex");
}

export function generatePartnerApiKey(): {
  plaintext: string;
  hash: string;
  prefix: string;
} {
  const plaintext = `${PARTNER_API_KEY_PREFIX}${randomBytes(32).toString("hex")}`;
  return {
    plaintext,
    hash: hashPartnerApiKey(plaintext),
    prefix: plaintext.slice(0, 16),
  };
}

function extractApiKey(request: NextRequest): string | null {
  const header = request.headers.get("authorization")?.trim();
  if (header?.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  const named = request.headers.get("x-api-key")?.trim();
  return named || null;
}

export function partnerUnauthorized(
  message = "Unauthorized",
  status: 401 | 403 = 401,
): NextResponse {
  return NextResponse.json({ success: false, message }, { status });
}

export async function requirePartnerApiKey(
  request: NextRequest,
): Promise<
  { ok: true; partner: PartnerActor } | { ok: false; response: NextResponse }
> {
  const token = extractApiKey(request);
  if (!token || !token.startsWith(PARTNER_API_KEY_PREFIX)) {
    return { ok: false, response: partnerUnauthorized() };
  }

  const keyHash = hashPartnerApiKey(token);
  const record = await prisma.partnerApiKey.findUnique({
    where: { keyHash },
    include: {
      operator: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  if (!record?.isActive || record.revokedAt) {
    return { ok: false, response: partnerUnauthorized() };
  }

  if (record.operator.role !== UserRole.OPERATOR) {
    return { ok: false, response: partnerUnauthorized("Forbidden", 403) };
  }

  void prisma.partnerApiKey
    .update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => undefined);

  return {
    ok: true,
    partner: {
      id: record.operator.id,
      name: record.operator.name,
      email: record.operator.email,
      role: record.operator.role,
      apiKeyId: record.id,
    },
  };
}

export function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
