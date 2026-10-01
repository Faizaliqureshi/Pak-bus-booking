import { NextResponse } from "next/server";
import { listCompanyPolicies } from "@/lib/cancel-policy";

export const runtime = "nodejs";

/** Public company-wise cancellation slabs. */
export async function GET() {
  try {
    const policies = await listCompanyPolicies();
    return NextResponse.json({ success: true, data: policies });
  } catch (error) {
    console.error("[GET /api/cancel-policies]", error);
    return NextResponse.json(
      { success: false, message: "Could not load company cancellation policies." },
      { status: 500 },
    );
  }
}
