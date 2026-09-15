import { NextRequest, NextResponse } from "next/server";
import { requirePartnerApiKey } from "@/lib/partner-api";

export const runtime = "nodejs";

/** GET /api/v1/partner/me */
export async function GET(request: NextRequest) {
  const auth = await requirePartnerApiKey(request);
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    success: true,
    data: {
      id: auth.partner.id,
      name: auth.partner.name,
      email: auth.partner.email,
      role: auth.partner.role,
    },
  });
}
