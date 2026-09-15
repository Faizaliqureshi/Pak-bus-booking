import { SignJWT, jwtVerify, errors as JoseErrors } from "jose";

export const ACCESS_COOKIE = "ticketpass_access";
export const JWT_ISSUER = "ticketpass";
export const ACCESS_TTL_DAYS = 14;

export type JwtAccessRole =
  | "SYSTEM_ADMIN"
  | "OPERATOR"
  | "CONDUCTOR"
  | "PASSENGER";

export type AdminJwtRole = "SYSTEM_ADMIN" | "OPERATOR";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: JwtAccessRole;
};

export const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ACCESS_TTL_DAYS * 24 * 60 * 60,
};

function jwtSecretKey(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.TICKET_QR_SECRET ||
    "ticketpass-dev-jwt-secret";
  return new TextEncoder().encode(secret);
}

/** Prisma MASTER/ADMIN map to JWT SYSTEM_ADMIN so live staff keep admin access. */
export function toJwtAccessRole(role: string): JwtAccessRole {
  if (role === "MASTER" || role === "ADMIN" || role === "SYSTEM_ADMIN") {
    return "SYSTEM_ADMIN";
  }
  if (role === "OPERATOR") return "OPERATOR";
  if (role === "CONDUCTOR") return "CONDUCTOR";
  return "PASSENGER";
}

export function isAdminJwtRole(role: unknown): role is AdminJwtRole {
  return role === "SYSTEM_ADMIN" || role === "OPERATOR";
}

export async function signAccessToken(
  profile: AccessTokenPayload,
): Promise<string> {
  return new SignJWT({
    email: profile.email,
    name: profile.name,
    role: profile.role,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(profile.sub)
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_DAYS}d`)
    .sign(jwtSecretKey());
}

export async function verifyAccessToken(token: string): Promise<
  | { ok: true; payload: AccessTokenPayload }
  | { ok: false; reason: "invalid" | "expired" }
> {
  try {
    const { payload } = await jwtVerify(token, jwtSecretKey(), {
      issuer: JWT_ISSUER,
      algorithms: ["HS256"],
    });

    if (
      typeof payload.sub !== "string" ||
      payload.sub.length === 0 ||
      typeof payload.role !== "string"
    ) {
      return { ok: false, reason: "invalid" };
    }

    return {
      ok: true,
      payload: {
        sub: payload.sub,
        email: typeof payload.email === "string" ? payload.email : "",
        name: typeof payload.name === "string" ? payload.name : "",
        role: payload.role as JwtAccessRole,
      },
    };
  } catch (error) {
    if (error instanceof JoseErrors.JWTExpired) {
      return { ok: false, reason: "expired" };
    }
    return { ok: false, reason: "invalid" };
  }
}
