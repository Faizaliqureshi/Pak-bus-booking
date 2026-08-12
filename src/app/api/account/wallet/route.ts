import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getOrCreateWallet,
  serializeWalletTx,
} from "@/lib/wallet";

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

    const wallet = await getOrCreateWallet(session.id);
    const transactions = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: {
        balance: Number(wallet.balance),
        currency: wallet.currency,
        updatedAt: wallet.updatedAt.toISOString(),
        userName: session.name,
        transactions: transactions.map(serializeWalletTx),
      },
    });
  } catch (error) {
    console.error("[GET /api/account/wallet]", error);
    return NextResponse.json(
      { success: false, message: "Could not load wallet." },
      { status: 500 },
    );
  }
}
