import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ensureDemoRewardActivity,
  getOrCreateRewardsAccount,
  serializeRewardTx,
} from "@/lib/rewards";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Please sign in." },
        { status: 401 },
      );
    }

    const account = await getOrCreateRewardsAccount(session.id);
    await ensureDemoRewardActivity(account.id);

    const fresh = await prisma.rewardsAccount.findUniqueOrThrow({
      where: { id: account.id },
    });

    const transactions = await prisma.rewardTransaction.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const soonestExpiry = transactions
      .filter((t) => t.status === "REWARDED" && t.expiresAt)
      .sort(
        (a, b) =>
          (a.expiresAt?.getTime() ?? Infinity) -
          (b.expiresAt?.getTime() ?? Infinity),
      )[0];

    return NextResponse.json({
      success: true,
      data: {
        balance: Number(fresh.balance),
        userName: session.name,
        expiringAmount: soonestExpiry ? Number(soonestExpiry.amount) : 0,
        expiringOn: soonestExpiry?.expiresAt?.toISOString() ?? null,
        transactions: transactions.map(serializeRewardTx),
      },
    });
  } catch (error) {
    console.error("[GET /api/account/rewards]", error);
    return NextResponse.json(
      { success: false, message: "Could not load rewards." },
      { status: 500 },
    );
  }
}
