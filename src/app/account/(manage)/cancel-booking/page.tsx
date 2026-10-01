"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { formatPkr, formatTime } from "@/lib/booking-utils";
import { Button } from "@/components/ui/button";

type CancellableBooking = {
  pnr: string;
  paymentStatus: string;
  operatorName: string;
  originCity: string;
  destinationCity: string;
  departureTime: string;
  totalPrice: number;
  seats: string[];
  cancellable: boolean;
  refundPercent?: number;
  estimatedRefund?: number;
  cancelReason?: string | null;
  policyNote?: string;
};

export default function CancelBookingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin" />
        </div>
      }
    >
      <CancelBookingForm />
    </Suspense>
  );
}

function CancelBookingForm() {
  const router = useRouter();
  const search = useSearchParams();
  const initialPnr = search.get("pnr") ?? "";
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [bookings, setBookings] = useState<CancellableBooking[]>([]);
  const [pnr, setPnr] = useState(initialPnr);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/account/bookings");
        const json = await res.json();
        if (!res.ok || !json.success) {
          if (res.status === 401) {
            router.replace("/auth/sign-in?next=/account/cancel-booking");
            return;
          }
          throw new Error(json.message || "Could not load bookings.");
        }
        if (!cancelled) {
          const rows = (json.data.bookings as CancellableBooking[]).filter(
            (b) => b.paymentStatus === "PAID" && b.seats?.length,
          );
          setBookings(rows);
          const match = rows.find((b) => b.pnr === initialPnr) ?? rows[0];
          if (match) {
            setPnr(match.pnr);
            setSelected(match.seats);
          }
        }
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
  }, [initialPnr, router]);

  const current = useMemo(
    () => bookings.find((b) => b.pnr === pnr) ?? null,
    [bookings, pnr],
  );

  async function cancelSelected() {
    if (!current || selected.length === 0) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/account/bookings/${encodeURIComponent(current.pnr)}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seatNumbers: selected }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not cancel seats.");
      }
      const remaining = json.data.remainingSeats as string[];
      setBookings((prev) =>
        prev
          .map((b) =>
            b.pnr === current.pnr
              ? {
                  ...b,
                  seats: remaining,
                  cancellable: remaining.length > 0 && b.cancellable,
                  paymentStatus:
                    remaining.length === 0 ? "REFUNDED" : b.paymentStatus,
                }
              : b,
          )
          .filter((b) => b.seats.length > 0),
      );
      setSelected(remaining);
      setMessage(json.message);
      if (remaining.length === 0) {
        const next = bookings.find((b) => b.pnr !== current.pnr);
        setPnr(next?.pnr ?? "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-[#1a2333] sm:text-3xl">
        Cancel seats
      </h1>
      <p className="mt-2 text-sm text-[#0a2f6b]/65">
        Cancel one or more paid seats before departure. The fare is refunded to
        your TicketPass Wallet.
      </p>

      {bookings.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-[#0a2f6b]/10 bg-white p-8 text-center text-sm text-[#0a2f6b]/60">
          No cancellable paid seats right now.{" "}
          <Link href="/account/bookings" className="font-medium underline">
            View bookings
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <label className="block text-sm font-medium text-[#0a2f6b]">
            Booking
            <select
              value={pnr}
              onChange={(e) => {
                setPnr(e.target.value);
                const next = bookings.find((b) => b.pnr === e.target.value);
                setSelected(next?.seats ?? []);
                setMessage(null);
              }}
              className="mt-1 h-11 w-full rounded-lg border border-[#d7dee8] bg-white px-3 text-sm"
            >
              {bookings.map((b) => (
                <option key={b.pnr} value={b.pnr}>
                  {b.pnr} · {b.originCity} → {b.destinationCity} ·{" "}
                  {formatTime(b.departureTime)}
                </option>
              ))}
            </select>
          </label>

          {current ? (
            <div className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-5">
              <p className="text-sm font-semibold text-[#0a2f6b]">
                {current.operatorName}
              </p>
              <p className="mt-1 text-xs text-[#0a2f6b]/55">
                Paid {formatPkr(current.totalPrice)} · {current.operatorName}{" "}
                policy
                {typeof current.refundPercent === "number"
                  ? ` · ${current.refundPercent}% refund`
                  : ""}
                {typeof current.estimatedRefund === "number" &&
                current.seats.length > 0
                  ? ` · about ${formatPkr(
                      Math.round(
                        (current.estimatedRefund * selected.length) /
                          current.seats.length,
                      ),
                    )} for selected seats`
                  : ""}
              </p>
              {current.policyNote ? (
                <p className="mt-2 text-xs text-[#0a2f6b]/55">
                  {current.policyNote}
                </p>
              ) : null}
              {!current.cancellable ? (
                <p className="mt-3 text-sm text-amber-800">
                  {current.cancelReason ||
                    "This company does not allow online cancellation right now."}
                </p>
              ) : (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {current.seats.map((seat) => {
                    const on = selected.includes(seat);
                    return (
                      <li key={seat}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelected((prev) =>
                              on
                                ? prev.filter((s) => s !== seat)
                                : [...prev, seat],
                            )
                          }
                          className={`flex h-11 w-full items-center justify-between rounded-xl border px-3 text-sm font-medium ${
                            on
                              ? "border-[#0a2f6b] bg-[#0a2f6b] text-white"
                              : "border-[#d7dee8] bg-white text-[#0a2f6b]"
                          }`}
                        >
                          <span>Seat {seat}</span>
                          <span className="text-xs opacity-70">
                            {on ? "Will cancel" : "Keep"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Button
                type="button"
                disabled={
                  busy ||
                  !current.cancellable ||
                  selected.length === 0
                }
                onClick={() => void cancelSelected()}
                className="mt-5 h-11 bg-[#0a2f6b] text-white hover:bg-[#08305f]"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  `Cancel ${selected.length || 0} seat${selected.length === 1 ? "" : "s"}`
                )}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {message ? (
        <p className="mt-4 text-sm text-emerald-800" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
