"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type Tx = {
  id: string;
  type: string;
  status: string;
  amount: number;
  description: string;
  reference: string;
  bankName: string | null;
  createdAt: string;
};

function formatRs(amount: number): string {
  return `Rs ${Math.round(amount).toLocaleString("en-PK")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy}, ${hh}:${min}`;
}

function statusBadge(status: string) {
  const s = status.toUpperCase();
  if (s === "PROCESSING" || s === "PENDING") {
    return "bg-[#22c55e] text-white";
  }
  if (s === "COMPLETED") return "bg-[#0a2f6b] text-white";
  if (s === "FAILED" || s === "CANCELLED") return "bg-red-500 text-white";
  return "bg-zinc-400 text-white";
}

export function WalletClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [userName, setUserName] = useState("");
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/account/wallet");
        const json = await res.json();
        if (!res.ok || !json.success) {
          if (res.status === 401) {
            router.replace("/auth/sign-in");
            return;
          }
          throw new Error(json.message || "Could not load wallet.");
        }
        setBalance(json.data.balance);
        setUserName(json.data.userName);
        setTransactions(json.data.transactions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load wallet.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router],
  );

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
    <div className="overflow-hidden rounded-2xl border border-[#cfd7e6] bg-white shadow-sm">
      <div className="bg-[#0a2f6b] px-5 py-3">
        <h1 className="text-sm font-bold tracking-[0.12em] text-white uppercase">
          My Wallet
        </h1>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(105deg,#08305f_0%,#1a5fad_55%,#4fa3e8_100%)] p-5 text-white shadow-md sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <p className="text-base font-medium sm:text-lg">
              Balance : {formatRs(balance)}
            </p>
            <div className="text-right">
              <p className="font-heading text-lg font-bold tracking-tight sm:text-xl">
                Safar<span className="text-[#f5a623]">PK</span>
              </p>
              <button
                type="button"
                title="Refresh"
                onClick={() => void load(true)}
                className="mt-2 inline-flex size-8 items-center justify-center rounded-md bg-[#f5a623] text-white hover:bg-[#e09612]"
              >
                <RefreshCw
                  className={cn("size-3.5", refreshing && "animate-spin")}
                  strokeWidth={2.5}
                />
              </button>
            </div>
          </div>

          <div className="mt-10 flex items-end justify-between gap-3">
            <p className="font-heading text-xl font-bold tracking-wide uppercase sm:text-2xl">
              {userName || "Customer"}
            </p>
            <span className="rounded-full bg-[#f5a623] px-3 py-1 text-xs font-semibold text-white">
              Primary
            </span>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <div>
          <h2 className="text-center font-heading text-xl font-semibold text-[#0a2f6b]">
            Transaction History
          </h2>
          <p className="mt-1 text-center text-sm text-[#0a2f6b]/55">
            Keep track of your wallet transactions
          </p>

          <div className="mt-4 overflow-x-auto rounded-lg border border-[#0a2f6b]/25">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#eef3fb] text-[#0a2f6b]">
                <tr>
                  <th className="border-b border-[#0a2f6b]/20 px-3 py-2.5 font-semibold">
                    Date
                  </th>
                  <th className="border-b border-[#0a2f6b]/20 px-3 py-2.5 font-semibold">
                    Description
                  </th>
                  <th className="border-b border-[#0a2f6b]/20 px-3 py-2.5 font-semibold">
                    Reference#
                  </th>
                  <th className="border-b border-[#0a2f6b]/20 px-3 py-2.5 font-semibold">
                    Amount
                  </th>
                  <th className="border-b border-[#0a2f6b]/20 px-3 py-2.5 font-semibold">
                    Type
                  </th>
                  <th className="border-b border-[#0a2f6b]/20 px-3 py-2.5 font-semibold">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-8 text-center text-[#0a2f6b]/50"
                    >
                      No transactions yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="border-t border-[#0a2f6b]/10">
                      <td className="px-3 py-3 whitespace-nowrap text-[#0a2f6b]">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="px-3 py-3 text-[#0a2f6b]/80">
                        {tx.description}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-[#0a2f6b]">
                        {tx.reference}
                      </td>
                      <td className="px-3 py-3 font-medium text-[#0a2f6b]">
                        {Math.round(tx.amount).toLocaleString("en-PK")}
                      </td>
                      <td className="px-3 py-3 capitalize text-[#0a2f6b]/80">
                        {tx.type.toLowerCase()}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                            statusBadge(tx.status),
                          )}
                        >
                          {tx.status === "PROCESSING"
                            ? "Processing"
                            : tx.status.toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
