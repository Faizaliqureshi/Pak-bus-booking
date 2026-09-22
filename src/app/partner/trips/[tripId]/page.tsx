"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { formatPkr, formatTime } from "@/lib/booking-utils";
import {
  buildCoachRows,
  buildSleeperDecks,
  isSleeperLayout,
} from "@/lib/seat-layout";
import { cn } from "@/lib/utils";

type SeatStatus = "AVAILABLE" | "PAID" | "RESERVED" | "LOCKED";

type Seat = { seatNumber: string; status: SeatStatus };

type PaidBooking = {
  id: string;
  pnr: string;
  totalPrice: number;
  paymentMethod: string | null;
  createdAt: string;
  passenger: string;
  phone: string | null;
  seats: string[];
  passengers: { seatNumber: string; name: string; gender: string }[];
};

type TripDetail = {
  id: string;
  busNumber: string;
  totalSeats: number;
  routeName: string;
  originCity: string;
  destinationCity: string;
  departureTime: string;
  arrivalTime: string;
  basePrice: number;
  layoutType: string;
};

export default function PartnerTripDeskPage() {
  const params = useParams<{ tripId: string }>();
  const tripId = params.tripId;
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [bookings, setBookings] = useState<PaidBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/partner/trips/${tripId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not load trip.");
      }
      setTrip(json.data.trip);
      setSeats(json.data.seats);
      setBookings(json.data.bookings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleSeat(seat: Seat) {
    if (seat.status === "PAID" || seat.status === "LOCKED") return;
    setBusy(seat.seatNumber);
    setError(null);
    try {
      const res = await fetch(`/api/partner/trips/${tripId}/holds`, {
        method: seat.status === "RESERVED" ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatNumbers: [seat.seatNumber] }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not update seat.");
      }
      setSeats(json.data.seats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (!trip) {
    return (
      <p className="text-sm text-red-700">{error || "Trip not found."}</p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/partner/routes"
          className="text-xs font-medium text-[#0a2f6b] underline-offset-2 hover:underline"
        >
          ← Live routes
        </Link>
        <h1 className="mt-2 font-heading text-3xl font-semibold">
          {trip.busNumber}
        </h1>
        <p className="mt-1 text-sm text-[#0a2f6b]/65">
          {trip.originCity} → {trip.destinationCity} · {formatTime(trip.departureTime)}{" "}
          · {formatPkr(trip.basePrice)}
        </p>
      </div>

      <section className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm">
        <h2 className="font-heading text-lg font-semibold">Reserve seats</h2>
        <p className="mt-1 text-sm text-[#0a2f6b]/60">
          Click an open seat to hold it. Held seats cannot be booked on
          TicketPass. Click again to release.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-[#0a2f6b]/70">
          <Legend className="border-[#9aa8bc] bg-white" label="Open" />
          <Legend className="border-[#0a2f6b] bg-[#0a2f6b] text-white" label="Your hold" />
          <Legend className="border-emerald-700 bg-emerald-600 text-white" label="Paid" />
          <Legend className="border-amber-400 bg-amber-200" label="Passenger hold" />
        </div>
        <PartnerCoachGrid
          layoutType={trip.layoutType}
          totalSeats={trip.totalSeats}
          seats={seats}
          busy={busy}
          onToggle={(seat) => void toggleSeat(seat)}
        />
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </section>

      <section className="rounded-2xl border border-[#0a2f6b]/10 bg-white shadow-sm">
        <div className="border-b border-[#0a2f6b]/10 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold">Paid bookings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f3f6fb] text-[#0a2f6b]/70">
              <tr>
                <th className="px-4 py-3">PNR</th>
                <th className="px-4 py-3">Passenger</th>
                <th className="px-4 py-3">Seats</th>
                <th className="px-4 py-3">Paid</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[#0a2f6b]/50">
                    No paid bookings on this departure yet.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="border-t border-[#0a2f6b]/8">
                    <td className="px-4 py-3 font-medium">{b.pnr}</td>
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
      </section>
    </div>
  );
}

function Legend({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block size-3.5 rounded-full border", className)} />
      {label}
    </span>
  );
}

function PartnerCoachGrid({
  layoutType,
  totalSeats,
  seats,
  busy,
  onToggle,
}: {
  layoutType: string;
  totalSeats: number;
  seats: Seat[];
  busy: string | null;
  onToggle: (seat: Seat) => void;
}) {
  const sleeper = isSleeperLayout(layoutType);
  const rows = buildCoachRows(totalSeats, layoutType);
  const decks = sleeper ? buildSleeperDecks(totalSeats) : [];
  const byNumber = new Map(seats.map((s) => [s.seatNumber, s]));

  const cell = (
    seatNumber: string | null,
    key: string,
    label?: string,
  ) => {
    if (!seatNumber) return <div key={key} />;
    const seat = byNumber.get(seatNumber) ?? {
      seatNumber,
      status: "AVAILABLE" as const,
    };
    return (
      <button
        key={key}
        type="button"
        disabled={
          seat.status === "PAID" ||
          seat.status === "LOCKED" ||
          busy === seat.seatNumber
        }
        onClick={() => onToggle(seat)}
        className={cn(
          "flex size-8 items-center justify-center rounded-full border text-[11px] font-semibold sm:size-9",
          seat.status === "AVAILABLE" &&
            "border-[#d1d5db] bg-white text-[#111827] hover:border-[#0a2f6b]",
          seat.status === "RESERVED" &&
            "border-[#0a2f6b] bg-[#0a2f6b] text-white",
          seat.status === "PAID" &&
            "cursor-not-allowed border-emerald-700 bg-emerald-600 text-white",
          seat.status === "LOCKED" &&
            "cursor-not-allowed border-amber-400 bg-amber-200 text-amber-950",
        )}
      >
        {busy === seat.seatNumber ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          label ?? seat.seatNumber
        )}
      </button>
    );
  };

  if (sleeper) {
    return (
      <div className="mt-5 grid grid-cols-2 gap-6">
        {decks.map((deck) => (
          <div key={deck.name} className="space-y-3">
            <p className="text-center text-sm font-semibold text-[#0a2f6b]">
              {deck.name}
            </p>
            {deck.rows.map((row, i) => (
              <div
                key={`${deck.name}-${i}`}
                className={cn(
                  "mx-auto grid items-center justify-items-center gap-x-3",
                  row.lastTriple
                    ? "grid-cols-3 max-w-[140px]"
                    : "grid-cols-2 max-w-[92px]",
                )}
              >
                {row.berths.map((berth) =>
                  cell(berth.seatNumber, berth.seatNumber, berth.label),
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {rows.map((row, i) => {
        if (row.fullWidth) {
          return (
            <div
              key={i}
              className="mx-auto grid w-full max-w-[280px] grid-cols-5 items-center justify-items-center gap-x-3 sm:max-w-[320px]"
            >
              {row.seats.map((n, j) => cell(n, `${i}-${j}`))}
            </div>
          );
        }
        return (
          <div
            key={i}
            className="mx-auto grid w-full max-w-[280px] grid-cols-[32px_32px_40px_32px_32px] items-center justify-items-center gap-x-3 sm:max-w-[320px] sm:grid-cols-[36px_36px_48px_36px_36px]"
          >
            {cell(row.seats[0], `${i}-lw`)}
            {cell(row.seats[1], `${i}-la`)}
            <div />
            {cell(row.seats[2], `${i}-ra`)}
            {cell(row.seats[3], `${i}-rw`)}
          </div>
        );
      })}
    </div>
  );
}
