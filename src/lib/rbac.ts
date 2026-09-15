import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { StaffUser } from "@/lib/admin-auth";
import {
  ACCESS_COOKIE,
  isAdminJwtRole,
  toJwtAccessRole,
  verifyAccessToken,
  type AccessTokenPayload,
} from "@/lib/jwt";

export type AdminJwtFailure = {
  ok: false;
  status: 401 | 403;
  message: string;
};

export type AdminJwtSuccess = {
  ok: true;
  user: StaffUser;
  jwt: AccessTokenPayload;
};

/**
 * Backend RBAC wrapper for /api/admin/*.
 * Reads the HttpOnly JWT, verifies signature/expiry, then requires
 * payload.role === "SYSTEM_ADMIN" | "OPERATOR".
 */
export async function requireAdminJwt(
  request?: NextRequest,
): Promise<AdminJwtSuccess | AdminJwtFailure> {
  const token = request
    ? request.cookies.get(ACCESS_COOKIE)?.value
    : (await cookies()).get(ACCESS_COOKIE)?.value;

  if (!token) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  const verified = await verifyAccessToken(token);
  if (!verified.ok) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  if (!isAdminJwtRole(verified.payload.role)) {
    return { ok: false, status: 403, message: "Forbidden" };
  }

  const user = await prisma.user.findUnique({
    where: { id: verified.payload.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdById: true,
    },
  });

  if (!user) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  if (!isAdminJwtRole(toJwtAccessRole(user.role))) {
    return { ok: false, status: 403, message: "Forbidden" };
  }

  return {
    ok: true,
    jwt: verified.payload,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdById: user.createdById,
    },
  };
}

export function adminJwtResponse(result: AdminJwtFailure): NextResponse {
  return NextResponse.json(
    { success: false, message: result.message },
    { status: result.status },
  );
}
