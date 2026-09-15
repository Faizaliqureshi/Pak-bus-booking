"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bus, CheckCircle2, Loader2, Search } from "lucide-react";
import { formatCardDate, formatTime } from "@/lib/booking-utils";
import { Input } from "@/components/ui/input";

export type AccountBooking = {
  id: string;
  pnr: string;
  paymentStatus: string;
  createdAt: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  originCity: string;
  destinationCity: string;
  originCode: string;
  destinationCode: string;
  operatorName: string;
  busNumber: string;
  routeName: string;
  issued: boolean;
  expired: boolean;
};

export function AccountBookingList({
  title,
  mode,
}: {
  title: string;
  mode: "all" | "issued";
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<AccountBooking[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/account/bookings");
        const json = await res.json();
        if (!res.ok || !json.success) {
          if (res.status === 401) {
            router.replace("/auth/sign-in?next=/account/bookings");
            return;
          }
          throw new Error(json.message || "Could not load bookings.");
        }
        if (!cancelled) setBookings(json.data.bookings as AccountBooking[]);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      if (mode === "issued" && !b.issued) return false;
      if (!q) return true;
      return (
        b.pnr.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.operatorName.toLowerCase().includes(q) ||
        b.originCode.toLowerCase().includes(q) ||
        b.destinationCode.toLowerCase().includes(q)
      );
    });
  }, [bookings, mode, query]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-[#1a2333] sm:text-3xl">
        {title}
      </h1>

      <div className="relative mt-5 max-w-md">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by Order ID"
          className="h-11 rounded-lg border-[#d7dee8] bg-white pr-10"
          aria-label="Search by Order ID"
        />
        <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#94a3b8]" />
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center text-[#0a2f6b]">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : error ? (
        <p className="mt-6 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : filtered.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-[#94a3b8]">
          <Bus className="size-10 stroke-[1.2]" />
          <p className="mt-3 text-sm">No data</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-4">
          {filtered.map((b) => (
            <BookingCard key={b.id} booking={b} mode={mode} />
          ))}
        </ul>
      )}
    </div>
  );
}

function BookingCard({
  booking,
  mode,
}: {
  booking: AccountBooking;
  mode: "all" | "issued";
}) {
  const issued = booking.issued;
  const showExpired = mode === "all" && booking.expired && issued;
  const href = issued ? `/ticket/${booking.pnr}` : `/checkout/${booking.id}`;
  const actionLabel = issued && !showExpired ? "Manage" : "View";

  return (
    <li className="rounded-xl border border-[#e6ebf2] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-medium text-[#64748b]">
            <Bus className="size-3.5" />
            Bus
          </p>
          <p className="mt-2 text-sm font-semibold text-[#0a2f6b]">
            {booking.operatorName}
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3 sm:gap-5">
            <div>
              <p className="text-xl font-semibold tracking-tight text-[#1a2333] sm:text-2xl">
                {formatTime(booking.departureTime)}
              </p>
              <p className="mt-1 text-xs font-medium text-[#94a3b8]">
                {booking.originCode}
              </p>
            </div>
            <p className="pb-5 text-xs font-medium text-[#0d9488]">
              {booking.duration}
            </p>
            <div>
              <p className="text-xl font-semibold tracking-tight text-[#1a2333] sm:text-2xl">
                {formatTime(booking.arrivalTime)}
              </p>
              <p className="mt-1 text-xs font-medium text-[#94a3b8]">
                {booking.destinationCode}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch justify-between gap-3 border-t border-[#eef2f7] pt-3 sm:w-[200px] sm:items-end sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
          <p className="text-xs text-[#94a3b8]">
            {formatCardDate(booking.departureTime)}
          </p>
          <div>
            <p className="text-xs text-[#64748b]">
              Order ID{" "}
              <span className="font-semibold text-[#1a2333]">{booking.pnr}</span>
            </p>
            {issued && !showExpired ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#16a34a]">
                <CheckCircle2 className="size-3.5" />
                Ticket Issued
              </p>
            ) : null}
            {showExpired ? (
              <p className="mt-1 text-xs font-medium text-[#64748b]">
                Order Expired
              </p>
            ) : null}
            {!issued ? (
              <p className="mt-1 text-xs font-medium text-amber-700">
                Payment pending
              </p>
            ) : null}
          </div>
          <Link
            href={href}
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#0a2f6b] px-6 text-sm font-semibold text-white hover:bg-[#08305f]"
          >
            {actionLabel}
          </Link>
        </div>
      </div>
    </li>
  );
}
