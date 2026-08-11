"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Armchair,
  Clock3,
  Filter,
  Loader2,
  MapPinned,
  Moon,
  Sun,
  Sunset,
} from "lucide-react";
import { InteractiveSeatMap } from "@/components/booking/InteractiveSeatMap";
import { SearchWidget } from "@/components/booking/SearchWidget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

  const [selectedTrip, setSelectedTrip] = useState<TripSearchResult | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href="/"
          className="font-heading text-lg font-semibold tracking-tight text-teal-950"
        >
          SafarPK
        </Link>
        <h1 className="mt-3 font-heading text-3xl font-semibold text-teal-950">
          {origin} → {destination}
        </h1>
        <p className="mt-1 text-teal-900/65">
          {new Date(`${date}T12:00:00`).toLocaleDateString("en-PK", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <SearchWidget
        compact
        defaultOrigin={origin}
        defaultDestination={destination}
        defaultDate={date}
        className="mb-8"
      />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-2xl border border-teal-900/10 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-teal-950">
            <Filter className="size-4" />
            <h2 className="font-heading text-lg font-semibold">Filters</h2>
          </div>

          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-teal-900/55 uppercase">
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
              <p className="mb-2 text-xs font-medium tracking-wide text-teal-900/55 uppercase">
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
                <Label className="text-xs font-medium tracking-wide text-teal-900/55 uppercase">
                  Price range
                </Label>
                <span className="text-xs text-teal-900/70">
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
            <div className="flex h-48 items-center justify-center gap-2 rounded-2xl border border-dashed border-teal-900/15 bg-white text-teal-900/70">
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
            <div className="rounded-2xl border border-teal-900/10 bg-white p-8 text-center">
              <p className="font-heading text-xl text-teal-950">
                No trips match these filters
              </p>
              <p className="mt-2 text-sm text-teal-900/65">
                Try Karachi → Lahore for tomorrow after seeding the database.
              </p>
            </div>
          ) : null}

          {filtered.map((trip) => (
            <Card
              key={trip.id}
              className="overflow-hidden border-teal-900/10 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardContent className="grid gap-4 p-5 md:grid-cols-[1.4fr_1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading text-xl font-semibold text-teal-950">
                      {trip.operator.name}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="bg-teal-900/5 text-teal-900"
                    >
                      {busTypeLabel(trip.bus.layoutType)}
                    </Badge>
                    <Badge variant="outline">{trip.bus.busNumber}</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                    <div>
                      <p className="font-heading text-2xl font-semibold text-teal-950">
                        {formatTime(trip.departureTime)}
                      </p>
                      <p className="mt-1 flex items-start gap-1 text-sm text-teal-900/65">
                        <MapPinned className="mt-0.5 size-3.5 shrink-0" />
                        {trip.boardingStop?.name ?? trip.route.originCity}
                      </p>
                    </div>
                    <div className="flex flex-col items-center text-teal-900/55">
                      <Clock3 className="size-3.5" />
                      <span className="mt-1 text-xs">
                        {formatDuration(trip.durationMs)}
                      </span>
                      <div className="mt-1 h-px w-16 bg-teal-900/15" />
                    </div>
                    <div className="sm:text-right">
                      <p className="font-heading text-2xl font-semibold text-teal-950">
                        {formatTime(trip.arrivalTime)}
                      </p>
                      <p className="mt-1 flex items-start gap-1 text-sm text-teal-900/65 sm:justify-end">
                        <MapPinned className="mt-0.5 size-3.5 shrink-0" />
                        {trip.dropStop?.name ?? trip.route.destinationCity}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="md:text-center">
                  <p className="text-xs tracking-wide text-teal-900/55 uppercase">
                    From
                  </p>
                  <p className="font-heading text-3xl font-semibold text-teal-800">
                    {formatPkr(trip.basePrice)}
                  </p>
                  <p className="text-xs text-teal-900/55">per seat</p>
                </div>

                <Button
                  className="h-11 bg-teal-800 text-white hover:bg-teal-700"
                  onClick={() => setSelectedTrip(trip)}
                >
                  <Armchair className="size-4" />
                  Select Seats
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>

      <Sheet
        open={!!selectedTrip}
        onOpenChange={(open) => {
          if (!open) setSelectedTrip(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-hidden p-4 sm:max-w-md"
        >
          <SheetHeader className="px-1 pb-2">
            <SheetTitle className="sr-only">Select seats</SheetTitle>
          </SheetHeader>
          {selectedTrip &&
          selectedTrip.boardingStop &&
          selectedTrip.dropStop &&
          userId ? (
            <InteractiveSeatMap
              tripId={selectedTrip.id}
              boardingStopId={selectedTrip.boardingStop.id}
              dropStopId={selectedTrip.dropStop.id}
              basePrice={selectedTrip.basePrice}
              layoutType={selectedTrip.bus.layoutType}
              userId={userId}
              operatorName={selectedTrip.operator.name}
            />
          ) : selectedTrip && !userId ? (
            <div className="p-4 text-sm text-red-700">
              Demo user not found. Run <code>npx prisma db seed</code>.
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
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
          ? "border-teal-800 bg-teal-800 text-white"
          : "border-teal-900/10 bg-teal-50/40 text-teal-950 hover:bg-teal-50",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
