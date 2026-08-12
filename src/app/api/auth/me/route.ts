import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Not signed in." },
      { status: 401 },
    );
  }
  return NextResponse.json({ success: true, data: user });
}
