"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronDown,
  Filter,
  Loader2,
  Moon,
  Sunrise,
  Sun,
  Sunset,
  X,
} from "lucide-react";
import { SearchWidget } from "@/components/booking/SearchWidget";
import { TripResultCard } from "@/components/booking/TripResultCard";
import type { TripSearchResult } from "@/components/booking/trip-types";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  busTypeCategory,
  formatPkr,
} from "@/lib/booking-utils";
import { cn } from "@/lib/utils";

export type { TripSearchResult };

type TimeBucket = "earlyMorning" | "morning" | "afternoon" | "night";
type BusTypeFilter = "executive" | "business" | "sleeper";
type SortOption = "recommended" | "cheapest" | "earliest";

const BUS_SERVICES = [
  "Kainat Travels",
  "Daewoo Express",
  "Warraich Express",
  "Faisal Movers",
  "KCS",
  "Umair Movers",
  "Waheed Movers",
  "DMC Larkana",
  "Khan Movers",
  "Geo Farhan",
  "Royal City",
] as const;

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
  // 12:00 AM – 05:59 AM
  if (hour < 6) return "earlyMorning";
  // 06:00 AM – 11:59 AM
  if (hour < 12) return "morning";
  // 12:00 PM – 07:59 PM
  if (hour < 20) return "afternoon";
  // 08:00 PM – 11:59 PM
  return "night";
}

function matchesBusType(layoutType: string, filter: BusTypeFilter): boolean {
  return busTypeCategory(layoutType) === filter;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchesOperator(tripName: string, serviceName: string): boolean {
  const trip = normalizeName(tripName);
  const service = normalizeName(serviceName);
  return trip === service || trip.includes(service) || service.includes(trip);
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
  const [operatorFilters, setOperatorFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [priceBounds, setPriceBounds] = useState<[number, number]>([0, 10000]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setExpandedTripId(null);
      try {
        const params = new URLSearchParams({ origin, destination, date });
        const [tripsRes, meRes, demoRes] = await Promise.all([
          fetch(`/api/trips/search?${params}`),
          fetch("/api/auth/me"),
          fetch("/api/demo-user"),
        ]);
        const tripsJson = await tripsRes.json();
        const meJson = await meRes.json();
        const demoJson = await demoRes.json();

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
        if (!cancelled) {
          if (meRes.ok && meJson.success && meJson.data?.id) {
            setUserId(meJson.data.id);
          } else if (demoRes.ok && demoJson.success && demoJson.data?.id) {
            setUserId(demoJson.data.id);
          }
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
    const list = trips.filter((trip) => {
      if (timeFilters.length > 0) {
        if (!timeFilters.includes(tripBucket(trip.departureTime))) return false;
      }
      if (busTypeFilters.length > 0) {
        const ok = busTypeFilters.some((f) =>
          matchesBusType(trip.bus.layoutType, f),
        );
        if (!ok) return false;
      }
      if (operatorFilters.length > 0) {
        const ok = operatorFilters.some((svc) =>
          matchesOperator(trip.operator.name, svc),
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

    const sorted = [...list];
    if (sortBy === "cheapest") {
      sorted.sort((a, b) => {
        const aSale = a.basePrice - dealForTrip(a.id, a.basePrice);
        const bSale = b.basePrice - dealForTrip(b.id, b.basePrice);
        return aSale - bSale || a.departureTime.localeCompare(b.departureTime);
      });
    } else if (sortBy === "earliest") {
      sorted.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
    }
    // recommended: keep API / load order
    return sorted;
  }, [trips, timeFilters, busTypeFilters, operatorFilters, priceRange, sortBy]);

  const activeFilterCount =
    timeFilters.length +
    busTypeFilters.length +
    operatorFilters.length +
    (priceRange[0] > priceBounds[0] || priceRange[1] < priceBounds[1]
      ? 1
      : 0);

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

  function toggleOperator(name: string) {
    setOperatorFilters((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  }

  function clearFilters() {
    setTimeFilters([]);
    setBusTypeFilters([]);
    setOperatorFilters([]);
    setPriceRange(priceBounds);
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

  const filterPanel = (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-[#0a2f6b]/55 uppercase">
          Bus type
        </p>
        <div className="space-y-2">
          <FilterChip
            active={busTypeFilters.includes("executive")}
            onClick={() => toggleBusType("executive")}
            label="2×2 Executive"
          />
          <FilterChip
            active={busTypeFilters.includes("business")}
            onClick={() => toggleBusType("business")}
            label="2×1 Business"
          />
          <FilterChip
            active={busTypeFilters.includes("sleeper")}
            onClick={() => toggleBusType("sleeper")}
            label="Sleeper"
          />
        </div>
      </div>

      <Separator />

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-[#0a2f6b]/55 uppercase">
          Bus service
        </p>
        <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {BUS_SERVICES.map((name) => {
            const checked = operatorFilters.includes(name);
            return (
              <label
                key={name}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition",
                  checked
                    ? "bg-[#e8eef8] text-[#0a2f6b]"
                    : "text-[#0a2f6b]/85 hover:bg-[#f3f6fb]",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleOperator(name)}
                  className="size-3.5 shrink-0 rounded border-[#0a2f6b]/30 accent-[#0a2f6b]"
                />
                <span className="leading-snug">{name}</span>
              </label>
            );
          })}
        </div>
      </div>

      <Separator />

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-[#0a2f6b]/55 uppercase">
          Departure time
        </p>
        <div className="space-y-2">
          <FilterChip
            active={timeFilters.includes("earlyMorning")}
            onClick={() => toggleTime("earlyMorning")}
            icon={<Sunrise className="size-3.5" />}
            label="Early Morning"
            hint="12:00 AM – 05:59 AM"
          />
          <FilterChip
            active={timeFilters.includes("morning")}
            onClick={() => toggleTime("morning")}
            icon={<Sun className="size-3.5" />}
            label="Morning"
            hint="06:00 AM – 11:59 AM"
          />
          <FilterChip
            active={timeFilters.includes("afternoon")}
            onClick={() => toggleTime("afternoon")}
            icon={<Sunset className="size-3.5" />}
            label="Afternoon"
            hint="12:00 PM – 07:59 PM"
          />
          <FilterChip
            active={timeFilters.includes("night")}
            onClick={() => toggleTime("night")}
            icon={<Moon className="size-3.5" />}
            label="Night"
            hint="08:00 PM – 11:59 PM"
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

      {activeFilterCount > 0 ? (
        <button
          type="button"
          onClick={clearFilters}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#0a2f6b]/15 px-3 py-2 text-sm text-[#0a2f6b] transition hover:bg-[#f3f6fb]"
        >
          <X className="size-3.5" />
          Clear filters
        </button>
      ) : null}
    </div>
  );

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

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Mobile filter toggle */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="inline-flex h-11 w-full items-center justify-between rounded-xl border border-[#0a2f6b]/15 bg-white px-4 text-sm font-medium text-[#0a2f6b] shadow-sm"
          >
            <span className="inline-flex items-center gap-2">
              <Filter className="size-4" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="rounded-full bg-[#f5a623] px-2 py-0.5 text-xs font-semibold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </span>
            <ChevronDown
              className={cn(
                "size-4 transition",
                filtersOpen && "rotate-180",
              )}
            />
          </button>
          {filtersOpen ? (
            <aside className="mt-3 rounded-2xl border border-[#0a2f6b]/10 bg-white p-4 shadow-sm">
              {filterPanel}
            </aside>
          ) : null}
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden h-fit rounded-2xl border border-[#0a2f6b]/10 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:block">
          <div className="mb-3 flex items-center gap-2 text-[#0a2f6b]">
            <Filter className="size-4" />
            <h2 className="font-heading text-lg font-semibold">Filters</h2>
          </div>
          {filterPanel}
        </aside>

        <section className="space-y-4">
          {!loading && !error ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#0a2f6b]/65">
                {filtered.length}{" "}
                {filtered.length === 1 ? "bus found" : "buses found"}
              </p>
              <div
                className="inline-flex flex-wrap rounded-xl border border-[#0a2f6b]/10 bg-white p-1 shadow-sm"
                role="group"
                aria-label="Sort results"
              >
                {(
                  [
                    ["recommended", "Recommended"],
                    ["cheapest", "Cheapest"],
                    ["earliest", "Earliest"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSortBy(value)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                      sortBy === value
                        ? "bg-[#0a2f6b] text-white"
                        : "text-[#0a2f6b]/70 hover:bg-[#f3f6fb] hover:text-[#0a2f6b]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

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
                Try clearing filters or search Karachi → Lahore for tomorrow
                after seeding the database.
              </p>
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0a2f6b] px-4 py-2 text-sm font-medium text-white"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : null}

          {filtered.map((trip) => (
            <TripResultCard
              key={trip.id}
              trip={trip}
              expanded={expandedTripId === trip.id}
              deal={dealForTrip(trip.id, trip.basePrice)}
              userId={userId}
              onToggle={() => toggleExpand(trip.id)}
            />
          ))}
        </section>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  hint,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
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
      <span className="flex min-w-0 flex-1 flex-col">
        <span>{label}</span>
        {hint ? (
          <span
            className={cn(
              "text-[10px] leading-tight",
              active ? "text-white/75" : "text-[#0a2f6b]/45",
            )}
          >
            {hint}
          </span>
        ) : null}
      </span>
    </button>
  );
}
