import { NextRequest, NextResponse } from "next/server";
import { getPartnerUser } from "@/lib/admin-auth";
import {
  getCompanyPolicy,
  saveCompanyPolicy,
} from "@/lib/cancel-policy";

export const runtime = "nodejs";

export async function GET() {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  const policy = await getCompanyPolicy(partner.id, partner.name);
  return NextResponse.json({ success: true, data: policy });
}

export async function PUT(request: NextRequest) {
  const partner = await getPartnerUser();
  if (!partner) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 },
    );
  }
  const input = (body ?? {}) as {
    passengerCancelEnabled?: unknown;
    cutoffHours?: unknown;
    tiers?: unknown;
    note?: unknown;
  };
  const policy = await saveCompanyPolicy(partner.id, partner.name, input);
  return NextResponse.json({ success: true, data: policy });
}
