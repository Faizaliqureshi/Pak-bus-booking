"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Radio } from "lucide-react";
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
  BUS_LAYOUT_OPTIONS,
  PAKISTAN_CITIES,
  defaultTravelDate,
  formatPkr,
  formatTime,
  toDateInputValue,
} from "@/lib/booking-utils";

type BusOption = {
  id: string;
  busNumber: string;
  layoutType: string;
  totalSeats: number;
};

type LiveTrip = {
  id: string;
  busNumber: string;
  routeName: string;
  originCity: string;
  destinationCity: string;
  departureTime: string;
  arrivalTime: string;
  basePrice: number;
};

function pktIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00+05:00`).toISOString();
}

export default function PartnerRoutesPage() {
  const [buses, setBuses] = useState<BusOption[]>([]);
  const [trips, setTrips] = useState<LiveTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [busMode, setBusMode] = useState<"existing" | "new">("existing");
  const [busId, setBusId] = useState("");
  const [busNumber, setBusNumber] = useState("");
  const [layoutType, setLayoutType] = useState("2x2");
  const [totalSeats, setTotalSeats] = useState("40");
  const [name, setName] = useState("");
  const [originCity, setOriginCity] = useState("Karachi");
  const [destinationCity, setDestinationCity] = useState("Lahore");
  const [distanceKm, setDistanceKm] = useState("1200");
  const [basePrice, setBasePrice] = useState("4500");
  const [departDate, setDepartDate] = useState(defaultTravelDate);
  const [departTime, setDepartTime] = useState("15:00");
  const [arriveDate, setArriveDate] = useState(() => {
    const d = new Date(`${defaultTravelDate()}T12:00:00`);
    d.setDate(d.getDate() + 1);
    return toDateInputValue(d);
  });
  const [arriveTime, setArriveTime] = useState("09:00");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partner/live");
      const json = await res.json();
      if (json.success) {
        const nextBuses = json.data.buses as BusOption[];
        setBuses(nextBuses);
        setTrips(json.data.trips as LiveTrip[]);
        if (nextBuses.length === 0) setBusMode("new");
        setBusId((current) => current || nextBuses[0]?.id || "");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/partner/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          busId: busMode === "existing" ? busId : undefined,
          busNumber: busMode === "new" ? busNumber : undefined,
          layoutType: busMode === "new" ? layoutType : undefined,
          totalSeats: busMode === "new" ? Number(totalSeats) : undefined,
          name:
            name.trim() ||
            `${originCity} to ${destinationCity} Express`,
          originCity,
          destinationCity,
          distanceKm: Number(distanceKm),
          basePrice: Number(basePrice),
          departureTime: pktIso(departDate, departTime),
          arrivalTime: pktIso(arriveDate, arriveTime),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not go live.");
      }
      setMessage(
        `${json.data.bus.busNumber} is live on ${json.data.route.originCity} → ${json.data.route.destinationCity}. Passengers can search it now.`,
      );
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Live routes</h1>
        <p className="mt-1 text-sm text-[#0a2f6b]/65">
          Attach a coach to a corridor and publish a departure. It appears on
          TicketPass search immediately. GDS partners can do the same with{" "}
          <code>POST /api/v1/partner/live</code>.
        </p>
      </div>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="grid gap-4 rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm sm:grid-cols-2"
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Coach</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={busMode === "existing" ? "default" : "outline"}
              className={
                busMode === "existing"
                  ? "h-9 bg-[#0a2f6b] text-white"
                  : "h-9"
              }
              onClick={() => setBusMode("existing")}
              disabled={buses.length === 0}
            >
              Existing bus
            </Button>
            <Button
              type="button"
              variant={busMode === "new" ? "default" : "outline"}
              className={
                busMode === "new" ? "h-9 bg-[#0a2f6b] text-white" : "h-9"
              }
              onClick={() => setBusMode("new")}
            >
              Create bus
            </Button>
          </div>
        </div>

        {busMode === "existing" ? (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Bus number</Label>
            <Select value={busId} onValueChange={(v) => v && setBusId(v)}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Select a coach" />
              </SelectTrigger>
              <SelectContent>
                {buses.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.busNumber} · {b.totalSeats} seats
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label>New bus number</Label>
              <Input
                required
                value={busNumber}
                onChange={(e) => setBusNumber(e.target.value)}
                className="h-11"
                placeholder="DAEWOO-901"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Layout</Label>
                <Select
                  value={layoutType}
                  onValueChange={(v) => v && setLayoutType(v)}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUS_LAYOUT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Seats</Label>
                <Input
                  type="number"
                  min={1}
                  required
                  value={totalSeats}
                  onChange={(e) => setTotalSeats(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
          </>
        )}

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Route name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11"
            placeholder="Karachi to Lahore Express"
          />
        </div>
        <div className="space-y-1.5">
          <Label>From</Label>
          <Select
            value={originCity}
            onValueChange={(v) => v && setOriginCity(v)}
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue />
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
        <div className="space-y-1.5">
          <Label>To</Label>
          <Select
            value={destinationCity}
            onValueChange={(v) => v && setDestinationCity(v)}
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue />
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
        <div className="space-y-1.5">
          <Label>Distance (km)</Label>
          <Input
            type="number"
            min={1}
            required
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Fare (PKR)</Label>
          <Input
            type="number"
            min={0}
            required
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Depart date</Label>
            <Input
              type="date"
              required
              value={departDate}
              onChange={(e) => setDepartDate(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Depart time</Label>
            <Input
              type="time"
              required
              value={departTime}
              onChange={(e) => setDepartTime(e.target.value)}
              className="h-11"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Arrive date</Label>
            <Input
              type="date"
              required
              value={arriveDate}
              onChange={(e) => setArriveDate(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Arrive time</Label>
            <Input
              type="time"
              required
              value={arriveTime}
              onChange={(e) => setArriveTime(e.target.value)}
              className="h-11"
            />
          </div>
        </div>

        {error ? (
          <p className="text-sm text-red-700 sm:col-span-2">{error}</p>
        ) : null}
        {message ? (
          <p className="text-sm text-emerald-700 sm:col-span-2">{message}</p>
        ) : null}

        <div className="sm:col-span-2">
          <Button
            type="submit"
            disabled={saving}
            className="h-11 bg-[#0a2f6b] text-white hover:bg-[#08305f]"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Radio className="size-4" />
                Go live
              </>
            )}
          </Button>
        </div>
      </form>

      <div className="rounded-2xl border border-[#0a2f6b]/10 bg-white shadow-sm">
        <div className="border-b border-[#0a2f6b]/10 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold">
            Published departures
          </h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f3f6fb] text-[#0a2f6b]/70">
                <tr>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Bus</th>
                  <th className="px-4 py-3">Departure</th>
                  <th className="px-4 py-3">Fare</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {trips.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-[#0a2f6b]/50"
                    >
                      No live trips yet — publish one above or via the Partner
                      API.
                    </td>
                  </tr>
                ) : (
                  trips.map((t) => (
                    <tr key={t.id} className="border-t border-[#0a2f6b]/8">
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {t.originCity} → {t.destinationCity}
                        </p>
                        <p className="text-xs text-[#0a2f6b]/50">
                          {t.routeName}
                        </p>
                      </td>
                      <td className="px-4 py-3">{t.busNumber}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatTime(t.departureTime)}
                      </td>
                      <td className="px-4 py-3">{formatPkr(t.basePrice)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/partner/trips/${t.id}`}
                          className="text-xs font-medium text-[#0a2f6b] underline-offset-2 hover:underline"
                        >
                          Seats & bookings
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
