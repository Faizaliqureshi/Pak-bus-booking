"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/booking-utils";

type TripRow = {
  id: string;
  departureTime: string;
  busNumber: string;
  totalSeats: number;
  routeName: string;
  originCity: string;
  destinationCity: string;
  reservedCount: number;
  boardedCount: number;
};

type Passenger = {
  seatNumber: string;
  name: string;
  gender: string;
  pnr: string;
  phone: string | null;
  isBoarded: boolean;
  boardedAt: string | null;
  boardingStop: string;
  dropStop: string;
};

export default function ConductorReservationsPage() {
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/conductor/trips");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not load trips.");
      }
      setTrips(json.data as TripRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trips.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  async function openTrip(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    setPassengers([]);
    try {
      const res = await fetch(`/api/conductor/trips/${id}/reservations`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not load reservations.");
      }
      setPassengers(json.data.passengers as Passenger[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load list.");
    } finally {
      setDetailLoading(false);
    }
  }

  const selected = trips.find((t) => t.id === selectedId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Reservations</h1>
          <p className="mt-1 text-sm text-[#0a2f6b]/65">
            Paid passengers for today and upcoming trips. Scan tickets to mark
            onboard.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadTrips()}>
            Refresh
          </Button>
          <Button
            className="bg-[#0a2f6b] text-white hover:bg-[#08305f]"
            render={<Link href="/conductor/scan" />}
          >
            Scan onboard
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : trips.length === 0 ? (
        <p className="rounded-2xl border border-[#0a2f6b]/10 bg-white px-4 py-10 text-center text-sm text-[#0a2f6b]/55">
          No trips in the next 7 days.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <ul className="space-y-2">
            {trips.map((t) => {
              const active = t.id === selectedId;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => void openTrip(t.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-[#0a2f6b] bg-white"
                        : "border-[#0a2f6b]/10 bg-white hover:border-[#0a2f6b]/30"
                    }`}
                  >
                    <p className="font-semibold">
                      {t.originCity} → {t.destinationCity}
                    </p>
                    <p className="mt-0.5 text-xs text-[#0a2f6b]/55">
                      {formatTime(t.departureTime)} · {t.busNumber} ·{" "}
                      {t.reservedCount} reserved · {t.boardedCount} boarded
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-4 sm:p-5">
            {!selectedId ? (
              <p className="py-10 text-center text-sm text-[#0a2f6b]/50">
                Select a trip to see the passenger list.
              </p>
            ) : detailLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="size-6 animate-spin" />
              </div>
            ) : (
              <>
                <h2 className="font-heading text-lg font-semibold">
                  {selected
                    ? `${selected.originCity} → ${selected.destinationCity}`
                    : "Passengers"}
                </h2>
                <p className="mt-1 text-xs text-[#0a2f6b]/55">
                  {passengers.length} paid reservation
                  {passengers.length === 1 ? "" : "s"}
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs tracking-wide text-[#0a2f6b]/55 uppercase">
                      <tr>
                        <th className="py-2 pr-3">Seat</th>
                        <th className="py-2 pr-3">Passenger</th>
                        <th className="py-2 pr-3">PNR</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {passengers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-8 text-center text-[#0a2f6b]/45"
                          >
                            No paid reservations yet.
                          </td>
                        </tr>
                      ) : (
                        passengers.map((p) => (
                          <tr
                            key={`${p.pnr}-${p.seatNumber}`}
                            className="border-t border-[#0a2f6b]/8"
                          >
                            <td className="py-2.5 pr-3 font-medium">
                              {p.seatNumber}
                            </td>
                            <td className="py-2.5 pr-3">
                              {p.name}
                              <span className="mt-0.5 block text-[11px] text-[#0a2f6b]/45">
                                {p.boardingStop} → {p.dropStop}
                              </span>
                            </td>
                            <td className="py-2.5 pr-3 font-mono text-xs">
                              {p.pnr}
                            </td>
                            <td className="py-2.5">
                              {p.isBoarded ? (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                  Boarded
                                </span>
                              ) : (
                                <span className="rounded-full bg-[#f3f6fb] px-2 py-0.5 text-xs font-medium text-[#0a2f6b]/70">
                                  Reserved
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
