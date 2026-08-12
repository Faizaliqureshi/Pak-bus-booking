"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bus,
  ChevronDown,
  Filter,
  Headphones,
  Loader2,
  Monitor,
  Moon,
  Sun,
  Sunset,
  Tag,
} from "lucide-react";
import { InteractiveSeatMap } from "@/components/booking/InteractiveSeatMap";
import { SearchWidget } from "@/components/booking/SearchWidget";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  busTypeLabel,
  formatDuration,
  formatPkr,
  formatTime,
} from "@/lib/booking-utils";
import { cn } from "@/lib/utils";

export interface TripSearchResult {
  id: string;
  departureTime: string;
  arrivalTime: string;
  durationMs: number;
  basePrice: number;
  bus: {
    id: string;
    busNumber: string;
    layoutType: string;
    totalSeats: number;
  };
  operator: { id: string; name: string };
  route: {
    id: string;
    name: string;
    originCity: string;
    destinationCity: string;
    distanceKm: number;
  };
  boardingStop: { id: string; name: string; order: number } | null;
  dropStop: { id: string; name: string; order: number } | null;
}

type TimeBucket = "morning" | "afternoon" | "night";
type BusTypeFilter = "2x2" | "2x1";

function hourInPkt(iso: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  return Number(parts.find((p) => p.type === "hour")?.value ?? "0");
}

function tripBucket(iso: string): TimeBucket {
  const hour = hourInPkt(iso);
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "night";
}

function matchesBusType(layoutType: string, filter: BusTypeFilter): boolean {
  if (filter === "2x1") {
    return layoutType.includes("2x1") || layoutType.includes("SLEEPER");
  }
  return !layoutType.includes("2x1") && !layoutType.includes("SLEEPER");
}

/** Simple deterministic deal discount for demo marketplace look */
function dealForTrip(tripId: string, basePrice: number): number {
  let hash = 0;
  for (let i = 0; i < tripId.length; i++) {
    hash = (hash + tripId.charCodeAt(i) * (i + 1)) % 997;
  }
  const discount = 400 + (hash % 6) * 100;
  return Math.min(discount, Math.floor(basePrice * 0.2));
}

interface SearchResultsClientProps {
  origin: string;
  destination: string;
  date: string;
}

export function SearchResultsClient({
  origin,
  destination,
  date,
}: SearchResultsClientProps) {
  const [trips, setTrips] = useState<TripSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [timeFilters, setTimeFilters] = useState<TimeBucket[]>([]);
  const [busTypeFilters, setBusTypeFilters] = useState<BusTypeFilter[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [priceBounds, setPriceBounds] = useState<[number, number]>([0, 10000]);

  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setExpandedTripId(null);
      try {
        const params = new URLSearchParams({ origin, destination, date });
        const [tripsRes, userRes] = await Promise.all([
          fetch(`/api/trips/search?${params}`),
          fetch("/api/demo-user"),
        ]);
        const tripsJson = await tripsRes.json();
        const userJson = await userRes.json();

        if (!tripsRes.ok || !tripsJson.success) {
          throw new Error(tripsJson.message || "Could not load trips.");
        }
        if (!cancelled) {
          const list = tripsJson.data as TripSearchResult[];
          setTrips(list);
          if (list.length > 0) {
            const prices = list.map((t) => t.basePrice);
            const min = Math.floor(Math.min(...prices));
            const max = Math.ceil(Math.max(...prices));
            const paddedMax = max === min ? min + 500 : max;
            setPriceBounds([min, paddedMax]);
            setPriceRange([min, paddedMax]);
          }
        }
        if (userRes.ok && userJson.success && !cancelled) {
          setUserId(userJson.data.id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Search failed.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [origin, destination, date]);

  const filtered = useMemo(() => {
    return trips.filter((trip) => {
      if (timeFilters.length > 0) {
        if (!timeFilters.includes(tripBucket(trip.departureTime))) return false;
      }
      if (busTypeFilters.length > 0) {
        const ok = busTypeFilters.some((f) =>
          matchesBusType(trip.bus.layoutType, f),
        );
        if (!ok) return false;
      }
      if (
        trip.basePrice < priceRange[0] ||
        trip.basePrice > priceRange[1]
      ) {
        return false;
      }
      return true;
    });
  }, [trips, timeFilters, busTypeFilters, priceRange]);

  function toggleTime(bucket: TimeBucket) {
    setTimeFilters((prev) =>
      prev.includes(bucket)
        ? prev.filter((b) => b !== bucket)
        : [...prev, bucket],
    );
  }

  function toggleBusType(type: BusTypeFilter) {
    setBusTypeFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  function toggleExpand(tripId: string) {
    setExpandedTripId((prev) => (prev === tripId ? null : tripId));
  }

  const dateLabel = useMemo(() => {
    const [y, m, d] = date.split("-").map(Number);
    if (!y || !m || !d) return date;
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const weekdays = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dt = new Date(Date.UTC(y, m - 1, d, 12));
    return `${weekdays[dt.getUTCDay()]}, ${d} ${months[m - 1]} ${y}`;
  }, [date]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-semibold text-[#0a2f6b]">
          {origin} → {destination}
        </h1>
        <p className="mt-1 text-[#0a2f6b]/65">{dateLabel}</p>
      </div>

      <SearchWidget
        compact
        defaultOrigin={origin}
        defaultDestination={destination}
        defaultDate={date}
        className="mb-8"
      />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-2xl border border-[#0a2f6b]/10 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-[#0a2f6b]">
            <Filter className="size-4" />
            <h2 className="font-heading text-lg font-semibold">Filters</h2>
          </div>

          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-[#0a2f6b]/55 uppercase">
                Departure time
              </p>
              <div className="space-y-2">
                <FilterChip
                  active={timeFilters.includes("morning")}
                  onClick={() => toggleTime("morning")}
                  icon={<Sun className="size-3.5" />}
                  label="Morning"
                />
                <FilterChip
                  active={timeFilters.includes("afternoon")}
                  onClick={() => toggleTime("afternoon")}
                  icon={<Sunset className="size-3.5" />}
                  label="Afternoon"
                />
                <FilterChip
                  active={timeFilters.includes("night")}
                  onClick={() => toggleTime("night")}
                  icon={<Moon className="size-3.5" />}
                  label="Night"
                />
              </div>
            </div>

            <Separator />

            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-[#0a2f6b]/55 uppercase">
                Bus type
              </p>
              <div className="space-y-2">
                <FilterChip
                  active={busTypeFilters.includes("2x2")}
                  onClick={() => toggleBusType("2x2")}
                  label="2x2 Executive"
                />
                <FilterChip
                  active={busTypeFilters.includes("2x1")}
                  onClick={() => toggleBusType("2x1")}
                  label="2x1 Sleeper"
                />
              </div>
            </div>

            <Separator />

            <div>
              <div className="mb-3 flex items-center justify-between">
                <Label className="text-xs font-medium tracking-wide text-[#0a2f6b]/55 uppercase">
                  Price range
                </Label>
                <span className="text-xs text-[#0a2f6b]/70">
                  {formatPkr(priceRange[0])} – {formatPkr(priceRange[1])}
                </span>
              </div>
              <Slider
                min={priceBounds[0]}
                max={priceBounds[1]}
                step={50}
                value={priceRange}
                onValueChange={(value) => {
                  if (Array.isArray(value) && value.length >= 2) {
                    setPriceRange([value[0], value[1]]);
                  }
                }}
              />
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          {loading ? (
            <div className="flex h-48 items-center justify-center gap-2 rounded-2xl border border-dashed border-[#0a2f6b]/15 bg-white text-[#0a2f6b]/70">
              <Loader2 className="size-5 animate-spin" />
              Finding buses…
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
              {error}
            </div>
          ) : null}

          {!loading && !error && filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-8 text-center">
              <p className="font-heading text-xl text-[#0a2f6b]">
                No trips match these filters
              </p>
              <p className="mt-2 text-sm text-[#0a2f6b]/65">
                Try Karachi → Lahore for tomorrow after seeding the database.
              </p>
            </div>
          ) : null}

          {filtered.map((trip) => {
            const expanded = expandedTripId === trip.id;
            const deal = dealForTrip(trip.id, trip.basePrice);
            const salePrice = trip.basePrice - deal;
            const classLabel = busTypeLabel(trip.bus.layoutType).includes(
              "Sleeper",
            )
              ? "Sleeper Class"
              : "Executive Class";

            return (
              <article
                key={trip.id}
                className={cn(
                  "overflow-hidden rounded-2xl border bg-white shadow-sm transition",
                  expanded
                    ? "border-[#f5a623]/60"
                    : "border-[#0a2f6b]/10 hover:border-[#0a2f6b]/20",
                )}
              >
                {deal > 0 ? (
                  <div className="flex items-center gap-2 bg-[#fff4e0] px-4 py-1.5 text-xs font-medium text-[#9a6200]">
                    <Tag className="size-3.5 text-[#f5a623]" />
                    SafarDeal: Save {formatPkr(deal)}
                  </div>
                ) : null}

                <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-[#e8eef8] font-heading text-sm font-bold text-[#0a2f6b]">
                        {trip.operator.name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-heading text-lg font-semibold text-[#0a2f6b]">
                          {trip.operator.name}
                        </h3>
                        <p className="text-xs text-[#0a2f6b]/55">
                          {trip.bus.busNumber}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <p className="font-heading text-2xl font-semibold text-[#0a2f6b]">
                        {formatTime(trip.departureTime)}
                      </p>
                      <span className="inline-flex items-center gap-2 text-[#0a2f6b]/35">
                        <span className="h-px w-6 bg-current sm:w-10" />
                        <Bus className="size-4" />
                        <span className="h-px w-6 bg-current sm:w-10" />
                      </span>
                      <p className="font-heading text-2xl font-semibold text-[#0a2f6b]">
                        {formatTime(trip.arrivalTime)}
                      </p>
                      <span className="text-xs text-[#0a2f6b]/45">
                        {formatDuration(trip.durationMs)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-medium text-[#0a2f6b]">
                      {trip.route.originCity} — {trip.route.destinationCity}
                    </p>
                    <p className="mt-1 text-xs text-[#0a2f6b]/55">
                      {trip.boardingStop?.name ?? trip.route.originCity} —{" "}
                      {trip.dropStop?.name ?? trip.route.destinationCity}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[#0a2f6b]/45">
                        <Headphones className="size-3.5" />
                        <Monitor className="size-3.5" />
                      </span>
                      <Badge
                        variant="secondary"
                        className="bg-[#eef2f8] text-[#0a2f6b]"
                      >
                        {classLabel}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-red-300 text-red-600"
                      >
                        Non Refundable
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-col items-stretch gap-2 md:items-end">
                    <div className="text-right">
                      {deal > 0 ? (
                        <p className="text-sm text-[#0a2f6b]/45 line-through">
                          {formatPkr(trip.basePrice)}
                        </p>
                      ) : null}
                      <p className="font-heading text-2xl font-semibold text-[#0a2f6b]">
                        {formatPkr(salePrice)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleExpand(trip.id)}
                      className={cn(
                        "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition",
                        expanded
                          ? "bg-[#0a2f6b] text-white"
                          : "bg-[#0a2f6b] text-white hover:bg-[#08305f]",
                      )}
                    >
                      Check Seats
                      <ChevronDown
                        className={cn(
                          "size-4 transition",
                          expanded && "rotate-180",
                        )}
                      />
                    </button>
                  </div>
                </div>

                {expanded ? (
                  <div className="border-t border-[#0a2f6b]/8 bg-[#fafbfd] p-4 sm:p-5">
                    {trip.boardingStop && trip.dropStop && userId ? (
                      <InteractiveSeatMap
                        tripId={trip.id}
                        boardingStopId={trip.boardingStop.id}
                        dropStopId={trip.dropStop.id}
                        basePrice={trip.basePrice}
                        dealDiscount={deal}
                        layoutType={trip.bus.layoutType}
                        userId={userId}
                        operatorName={trip.operator.name}
                      />
                    ) : (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                        Demo user not found. Run{" "}
                        <code>npx prisma db seed</code>.
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
        active
          ? "border-[#0a2f6b] bg-[#0a2f6b] text-white"
          : "border-[#0a2f6b]/10 bg-[#f3f6fb] text-[#0a2f6b] hover:bg-[#e8eef8]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
