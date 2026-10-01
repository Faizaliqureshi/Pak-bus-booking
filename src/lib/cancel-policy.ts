import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CancelTier = {
  minHours: number;
  refundPercent: number;
};

export type CompanyCancelPolicy = {
  operatorId: string;
  companyName: string;
  passengerCancelEnabled: boolean;
  cutoffHours: number;
  tiers: CancelTier[];
  note: string;
};

export const DEFAULT_CANCEL_TIERS: CancelTier[] = [
  { minHours: 24, refundPercent: 90 },
  { minHours: 12, refundPercent: 70 },
  { minHours: 6, refundPercent: 50 },
  { minHours: 2, refundPercent: 25 },
  { minHours: 0, refundPercent: 0 },
];

export function defaultCompanyPolicy(
  operatorId: string,
  companyName: string,
): CompanyCancelPolicy {
  return {
    operatorId,
    companyName,
    passengerCancelEnabled: true,
    cutoffHours: 2,
    tiers: DEFAULT_CANCEL_TIERS,
    note: "Refund is credited to the TicketPass Wallet as per this company's slab.",
  };
}

export function hoursUntilDeparture(departure: Date, now = new Date()): number {
  return (departure.getTime() - now.getTime()) / 3_600_000;
}

export function refundPercentForHours(
  tiers: CancelTier[],
  hoursBefore: number,
): number {
  const sorted = [...tiers].sort((a, b) => b.minHours - a.minHours);
  for (const tier of sorted) {
    if (hoursBefore >= tier.minHours) return clampPercent(tier.refundPercent);
  }
  return 0;
}

export function quoteCompanyRefund(input: {
  policy: CompanyCancelPolicy;
  departure: Date;
  fare: number;
  actor: "passenger" | "partner";
}): {
  allowed: boolean;
  reason: string | null;
  hoursBefore: number;
  refundPercent: number;
  refundAmount: number;
} {
  const hoursBefore = hoursUntilDeparture(input.departure);
  const refundPercent = refundPercentForHours(input.policy.tiers, hoursBefore);
  const refundAmount = Math.max(
    0,
    Math.round((input.fare * refundPercent) / 100),
  );

  if (input.actor === "partner") {
    return {
      allowed: true,
      reason: null,
      hoursBefore,
      refundPercent,
      refundAmount,
    };
  }

  if (!input.policy.passengerCancelEnabled) {
    return {
      allowed: false,
      reason: `${input.policy.companyName} does not allow online cancellation. Contact the operator.`,
      hoursBefore,
      refundPercent: 0,
      refundAmount: 0,
    };
  }
  if (hoursBefore <= 0) {
    return {
      allowed: false,
      reason: "This departure has already left.",
      hoursBefore,
      refundPercent: 0,
      refundAmount: 0,
    };
  }
  if (hoursBefore < input.policy.cutoffHours) {
    return {
      allowed: false,
      reason: `${input.policy.companyName} stops online cancellation ${input.policy.cutoffHours} hours before departure.`,
      hoursBefore,
      refundPercent: 0,
      refundAmount: 0,
    };
  }

  return {
    allowed: true,
    reason: null,
    hoursBefore,
    refundPercent,
    refundAmount,
  };
}

export function normalizeTiers(raw: unknown): CancelTier[] {
  const list = Array.isArray(raw) ? raw : DEFAULT_CANCEL_TIERS;
  const tiers = list
    .map((row) => {
      const item = row as { minHours?: unknown; refundPercent?: unknown };
      return {
        minHours: Math.max(0, Number(item.minHours) || 0),
        refundPercent: clampPercent(Number(item.refundPercent) || 0),
      };
    })
    .filter((tier) => Number.isFinite(tier.minHours))
    .sort((a, b) => b.minHours - a.minHours);
  return tiers.length > 0 ? tiers : DEFAULT_CANCEL_TIERS;
}

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function companyLabel(name: string): string {
  return name.replace(/\s+Operator$/i, "").trim() || name;
}

export async function getCompanyPolicy(
  operatorId: string,
  companyName?: string,
): Promise<CompanyCancelPolicy> {
  const [user, row] = await Promise.all([
    companyName
      ? Promise.resolve({ name: companyName })
      : prisma.user.findUnique({
          where: { id: operatorId },
          select: { name: true },
        }),
    prisma.operatorCancelPolicy.findUnique({ where: { operatorId } }),
  ]);
  const label = companyLabel(user?.name || companyName || "Operator");
  if (!row) return defaultCompanyPolicy(operatorId, label);
  return serializePolicyRecord({
    operatorId,
    companyName: label,
    passengerCancelEnabled: row.passengerCancelEnabled,
    cutoffHours: row.cutoffHours,
    tiers: row.tiers,
    note: row.note,
  });
}

export async function listCompanyPolicies(): Promise<CompanyCancelPolicy[]> {
  const partners = await prisma.user.findMany({
    where: { role: UserRole.OPERATOR },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const rows = await prisma.operatorCancelPolicy.findMany({
    where: { operatorId: { in: partners.map((p) => p.id) } },
  });
  const byId = new Map(rows.map((row) => [row.operatorId, row]));
  return partners.map((partner) => {
    const row = byId.get(partner.id);
    const label = companyLabel(partner.name);
    if (!row) return defaultCompanyPolicy(partner.id, label);
    return serializePolicyRecord({
      operatorId: partner.id,
      companyName: label,
      passengerCancelEnabled: row.passengerCancelEnabled,
      cutoffHours: row.cutoffHours,
      tiers: row.tiers,
      note: row.note,
    });
  });
}

export async function saveCompanyPolicy(
  operatorId: string,
  companyName: string,
  input: {
    passengerCancelEnabled?: unknown;
    cutoffHours?: unknown;
    tiers?: unknown;
    note?: unknown;
  },
): Promise<CompanyCancelPolicy> {
  const next = serializePolicyRecord({
    operatorId,
    companyName,
    passengerCancelEnabled: Boolean(input.passengerCancelEnabled ?? true),
    cutoffHours: Number(input.cutoffHours),
    tiers: input.tiers,
    note: typeof input.note === "string" ? input.note : null,
  });
  await prisma.operatorCancelPolicy.upsert({
    where: { operatorId },
    create: {
      operatorId,
      passengerCancelEnabled: next.passengerCancelEnabled,
      cutoffHours: next.cutoffHours,
      tiers: next.tiers,
      note: next.note,
    },
    update: {
      passengerCancelEnabled: next.passengerCancelEnabled,
      cutoffHours: next.cutoffHours,
      tiers: next.tiers,
      note: next.note,
    },
  });
  return next;
}

export function serializePolicyRecord(input: {
  operatorId: string;
  companyName: string;
  passengerCancelEnabled?: boolean;
  cutoffHours?: number;
  tiers?: unknown;
  note?: string | null;
}): CompanyCancelPolicy {
  const fallback = defaultCompanyPolicy(input.operatorId, input.companyName);
  return {
    operatorId: input.operatorId,
    companyName: input.companyName,
    passengerCancelEnabled: input.passengerCancelEnabled ?? true,
    cutoffHours: Math.max(0, Number(input.cutoffHours) || 0),
    tiers: normalizeTiers(input.tiers),
    note: String(input.note ?? fallback.note).trim() || fallback.note,
  };
}
