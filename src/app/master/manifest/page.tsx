"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCnic } from "@/lib/checkout-utils";
import { formatRs, formatTime } from "@/lib/booking-utils";
import { cn } from "@/lib/utils";

type TripOption = {
  id: string;
  departureTime: string;
  bus: { busNumber: string; totalSeats: number };
  route: { name: string; originCity: string; destinationCity: string };
};

type ManifestSeat = {
  seatNumber: string;
  status: "AVAILABLE" | "BOOKED" | "LOCKED";
  passengers: Array<{
    name: string;
    cnic: string | null;
    phone: string | null;
    pnr: string;
    isBoarded: boolean;
    boardingStop: string;
    dropStop: string;
  }>;
};

type ManifestPassenger = {
  seatNumber: string;
  name: string;
  cnic: string | null;
  phone: string | null;
  pnr: string;
  isBoarded: boolean;
  boardingStop: string;
  dropStop: string;
};

type ManifestTrip = {
  id: string;
  basePrice: number;
  busNumber: string;
  totalSeats: number;
  routeName: string;
  stops: Array<{ id: string; name: string; order: number }>;
  defaultBoardingStopId: string | null;
  defaultDropStopId: string | null;
};

export default function AdminManifestPage() {
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [tripId, setTripId] = useState("");
  const [manifestTrip, setManifestTrip] = useState<ManifestTrip | null>(null);
  const [seats, setSeats] = useState<ManifestSeat[]>([]);
  const [passengers, setPassengers] = useState<ManifestPassenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingManifest, setLoadingManifest] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [walkIn, setWalkIn] = useState({
    passengerName: "",
    gender: "MALE",
    cnic: "",
    phone: "03001234567",
    boardingStopId: "",
    dropStopId: "",
  });

  useEffect(() => {
    let cancelled = false;
    async function loadTrips() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/trips");
        const json = await res.json();
        if (!cancelled && json.success) {
          setTrips(json.data);
          if (json.data[0]) setTripId(json.data[0].id);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadTrips();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadManifest = useCallback(async (id: string) => {
    if (!id) return;
    setLoadingManifest(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/manifest/${id}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage(json.message || "Failed to load manifest.");
        return;
      }
      setManifestTrip(json.data.trip);
      setSeats(json.data.seats);
      setPassengers(json.data.passengers);
      setWalkIn((prev) => ({
        ...prev,
        boardingStopId:
          json.data.trip.defaultBoardingStopId ?? prev.boardingStopId,
        dropStopId: json.data.trip.defaultDropStopId ?? prev.dropStopId,
      }));
    } finally {
      setLoadingManifest(false);
    }
  }, []);

  useEffect(() => {
    if (tripId) void loadManifest(tripId);
  }, [tripId, loadManifest]);

  const boardedCount = useMemo(
    () => passengers.filter((p) => p.isBoarded).length,
    [passengers],
  );

  function openWalkIn(seatNumber: string) {
    setSelectedSeat(seatNumber);
    setWalkInOpen(true);
  }

  async function submitWalkIn(e: React.FormEvent) {
    e.preventDefault();
    if (!tripId || !selectedSeat) return;
    setMessage(null);
    const res = await fetch("/api/admin/walk-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripId,
        seatNumber: selectedSeat,
        ...walkIn,
        cnic: walkIn.cnic,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setMessage(json.message || "Walk-in booking failed.");
      return;
    }
    setWalkInOpen(false);
    setMessage(`Walk-in booked · PNR ${json.data.pnr}`);
    setWalkIn((prev) => ({
      ...prev,
      passengerName: "",
      cnic: "",
      gender: "MALE",
    }));
    await loadManifest(tripId);
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center gap-2 text-teal-900/60">
        <Loader2 className="size-5 animate-spin" /> Loading trips…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">
            Passenger Manifest
          </h1>
          <p className="mt-1 text-sm text-teal-900/60">
            Terminal counter view · boarding status · walk-in sales
          </p>
        </div>
        <div className="min-w-[260px] space-y-1.5">
          <Label>Active trip</Label>
          <Select value={tripId} onValueChange={(v) => v && setTripId(v)}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="Select trip" />
            </SelectTrigger>
            <SelectContent>
              {trips.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {formatTime(t.departureTime)} · {t.bus.busNumber} ·{" "}
                  {t.route.originCity}→{t.route.destinationCity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {message ? (
        <p className="rounded-xl border border-teal-900/10 bg-white px-4 py-3 text-sm">
          {message}
        </p>
      ) : null}

      {manifestTrip ? (
        <div className="flex flex-wrap gap-2 text-sm text-teal-900/70">
          <Badge variant="secondary">{manifestTrip.routeName}</Badge>
          <Badge variant="outline">{manifestTrip.busNumber}</Badge>
          <Badge variant="outline">
            {boardedCount}/{passengers.length} boarded
          </Badge>
          <Badge variant="outline">
            Base {formatRs(manifestTrip.basePrice)}
          </Badge>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-teal-900/10 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Seat grid</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingManifest ? (
              <div className="flex h-40 items-center justify-center gap-2 text-teal-900/60">
                <Loader2 className="size-5 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {seats.map((seat) => {
                  const boarded = seat.passengers.some((p) => p.isBoarded);
                  return (
                    <button
                      key={seat.seatNumber}
                      type="button"
                      disabled={seat.status !== "AVAILABLE"}
                      onClick={() => openWalkIn(seat.seatNumber)}
                      className={cn(
                        "rounded-lg border px-2 py-3 text-center text-xs font-semibold transition",
                        seat.status === "AVAILABLE" &&
                          "border-teal-900/20 bg-white hover:border-teal-700 hover:bg-teal-50",
                        seat.status === "BOOKED" &&
                          (boarded
                            ? "cursor-default border-emerald-500 bg-emerald-500 text-white"
                            : "cursor-default border-zinc-300 bg-zinc-200 text-zinc-600"),
                        seat.status === "LOCKED" &&
                          "cursor-default border-amber-400 bg-amber-200 text-amber-950",
                      )}
                      title={
                        seat.status === "AVAILABLE"
                          ? "Book walk-in"
                          : seat.passengers[0]?.name
                      }
                    >
                      {seat.seatNumber}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-3 text-xs text-teal-900/55">
              Tap an available seat to open walk-in ticket sale.
            </p>
          </CardContent>
        </Card>

        <Card className="border-teal-900/10 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-xl">
              Passenger table
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-teal-900/10 text-xs tracking-wide text-teal-900/55 uppercase">
                <tr>
                  <th className="px-2 py-2">Seat</th>
                  <th className="px-2 py-2">Passenger / CNIC</th>
                  <th className="px-2 py-2">Phone</th>
                  <th className="px-2 py-2">Segment</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {passengers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-2 py-8 text-center text-teal-900/50"
                    >
                      No paid passengers on this trip yet
                    </td>
                  </tr>
                ) : (
                  passengers.map((p) => (
                    <tr
                      key={`${p.pnr}-${p.seatNumber}`}
                      className="border-b border-teal-900/5"
                    >
                      <td className="px-2 py-3 font-medium">{p.seatNumber}</td>
                      <td className="px-2 py-3">
                        <p>{p.name}</p>
                        <p className="font-mono text-xs text-teal-900/55">
                          {p.cnic ?? "—"}
                        </p>
                      </td>
                      <td className="px-2 py-3 font-mono text-xs">
                        {p.phone ?? "—"}
                      </td>
                      <td className="px-2 py-3 text-xs">
                        {p.boardingStop} → {p.dropStop}
                      </td>
                      <td className="px-2 py-3">
                        {p.isBoarded ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="size-4" /> Boarded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <Clock3 className="size-4" /> Not boarded
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={walkInOpen} onOpenChange={setWalkInOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Walk-in ticket · Seat {selectedSeat}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitWalkIn} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Passenger name</Label>
              <Input
                value={walkIn.passengerName}
                onChange={(e) =>
                  setWalkIn((p) => ({ ...p, passengerName: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select
                  value={walkIn.gender}
                  onValueChange={(v) =>
                    v && setWalkIn((p) => ({ ...p, gender: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={walkIn.phone}
                  onChange={(e) =>
                    setWalkIn((p) => ({
                      ...p,
                      phone: e.target.value.replace(/\D/g, "").slice(0, 11),
                    }))
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>CNIC</Label>
              <Input
                value={walkIn.cnic}
                onChange={(e) =>
                  setWalkIn((p) => ({ ...p, cnic: formatCnic(e.target.value) }))
                }
                placeholder="00000-0000000-0"
                className="font-mono"
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Boarding</Label>
                <Select
                  value={walkIn.boardingStopId}
                  onValueChange={(v) =>
                    v && setWalkIn((p) => ({ ...p, boardingStopId: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {manifestTrip?.stops.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Drop</Label>
                <Select
                  value={walkIn.dropStopId}
                  onValueChange={(v) =>
                    v && setWalkIn((p) => ({ ...p, dropStopId: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {manifestTrip?.stops.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-teal-800 text-white hover:bg-teal-700"
            >
              Confirm walk-in · {formatRs(manifestTrip?.basePrice ?? 0)}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
