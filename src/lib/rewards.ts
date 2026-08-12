import { prisma } from "@/lib/prisma";

export async function getOrCreateRewardsAccount(userId: string) {
  const existing = await prisma.rewardsAccount.findUnique({
    where: { userId },
  });
  if (existing) return existing;
  return prisma.rewardsAccount.create({
    data: { userId, balance: 0 },
  });
}

/** Seed a realistic demo ledger once for empty accounts */
export async function ensureDemoRewardActivity(accountId: string) {
  const count = await prisma.rewardTransaction.count({
    where: { accountId },
  });
  if (count > 0) return;

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  await prisma.rewardTransaction.createMany({
    data: [
      {
        accountId,
        type: "EARN",
        status: "REWARDED",
        amount: 295,
        title: "Karachi → Lahore",
        orderId: "6019655",
        expiresAt: new Date(now + 365 * day),
        createdAt: new Date(now - 4 * day),
      },
      {
        accountId,
        type: "EARN",
        status: "REWARDED",
        amount: 225,
        title: "Lahore → Islamabad",
        orderId: "6018120",
        expiresAt: new Date(now + 300 * day),
        createdAt: new Date(now - 10 * day),
      },
      {
        accountId,
        type: "REDEEM",
        status: "USED",
        amount: 250,
        title: "Redeemed on bus booking",
        orderId: "6017001",
        createdAt: new Date(now - 12 * day),
      },
      {
        accountId,
        type: "EARN",
        status: "PENDING",
        amount: 180,
        title: "Multan → Karachi",
        orderId: "6020100",
        expiresAt: new Date(now + 365 * day),
        createdAt: new Date(now - 1 * day),
      },
      {
        accountId,
        type: "CANCEL",
        status: "CANCELLED",
        amount: 522,
        title: "Islamabad → Peshawar",
        orderId: "6015402",
        createdAt: new Date(now - 20 * day),
      },
      {
        accountId,
        type: "EXPIRE",
        status: "EXPIRED",
        amount: 55,
        title: "Expired Safar Cash",
        orderId: null,
        createdAt: new Date(now - 40 * day),
      },
    ],
  });

  // Active balance = rewarded earns - used redeems (pending/cancelled/expired excluded)
  const rewarded = 295 + 225;
  const used = 250;
  await prisma.rewardsAccount.update({
    where: { id: accountId },
    data: { balance: rewarded - used },
  });
}

export function serializeRewardTx(tx: {
  id: string;
  type: string;
  status: string;
  amount: { toString(): string } | number;
  title: string;
  orderId: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: tx.id,
    type: tx.type,
    status: tx.status,
    amount: Number(tx.amount),
    title: tx.title,
    orderId: tx.orderId,
    expiresAt: tx.expiresAt?.toISOString() ?? null,
    createdAt: tx.createdAt.toISOString(),
  };
}
