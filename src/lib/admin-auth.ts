import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

const ADMIN_ROLES: UserRole[] = [UserRole.OPERATOR, UserRole.ADMIN];

/**
 * Placeholder admin session — uses seeded operator/admin until real auth lands.
 * Replace with NextAuth / session cookies in production.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: "operator@daewoo.pk", role: UserRole.OPERATOR },
        { role: { in: ADMIN_ROLES } },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user || !ADMIN_ROLES.includes(user.role)) return null;
  return user;
}

export function assertAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function dayBoundsPkt(date = new Date()): { start: Date; end: Date } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  // en-CA => YYYY-MM-DD
  const start = new Date(`${parts}T00:00:00+05:00`);
  const end = new Date(`${parts}T23:59:59.999+05:00`);
  return { start, end };
}
