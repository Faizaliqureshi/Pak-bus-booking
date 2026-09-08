"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, BusFront, CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        "w-full rounded-2xl border border-[#0a2f6b]/8 bg-[#eef2f8] p-4 shadow-[0_24px_60px_-28px_rgba(8,30,70,0.55)] sm:p-5",
        compact && "border-[#0a2f6b]/10 bg-white shadow-sm",
        className,
      )}
    >
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_1fr_auto] md:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="origin" className="text-xs font-medium text-[#0a2f6b]/65">
            From City
          </Label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[#0a2f6b]/45" />
            <Select value={origin} onValueChange={(v) => v && setOrigin(v)}>
              <SelectTrigger
                id="origin"
                className="h-12 w-full min-w-0 border-transparent bg-white pl-8 text-[#0a2f6b]"
              >
                <SelectValue placeholder="Origin city" />
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
        </div>

        <div className="flex items-end justify-center pb-0.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={swapCities}
            className="size-12 shrink-0 rounded-full border-white bg-white text-[#0a2f6b] shadow-sm hover:bg-[#f5f8fc]"
            aria-label="Swap from and to cities"
            title="Swap route"
          >
            <ArrowLeftRight className="size-4" />
            <span className="sr-only">⇄</span>
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="destination"
            className="text-xs font-medium text-[#0a2f6b]/65"
          >
            To City
          </Label>
          <div className="relative">
            <BusFront className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[#0a2f6b]/45" />
            <Select
              value={destination}
              onValueChange={(v) => v && setDestination(v)}
            >
              <SelectTrigger
                id="destination"
                className="h-12 w-full min-w-0 border-transparent bg-white pl-8 text-[#0a2f6b]"
              >
                <SelectValue placeholder="Destination city" />
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
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date" className="text-xs font-medium text-[#0a2f6b]/65">
            Departure date
          </Label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[#0a2f6b]/45" />
            <Input
              id="date"
              type="date"
              min={minDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 border-transparent bg-white pl-8 text-[#0a2f6b]"
            />
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-12 bg-[#FF5A1F] px-6 text-white hover:bg-[#e84e16] md:min-w-[150px]"
        >
          Search Buses
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-[#0a2f6b]/55">Quick date</span>
        <button
          type="button"
          onClick={() => setDate(today)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold transition",
            date === today
              ? "bg-[#0a2f6b] text-white"
              : "bg-white text-[#0a2f6b] hover:bg-[#e8eef8]",
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
              : "bg-white text-[#0a2f6b] hover:bg-[#e8eef8]",
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
