"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { formatPkr } from "@/lib/booking-utils";

type FinancePayload = {
  commissionRate: number;
  summary: {
    gross: number;
    commission: number;
    net: number;
    cleared: number;
    outstanding: number;
    paidBookings: number;
    ticketsSold: number;
    pendingBookings: number;
    pendingValue: number;
    refunds: number;
    refundedValue: number;
    reservedSeats: number;
  };
  buses: {
    id: string;
    busNumber: string;
    trips: number;
    paidBookings: number;
    gross: number;
    commission: number;
    net: number;
  }[];
  methods: { method: string; count: number; amount: number }[];
  payouts: {
    id: string;
    amount: number;
    status: string;
    reference: string;
    note: string | null;
    clearedAt: string | null;
  }[];
};

export default function PartnerFinancePage() {
  const [data, setData] = useState<FinancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/partner/finance");
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Could not load finance.");
        }
        if (!cancelled) setData(json.data as FinancePayload);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-red-700">{error}</p>;
  }

  const { summary } = data;
  const rate = Math.round(data.commissionRate * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Finance</h1>
        <p className="mt-1 text-sm text-[#0a2f6b]/65">
          TicketPass collects passenger fares, keeps a {rate}% commission, and
          clears the remainder to you.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Gross ticket sales" value={formatPkr(summary.gross)} hint={`${summary.paidBookings} paid bookings`} />
        <Stat label="TicketPass commission" value={formatPkr(summary.commission)} hint={`${rate}% of gross`} />
        <Stat label="Net due to you" value={formatPkr(summary.net)} hint={`${summary.ticketsSold} tickets sold`} />
        <Stat label="Received from TicketPass" value={formatPkr(summary.cleared)} hint="Cleared payouts" />
        <Stat label="Outstanding" value={formatPkr(summary.outstanding)} hint="Net minus cleared" />
        <Stat label="Pending checkouts" value={formatPkr(summary.pendingValue)} hint={`${summary.pendingBookings} unpaid holds`} />
        <Stat label="Refunds" value={formatPkr(summary.refundedValue)} hint={`${summary.refunds} refunded`} />
        <Stat label="Reserved seats" value={String(summary.reservedSeats)} hint="Blocked from sale" />
      </div>

      <section className="rounded-2xl border border-[#0a2f6b]/10 bg-white shadow-sm">
        <div className="border-b border-[#0a2f6b]/10 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold">Income by bus</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f3f6fb] text-[#0a2f6b]/70">
              <tr>
                <th className="px-4 py-3">Bus</th>
                <th className="px-4 py-3">Trips</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Gross</th>
                <th className="px-4 py-3">Commission</th>
                <th className="px-4 py-3">Net</th>
              </tr>
            </thead>
            <tbody>
              {data.buses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#0a2f6b]/50">
                    No coaches yet.
                  </td>
                </tr>
              ) : (
                data.buses.map((bus) => (
                  <tr key={bus.id} className="border-t border-[#0a2f6b]/8">
                    <td className="px-4 py-3 font-medium">{bus.busNumber}</td>
                    <td className="px-4 py-3">{bus.trips}</td>
                    <td className="px-4 py-3">{bus.paidBookings}</td>
                    <td className="px-4 py-3">{formatPkr(bus.gross)}</td>
                    <td className="px-4 py-3">{formatPkr(bus.commission)}</td>
                    <td className="px-4 py-3">{formatPkr(bus.net)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#0a2f6b]/10 bg-white shadow-sm">
          <div className="border-b border-[#0a2f6b]/10 px-5 py-4">
            <h2 className="font-heading text-lg font-semibold">Payment mix</h2>
          </div>
          <ul className="divide-y divide-[#0a2f6b]/8 px-5">
            {data.methods.length === 0 ? (
              <li className="py-6 text-sm text-[#0a2f6b]/50">No collected payments yet.</li>
            ) : (
              data.methods.map((m) => (
                <li key={m.method} className="flex items-center justify-between py-3 text-sm">
                  <span>{m.method}</span>
                  <span>
                    {m.count} · {formatPkr(m.amount)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-[#0a2f6b]/10 bg-white shadow-sm">
          <div className="border-b border-[#0a2f6b]/10 px-5 py-4">
            <h2 className="font-heading text-lg font-semibold">
              TicketPass payouts
            </h2>
          </div>
          <ul className="divide-y divide-[#0a2f6b]/8 px-5">
            {data.payouts.length === 0 ? (
              <li className="py-6 text-sm text-[#0a2f6b]/50">
                No cleared transfers yet. Outstanding stays with TicketPass
                until a payout is recorded.
              </li>
            ) : (
              data.payouts.map((p) => (
                <li key={p.id} className="py-3 text-sm">
                  <p className="font-medium">
                    {formatPkr(p.amount)} · {p.status}
                  </p>
                  <p className="text-xs text-[#0a2f6b]/50">
                    {p.reference}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-[#0a2f6b]/55">{label}</p>
      <p className="mt-1 font-heading text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-[#0a2f6b]/50">{hint}</p>
    </div>
  );
}
