"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, BusFront, CalendarDays, MapPin } from "lucide-react";
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
} from "@/lib/booking-utils";
import { cn } from "@/lib/utils";

interface SearchWidgetProps {
  className?: string;
  defaultOrigin?: string;
  defaultDestination?: string;
  defaultDate?: string;
  compact?: boolean;
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

  const minDate = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

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
        "w-full rounded-2xl border border-white/15 bg-white/95 p-4 shadow-[0_20px_60px_-20px_rgba(8,40,36,0.45)] backdrop-blur-md sm:p-5",
        compact && "shadow-md",
        className,
      )}
    >
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_1fr_auto] md:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="origin" className="text-xs font-medium text-teal-950/70">
            From
          </Label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-teal-800/50" />
            <Select value={origin} onValueChange={(v) => v && setOrigin(v)}>
              <SelectTrigger
                id="origin"
                className="h-11 w-full min-w-0 border-teal-900/10 bg-teal-50/40 pl-8"
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
            className="size-11 shrink-0 border-teal-900/10 bg-white text-teal-900 hover:bg-teal-50"
            aria-label="Swap cities"
          >
            <ArrowRightLeft className="size-4" />
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="destination"
            className="text-xs font-medium text-teal-950/70"
          >
            To
          </Label>
          <div className="relative">
            <BusFront className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-teal-800/50" />
            <Select
              value={destination}
              onValueChange={(v) => v && setDestination(v)}
            >
              <SelectTrigger
                id="destination"
                className="h-11 w-full min-w-0 border-teal-900/10 bg-teal-50/40 pl-8"
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
          <Label htmlFor="date" className="text-xs font-medium text-teal-950/70">
            Travel date
          </Label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-teal-800/50" />
            <Input
              id="date"
              type="date"
              min={minDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 border-teal-900/10 bg-teal-50/40 pl-8"
            />
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-11 bg-teal-800 px-6 text-white hover:bg-teal-700 md:min-w-[140px]"
        >
          Search Buses
        </Button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
