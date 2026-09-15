"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Signal, Wallet } from "lucide-react";

type Tx = {
  id: string;
  type: string;
  status: string;
  amount: number;
  description: string;
  reference: string;
  createdAt: string;
};

function formatPkr(amount: number): string {
  return `PKR ${Math.round(amount).toLocaleString("en-PK")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function WalletClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/wallet");
      const json = await res.json();
      if (!res.ok || !json.success) {
        if (res.status === 401) {
          router.replace("/auth/sign-in?next=/account/wallet");
          return;
        }
        throw new Error(json.message || "Could not load wallet.");
      }
      setBalance(json.data.balance);
      setTransactions(json.data.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load wallet.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[#0a2f6b]">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#e6ebf2] bg-white px-5 py-6 shadow-sm sm:px-6">
        <p className="flex items-center gap-2 text-sm text-[#64748b]">
          <Signal className="size-4 text-[#0a2f6b]" />
          Balance
        </p>
        <p className="mt-2 font-heading text-3xl font-semibold tracking-tight text-[#0a2f6b]">
          {formatPkr(balance)}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="rounded-xl border border-[#e6ebf2] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-heading text-xl font-semibold text-[#1a2333] sm:text-2xl">
            Transaction History
          </h1>
          <button
            type="button"
            className="text-sm font-semibold text-[#0a2f6b] hover:underline"
            onClick={() => void load()}
          >
            View All
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[#64748b]">
              <tr className="border-b border-[#e6ebf2]">
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">Amount</th>
                <th className="px-3 py-3 font-medium">Order ID</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-16 text-center">
                    <Wallet className="mx-auto size-10 text-[#cbd5e1] stroke-[1.2]" />
                    <p className="mt-3 text-sm text-[#94a3b8]">No data</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-[#eef2f7]">
                    <td className="px-3 py-3 whitespace-nowrap text-[#1a2333]">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="px-3 py-3 capitalize text-[#475569]">
                      {tx.type.toLowerCase()}
                    </td>
                    <td className="px-3 py-3 font-medium text-[#1a2333]">
                      {formatPkr(tx.amount)}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-[#0a2f6b]">
                      {tx.reference}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
