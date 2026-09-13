import { UserRole } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";

export type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdById?: string | null;
};

const ADMIN_CONSOLE_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.MASTER];

/**
 * Session user for the unified Master portal (MASTER or ADMIN).
 * Partners use /partner; passengers use /auth.
 */
export async function getAdminUser(): Promise<StaffUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (!ADMIN_CONSOLE_ROLES.includes(user.role)) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdById: user.createdById,
  };
}

/** Master-only actions (e.g. create platform staff). */
export async function getMasterUser(): Promise<StaffUser | null> {
  const user = await getSessionUser();
  if (!user || user.role !== UserRole.MASTER) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdById: user.createdById,
  };
}

export async function getPartnerUser(): Promise<StaffUser | null> {
  const user = await getSessionUser();
  if (!user || user.role !== UserRole.OPERATOR) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdById: user.createdById,
  };
}

export function assertAdminRole(role: UserRole): boolean {
  return ADMIN_CONSOLE_ROLES.includes(role);
}

export function dayBoundsPkt(date = new Date()): { start: Date; end: Date } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const start = new Date(`${parts}T00:00:00+05:00`);
  const end = new Date(`${parts}T23:59:59.999+05:00`);
  return { start, end };
}
