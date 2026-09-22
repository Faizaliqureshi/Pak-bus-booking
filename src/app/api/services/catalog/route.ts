import { NextRequest, NextResponse } from "next/server";
import { getCatalogPayload, parseCatalogKind } from "@/lib/service-catalog";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const kind = parseCatalogKind(request.nextUrl.searchParams.get("kind") ?? "");
  if (!kind) {
    return NextResponse.json(
      { success: false, message: "Unknown service." },
      { status: 400 },
    );
  }
  try {
    const payload = await getCatalogPayload(kind);
    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    console.error("[GET /api/services/catalog]", error);
    return NextResponse.json(
      { success: false, message: "Could not load catalog." },
      { status: 500 },
    );
  }
}
