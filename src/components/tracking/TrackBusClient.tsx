"use client";

import { useMemo, useState } from "react";
import { Bus, Loader2, MapPinned, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTime } from "@/lib/booking-utils";

export type TrackMode = "passenger" | "fleet";

type TrackStop = {
  id: string;
  name: string;
  order: number;
  lat: number;
  lng: number;
};

type TrackTrip = {
  tripId: string;
  busNumber: string;
  operatorName: string;
  routeName: string;
  originCity: string;
  destinationCity: string;
  departureTime: string;
  arrivalTime: string;
  phase: "SCHEDULED" | "EN_ROUTE" | "ARRIVED";
  progress: number;
  eta: string | null;
  lastStop: { name: string; order: number };
  nextStop: { name: string; order: number } | null;
  position: { lat: number; lng: number };
  stops: TrackStop[];
};

type TrackPayload = {
  lookup: "booking" | "bus";
  booking?: {
    id: string;
    pnr: string;
    paymentStatus: string;
    seats: string[];
  };
  busNumber?: string;
  trip: TrackTrip;
};

const PHASE_LABEL: Record<TrackTrip["phase"], string> = {
  SCHEDULED: "Not departed yet",
  EN_ROUTE: "On the road",
  ARRIVED: "Arrived",
};

function phaseTone(phase: TrackTrip["phase"]): string {
  if (phase === "EN_ROUTE") return "bg-emerald-50 text-emerald-800";
  if (phase === "ARRIVED") return "bg-[#0a2f6b]/10 text-[#0a2f6b]";
  return "bg-amber-50 text-amber-900";
}

function CorridorMap({ trip }: { trip: TrackTrip }) {
  const { points, bus } = useMemo(() => {
    const lats = trip.stops.map((s) => s.lat);
    const lngs = trip.stops.map((s) => s.lng);
    const minLat = Math.min(...lats, trip.position.lat) - 0.4;
    const maxLat = Math.max(...lats, trip.position.lat) + 0.4;
    const minLng = Math.min(...lngs, trip.position.lng) - 0.4;
    const maxLng = Math.max(...lngs, trip.position.lng) + 0.4;
    const w = Math.max(maxLng - minLng, 0.01);
    const h = Math.max(maxLat - minLat, 0.01);
    const toXY = (lat: number, lng: number) => ({
      x: ((lng - minLng) / w) * 100,
      y: (1 - (lat - minLat) / h) * 100,
    });
    return {
      points: trip.stops.map((s) => ({ ...s, ...toXY(s.lat, s.lng) })),
      bus: toXY(trip.position.lat, trip.position.lng),
    };
  }, [trip]);

  const line = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg
      viewBox="0 0 100 64"
      className="h-56 w-full rounded-xl bg-[#e8eef8]"
      role="img"
      aria-label="Live corridor map"
    >
      <polyline
        fill="none"
        stroke="#0a2f6b"
        strokeWidth="1.2"
        strokeOpacity="0.35"
        points={line}
      />
      {points.map((p) => (
        <circle key={p.id} cx={p.x} cy={p.y} r="1.6" fill="#0a2f6b" />
      ))}
      <g transform={`translate(${bus.x} ${bus.y})`}>
        <circle r="3.2" fill="#f5a623" stroke="#0a2f6b" strokeWidth="0.5" />
      </g>
    </svg>
  );
}

export function TrackBusClient({
  mode,
  title,
  subtitle,
}: {
  mode: TrackMode;
  title: string;
  subtitle: string;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackPayload | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = query.trim();
    if (!value) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const params = new URLSearchParams();
      if (mode === "fleet") {
        params.set("busNumber", value);
      } else if (value.toUpperCase().startsWith("PKR-")) {
        params.set("pnr", value);
      } else {
        params.set("bookingId", value);
      }
      const res = await fetch(`/api/track?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not track this coach.");
      }
      setResult(json.data as TrackPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tracking failed.");
    } finally {
      setLoading(false);
    }
  }

  const trip = result?.trip;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-[#0a2f6b]/65">{subtitle}</p>
      </div>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="flex flex-col gap-3 rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm sm:flex-row sm:items-end"
      >
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="track-query">
            {mode === "fleet" ? "Bus number" : "PNR or booking ID"}
          </Label>
          <Input
            id="track-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            required
            className="h-11"
            placeholder={
              mode === "fleet" ? "DAEWOO-786" : "PKR-8921A or booking id"
            }
            autoComplete="off"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="h-11 bg-[#0a2f6b] text-white hover:bg-[#08305f]"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Search className="size-4" />
              Track
            </>
          )}
        </Button>
      </form>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {trip ? (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-heading text-lg font-semibold">
                {trip.originCity} → {trip.destinationCity}
              </p>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${phaseTone(trip.phase)}`}
              >
                {PHASE_LABEL[trip.phase]}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#0a2f6b]/55">
              {trip.busNumber} · {trip.operatorName} ·{" "}
              {formatTime(trip.departureTime)} – {formatTime(trip.arrivalTime)}
            </p>
            <div className="mt-4">
              <CorridorMap trip={trip} />
            </div>
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-[#e8eef8]">
                <div
                  className="h-full rounded-full bg-[#f5a623]"
                  style={{ width: `${Math.round(trip.progress * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-[#0a2f6b]/70">
                Last stop: {trip.lastStop.name}
                {trip.nextStop ? ` · Next: ${trip.nextStop.name}` : ""}
              </p>
              {trip.eta ? (
                <p className="mt-1 text-xs text-[#0a2f6b]/55">
                  ETA {formatTime(trip.eta)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm">
            {result.booking ? (
              <div className="mb-4 rounded-xl bg-[#f3f6fb] px-3 py-3 text-sm">
                <p className="font-mono text-xs text-[#0a2f6b]/55">PNR</p>
                <p className="font-heading text-xl font-semibold">
                  {result.booking.pnr}
                </p>
                <p className="mt-1 text-xs text-[#0a2f6b]/60">
                  Seats {result.booking.seats.join(", ") || "—"} ·{" "}
                  {result.booking.paymentStatus}
                </p>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2 text-sm text-[#0a2f6b]/70">
                <Bus className="size-4" />
                Tracking {result.busNumber ?? trip.busNumber}
              </div>
            )}
            <p className="flex items-center gap-2 text-sm font-medium">
              <MapPinned className="size-4" />
              Stops
            </p>
            <ol className="mt-3 space-y-2">
              {trip.stops.map((stop) => {
                const passed = stop.order <= trip.lastStop.order;
                const current = stop.order === trip.lastStop.order;
                return (
                  <li
                    key={stop.id}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      current
                        ? "bg-[#f5a623]/15 font-medium"
                        : passed
                          ? "text-[#0a2f6b]/45"
                          : "text-[#0a2f6b]"
                    }`}
                  >
                    {stop.name}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      ) : null}
    </div>
  );
}
