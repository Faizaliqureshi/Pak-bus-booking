import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  isAdminJwtRole,
  verifyAccessToken,
} from "@/lib/jwt";

/**
 * Next.js 16 request proxy (replaces deprecated middleware.ts).
 * Gates every /api/admin/* request with a signed HttpOnly JWT.
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const verified = await verifyAccessToken(token);
  if (!verified.ok) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  if (!isAdminJwtRole(verified.payload.role)) {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 },
    );
  }

  const headers = new Headers(request.headers);
  headers.set("x-ticketpass-user-id", verified.payload.sub);
  headers.set("x-ticketpass-role", verified.payload.role);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/api/admin/:path*"],
};
