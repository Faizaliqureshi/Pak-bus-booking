import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export async function getOrCreateWallet(userId: string) {
  const existing = await prisma.wallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.wallet.create({
    data: { userId, balance: 0, currency: "PKR" },
  });
}

export async function creditWalletRefund(
  userId: string,
  amount: number,
  description: string,
  reference: string,
) {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const wallet = await getOrCreateWallet(userId);
  const [updated] = await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: amount } },
    }),
    prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "REFUND",
        status: "COMPLETED",
        amount,
        description,
        reference,
      },
    }),
  ]);
  return updated;
}

export function walletReference(prefix: string): string {
  return `${prefix}${randomBytes(3).toString("hex").toUpperCase()}${Date.now().toString().slice(-4)}`;
}

export function serializeWalletTx(tx: {
  id: string;
  type: string;
  status: string;
  amount: { toString(): string } | number;
  description: string;
  reference: string;
  bankName: string | null;
  iban?: string | null;
  holderName?: string | null;
  createdAt: Date;
}) {
  return {
    id: tx.id,
    type: tx.type,
    status: tx.status,
    amount: Number(tx.amount),
    description: tx.description,
    reference: tx.reference,
    bankName: tx.bankName,
    iban: tx.iban ?? null,
    holderName: tx.holderName ?? null,
    createdAt: tx.createdAt.toISOString(),
  };
}
