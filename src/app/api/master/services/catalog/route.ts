import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import {
  getCatalogPayload,
  parseCatalogKind,
  saveCatalogPayload,
  type CatalogPayload,
} from "@/lib/service-catalog";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  const kind = parseCatalogKind(request.nextUrl.searchParams.get("kind") ?? "");
  if (!kind) {
    return NextResponse.json(
      { success: false, message: "Unknown service." },
      { status: 400 },
    );
  }
  const payload = await getCatalogPayload(kind);
  return NextResponse.json({ success: true, data: payload });
}

export async function PUT(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    const body = (await request.json()) as {
      kind?: string;
      payload?: CatalogPayload;
    };
    const kind = parseCatalogKind(body.kind ?? "");
    if (!kind || !body.payload) {
      return NextResponse.json(
        { success: false, message: "Catalog payload is required." },
        { status: 400 },
      );
    }
    const payload = await saveCatalogPayload(kind, body.payload);
    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    console.error("[PUT /api/master/services/catalog]", error);
    return NextResponse.json(
      { success: false, message: "Could not save catalog." },
      { status: 500 },
    );
  }
}
