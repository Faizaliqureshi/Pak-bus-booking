"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, CalendarDays, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PAKISTAN_CITIES,
  defaultTravelDate,
  toDateInputValue,
} from "@/lib/booking-utils";
import { cn } from "@/lib/utils";

interface SearchWidgetProps {
  className?: string;
  defaultOrigin?: string;
  defaultDestination?: string;
  defaultDate?: string;
  compact?: boolean;
}

function todayIso(): string {
  return toDateInputValue(new Date());
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toDateInputValue(d);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatNaturalDate(iso: string): string {
  const parsed = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return `${WEEKDAYS[parsed.getDay()]}, ${parsed.getDate()} ${MONTHS[parsed.getMonth()]}`;
}

export function SearchWidget({
  className,
  defaultOrigin = "Karachi",
  defaultDestination = "Lahore",
  defaultDate,
  compact = false,
}: SearchWidgetProps) {
  const router = useRouter();
  const [origin, setOrigin] = useState(defaultOrigin);
  const [destination, setDestination] = useState(defaultDestination);
  const [date, setDate] = useState(defaultDate ?? defaultTravelDate());
  const [error, setError] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;
    try {
      if (typeof input.showPicker === "function") {
        input.showPicker();
        return;
      }
    } catch {
      /* fall through */
    }
    input.focus();
    input.click();
  }

  const minDate = useMemo(() => todayIso(), []);
  const today = minDate;
  const tomorrow = useMemo(() => tomorrowIso(), []);

  function swapCities() {
    setOrigin(destination);
    setDestination(origin);
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!origin || !destination || !date) {
      setError("Please choose origin, destination, and travel date.");
      return;
    }
    if (origin === destination) {
      setError("Origin and destination must be different.");
      return;
    }
    setError(null);
    const params = new URLSearchParams({
      origin,
      destination,
      date,
    });
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSearch}
      className={cn(
        "w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-xl",
        compact && "shadow-md",
        className,
      )}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_auto] lg:items-stretch">
        <div className="relative grid min-h-14 grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <CityField
            id="origin"
            label="Leaving from"
            value={origin}
            onChange={setOrigin}
            className="pl-5 pr-12"
          />
          <div className="border-l border-slate-200">
            <CityField
              id="destination"
              label="Going to"
              value={destination}
              onChange={setDestination}
              className="pl-12 pr-4"
            />
          </div>
          <button
            type="button"
            onClick={swapCities}
            className="absolute top-1/2 left-1/2 z-10 inline-flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:border-[#0a2f6b]/30 hover:text-[#0a2f6b]"
            aria-label="Swap from and to cities"
            title="Swap route"
          >
            <ArrowLeftRight className="size-4" />
          </button>
        </div>

        <div className="relative min-h-14">
          <button
            type="button"
            onClick={openDatePicker}
            className="flex min-h-14 w-full cursor-pointer flex-col justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-left"
          >
            <span className="text-xs font-bold tracking-wide text-slate-500 uppercase">
              Date
            </span>
            <span className="mt-0.5 flex items-center gap-2 text-base font-semibold text-slate-900">
              <CalendarDays className="size-4 text-slate-500" />
              {formatNaturalDate(date)}
            </span>
          </button>
          <input
            ref={dateInputRef}
            id="date"
            type="date"
            min={minDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onPointerDown={(e) => {
              try {
                e.currentTarget.showPicker();
              } catch {
                /* native click still runs */
              }
            }}
            className="absolute inset-0 z-10 cursor-pointer opacity-[0.01]"
            aria-label={`Date ${formatNaturalDate(date)}`}
          />
        </div>

        <button
          type="submit"
          data-testid="search-buses-btn"
          className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-[#F5A623] px-7 text-base font-bold text-[#0A2F6B] shadow-sm transition hover:bg-[#e09415] lg:min-w-[168px]"
        >
          <Search className="size-5" />
          Search Buses
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">Quick date</span>
        <button
          type="button"
          onClick={() => setDate(today)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold transition",
            date === today
              ? "bg-[#0a2f6b] text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200",
          )}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setDate(tomorrow)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold transition",
            date === tomorrow
              ? "bg-[#0a2f6b] text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200",
          )}
        >
          Tomorrow
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function CityField({
  id,
  label,
  value,
  onChange,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-14 flex-col justify-center py-2",
        className,
      )}
    >
      <span className="text-xs font-bold tracking-wide text-slate-500 uppercase">
        {label}
      </span>
      <Select value={value} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger
          id={id}
          className="h-auto w-full min-w-0 border-0 bg-transparent p-0 text-base font-semibold text-slate-900 shadow-none focus-visible:ring-0 data-[size=default]:h-auto"
        >
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {PAKISTAN_CITIES.map((city) => (
            <SelectItem key={city} value={city}>
              {city}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
