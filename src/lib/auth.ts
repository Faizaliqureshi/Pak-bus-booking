import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signHmac } from "@/lib/password";

export {
  hashPassword,
  verifyPassword,
  generateTempPassword,
} from "@/lib/password";

const SESSION_COOKIE = "ticketpass_session";
const SESSION_DAYS = 14;

function sessionSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.TICKET_QR_SECRET ||
    "ticketpass-dev-session-secret"
  );
}

export function createSessionToken(userId: string): string {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${exp}`;
  return `${payload}.${signHmac(payload, sessionSecret())}`;
}

export function parseSessionToken(
  token: string | undefined | null,
): { userId: string; exp: number } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts;
  const payload = `${userId}.${expStr}`;
  const expected = signHmac(payload, sessionSecret());
  try {
    if (
      !timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"))
    ) {
      return null;
    }
  } catch {
    return null;
  }
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  return { userId, exp };
}

export async function setSessionCookie(userId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSessionUser() {
  const jar = await cookies();
  const parsed = parseSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!parsed) return null;
  const user = await prisma.user.findUnique({
    where: { id: parsed.userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      title: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      country: true,
      state: true,
      city: true,
      passportNumber: true,
      nicNumber: true,
      createdById: true,
    },
  });
  return user;
}

export function normalizePkPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("92") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) {
    return `+92${digits.slice(1)}`;
  }
  if (digits.length === 10) return `+92${digits}`;
  return phone.trim();
}

export function pkMobileLocal(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("92") && digits.length >= 12) return digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) return digits.slice(1);
  return digits;
}

export function staffHomeForRole(role: string): string {
  // Unified Master portal for MASTER + ADMIN; Partner fleet; passengers → home.
  if (role === "MASTER" || role === "ADMIN") return "/master";
  if (role === "OPERATOR") return "/partner/fleet";
  return "/";
}

export { SESSION_COOKIE };
