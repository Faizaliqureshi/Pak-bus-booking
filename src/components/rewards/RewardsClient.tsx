"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Coins, Loader2, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

type RewardTx = {
  id: string;
  type: string;
  status: string;
  amount: number;
  title: string;
  orderId: string | null;
  expiresAt: string | null;
  createdAt: string;
};

type FilterId = "ALL" | "PENDING" | "REWARDED" | "USED" | "EXPIRED";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "REWARDED", label: "Rewarded" },
  { id: "USED", label: "Used" },
  { id: "EXPIRED", label: "Expired" },
];

const FAQS = [
  {
    q: "What is TicketPass Rewards?",
    a: "TicketPass Rewards is Pakistan’s travel loyalty programme. Earn Pass Cash on eligible bus bookings and redeem it on future trips.",
  },
  {
    q: "What is Pass Cash?",
    a: "Pass Cash is reward credit in PKR. It appears in your balance after a trip is completed and can be applied at checkout within the redemption limits.",
  },
  {
    q: "When do I receive my reward?",
    a: "Rewards usually credit after your trip is completed. Pending items show while the booking is still in progress.",
  },
  {
    q: "Do rewards expire?",
    a: "Yes. Each rewarded amount shows an expiry date. Use Pass Cash before it expires so it stays in your balance.",
  },
  {
    q: "Can I withdraw Pass Cash?",
    a: "No. Pass Cash is for travel redemptions only and cannot be withdrawn to a bank account.",
  },
];

function formatPkr(amount: number): string {
  return `PKR ${Math.round(amount).toLocaleString("en-PK")}`;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatExpiry(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

export function RewardsClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [expiringAmount, setExpiringAmount] = useState(0);
  const [expiringOn, setExpiringOn] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<RewardTx[]>([]);
  const [filter, setFilter] = useState<FilterId>("ALL");
  const [guideTab, setGuideTab] = useState<"earn" | "use">("earn");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [visible, setVisible] = useState(5);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/rewards");
      const json = await res.json();
      if (!res.ok || !json.success) {
        if (res.status === 401) {
          router.replace("/auth/sign-in?next=/air/sasta-rewards");
          return;
        }
        throw new Error(json.message || "Could not load rewards.");
      }
      setBalance(json.data.balance);
      setExpiringAmount(json.data.expiringAmount ?? 0);
      setExpiringOn(json.data.expiringOn);
      setTransactions(json.data.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rewards.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return transactions;
    return transactions.filter((t) => t.status === filter);
  }, [transactions, filter]);

  const shown = filtered.slice(0, visible);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[#0a2f6b]">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold text-[#0a2f6b] sm:text-3xl">
          TicketPass Rewards
        </h1>
        <p className="mt-1 text-sm text-[#0a2f6b]/65">
          Pakistan’s ultimate travel loyalty programme.
        </p>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-[#0a2f6b]/60">Pass Cash Balance</p>
                <p className="mt-1 font-heading text-3xl font-bold text-[#0a2f6b]">
                  {formatPkr(balance)}
                </p>
                {expiringOn && expiringAmount > 0 ? (
                  <p className="mt-2 text-xs text-[#0a2f6b]/55">
                    {formatPkr(expiringAmount)} expiring on{" "}
                    {formatExpiry(expiringOn)}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-[#0a2f6b]/45">
                    No Pass Cash expiring soon
                  </p>
                )}
              </div>
              <div className="flex size-12 items-center justify-center rounded-full bg-[#fff4e0] text-[#f5a623]">
                <Coins className="size-6" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-lg border border-dashed border-[#0a2f6b]/25 bg-[#f8fafc]">
                <QrCode className="size-8 text-[#0a2f6b]/50" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0a2f6b]">
                  Redeem in the TicketPass app
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#0a2f6b]/55">
                  App-only deals and faster Pass Cash redemption.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-4 shadow-sm">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGuideTab("earn")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  guideTab === "earn"
                    ? "bg-[#0a2f6b] text-white"
                    : "bg-[#eef3fb] text-[#0a2f6b]",
                )}
              >
                How to Earn
              </button>
              <button
                type="button"
                onClick={() => setGuideTab("use")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  guideTab === "use"
                    ? "bg-[#0a2f6b] text-white"
                    : "bg-[#eef3fb] text-[#0a2f6b]",
                )}
              >
                How to Use
              </button>
            </div>
            <div className="mt-4 rounded-xl bg-[#f3f6fb] p-4 text-sm text-[#0a2f6b]/75">
              {guideTab === "earn" ? (
                <p>
                  Book buses on TicketPass. After your trip is completed, Pass Cash
                  is added to your rewards wallet based on order type and fare
                  volume.
                </p>
              ) : (
                <p>
                  Apply Pass Cash at checkout on eligible bookings. You can
                  redeem up to Rs 500 on your next trip, subject to offer rules.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-semibold text-[#0a2f6b]">FAQs</p>
            <div className="divide-y divide-[#0a2f6b]/10">
              {FAQS.map((faq, index) => {
                const open = openFaq === index;
                return (
                  <div key={faq.q}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : index)}
                      className="flex w-full items-center justify-between gap-2 py-3 text-left text-sm font-medium text-[#0a2f6b]"
                    >
                      {faq.q}
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 transition",
                          open && "rotate-180",
                        )}
                      />
                    </button>
                    {open ? (
                      <p className="pb-3 text-xs leading-relaxed text-[#0a2f6b]/65">
                        {faq.a}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-heading text-xl font-semibold text-[#0a2f6b]">
            Your rewards activity
          </h2>
          <p className="mt-1 text-sm text-[#0a2f6b]/60">
            Get rewarded with Pass Cash on every booking. Redeem up to Rs 500
            on your next trip!
          </p>

          <div className="mt-5 flex flex-wrap gap-2 border-b border-[#0a2f6b]/10 pb-3">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setFilter(item.id);
                  setVisible(5);
                }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  filter === item.id
                    ? "bg-[#0a2f6b] text-white"
                    : "text-[#0a2f6b]/70 hover:bg-[#eef3fb]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <ul className="mt-2 divide-y divide-[#0a2f6b]/8">
            {shown.length === 0 ? (
              <li className="py-10 text-center text-sm text-[#0a2f6b]/50">
                No rewards activity in this filter.
              </li>
            ) : (
              shown.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-start justify-between gap-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[#0a2f6b]">{tx.title}</p>
                    <p className="mt-1 text-xs text-[#0a2f6b]/55">
                      {tx.orderId ? `Order ID ${tx.orderId}` : "TicketPass Rewards"}{" "}
                      | {formatShortDate(tx.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <AmountDisplay tx={tx} />
                  </div>
                </li>
              ))
            )}
          </ul>

          {visible < filtered.length ? (
            <button
              type="button"
              onClick={() => setVisible((v) => v + 5)}
              className="mt-2 w-full py-3 text-sm font-semibold text-[#0a2f6b] hover:underline"
            >
              See more
            </button>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function AmountDisplay({ tx }: { tx: RewardTx }) {
  if (tx.status === "USED" || tx.type === "REDEEM") {
    return (
      <>
        <p className="font-semibold text-red-600">
          - {formatPkr(tx.amount)}
        </p>
        <p className="mt-0.5 text-xs text-[#0a2f6b]/50">Redeemed</p>
      </>
    );
  }
  if (tx.status === "CANCELLED" || tx.type === "CANCEL") {
    return (
      <>
        <p className="font-semibold text-[#6b7280]">{formatPkr(tx.amount)}</p>
        <p className="mt-0.5 text-xs text-[#0a2f6b]/50">Order Cancelled</p>
      </>
    );
  }
  if (tx.status === "EXPIRED" || tx.type === "EXPIRE") {
    return (
      <>
        <p className="font-semibold text-[#6b7280]">
          - {formatPkr(tx.amount)}
        </p>
        <p className="mt-0.5 text-xs text-[#0a2f6b]/50">Expired</p>
      </>
    );
  }
  if (tx.status === "PENDING") {
    return (
      <>
        <p className="font-semibold text-[#f5a623]">
          + {formatPkr(tx.amount)}
        </p>
        <p className="mt-0.5 text-xs text-[#0a2f6b]/50">Pending</p>
      </>
    );
  }
  return (
    <>
      <p className="font-semibold text-emerald-600">
        + {formatPkr(tx.amount)}
      </p>
      {tx.expiresAt ? (
        <p className="mt-0.5 text-xs text-[#0a2f6b]/50">
          Expiring {formatExpiry(tx.expiresAt)}
        </p>
      ) : (
        <p className="mt-0.5 text-xs text-[#0a2f6b]/50">Rewarded</p>
      )}
    </>
  );
}
