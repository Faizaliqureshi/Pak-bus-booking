"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { formatPkr, formatTime } from "@/lib/booking-utils";

type Row = {
  id: string;
  pnr: string;
  totalPrice: number;
  paymentMethod: string | null;
  passenger: string;
  phone: string | null;
  seats: string[];
  tripId: string;
  busNumber: string;
  originCity: string;
  destinationCity: string;
  departureTime: string;
};

export default function PartnerBookingsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/partner/bookings");
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Could not load bookings.");
        }
        if (!cancelled) setRows(json.data as Row[]);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Paid bookings</h1>
        <p className="mt-1 text-sm text-[#0a2f6b]/65">
          TicketPass sales on your live coaches.
        </p>
      </div>

      <div className="rounded-2xl border border-[#0a2f6b]/10 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="px-5 py-6 text-sm text-red-700">{error}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f3f6fb] text-[#0a2f6b]/70">
                <tr>
                  <th className="px-4 py-3">PNR</th>
                  <th className="px-4 py-3">Bus</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Passenger</th>
                  <th className="px-4 py-3">Seats</th>
                  <th className="px-4 py-3">Paid</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-[#0a2f6b]/50"
                    >
                      No paid bookings yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((b) => (
                    <tr key={b.id} className="border-t border-[#0a2f6b]/8">
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/partner/trips/${b.tripId}`}
                          className="hover:underline"
                        >
                          {b.pnr}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{b.busNumber}</td>
                      <td className="px-4 py-3">
                        <p>
                          {b.originCity} → {b.destinationCity}
                        </p>
                        <p className="text-xs text-[#0a2f6b]/50">
                          {formatTime(b.departureTime)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{b.passenger}</p>
                        <p className="text-xs text-[#0a2f6b]/50">{b.phone}</p>
                      </td>
                      <td className="px-4 py-3">{b.seats.join(", ")}</td>
                      <td className="px-4 py-3">{formatPkr(b.totalPrice)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
