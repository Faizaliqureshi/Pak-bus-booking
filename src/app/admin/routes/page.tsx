"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PAKISTAN_CITIES, formatRs, formatTime } from "@/lib/booking-utils";

type RouteRow = {
  id: string;
  name: string;
  originCity: string;
  destinationCity: string;
  distanceKm: number;
  stops: Array<{
    id: string;
    stationName: string;
    stopOrder: number;
    distanceFromOrigin: number;
  }>;
  recentTrips: Array<{
    id: string;
    busNumber: string;
    departureTime: string;
    arrivalTime: string;
    basePrice: number;
  }>;
};

type BusRow = {
  id: string;
  busNumber: string;
};

export default function AdminRoutesPage() {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [buses, setBuses] = useState<BusRow[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [routeForm, setRouteForm] = useState({
    name: "",
    originCity: "Karachi",
    destinationCity: "Lahore",
    distanceKm: "1260",
  });

  const [stopForm, setStopForm] = useState({
    stationName: "",
    stopOrder: "2",
    distanceFromOrigin: "100",
  });

  const [tripForm, setTripForm] = useState({
    busId: "",
    routeId: "",
    departureTime: "",
    arrivalTime: "",
    basePrice: "4500",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [routesRes, busesRes] = await Promise.all([
        fetch("/api/admin/routes"),
        fetch("/api/admin/buses"),
      ]);
      const routesJson = await routesRes.json();
      const busesJson = await busesRes.json();
      if (routesJson.success) {
        setRoutes(routesJson.data);
        if (!selectedRouteId && routesJson.data[0]) {
          setSelectedRouteId(routesJson.data[0].id);
          setTripForm((prev) => ({
            ...prev,
            routeId: routesJson.data[0].id,
          }));
        }
      }
      if (busesJson.success) {
        setBuses(busesJson.data);
        if (!tripForm.busId && busesJson.data[0]) {
          setTripForm((prev) => ({ ...prev, busId: busesJson.data[0].id }));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [selectedRouteId, tripForm.busId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);

  async function createRoute(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/admin/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...routeForm,
        distanceKm: Number(routeForm.distanceKm),
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setMessage(json.message || "Failed to create route.");
      return;
    }
    setMessage("Route created.");
    setRouteForm({
      name: "",
      originCity: "Karachi",
      destinationCity: "Lahore",
      distanceKm: "1260",
    });
    await load();
  }

  async function addStop(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRouteId) return;
    setMessage(null);
    const res = await fetch(`/api/admin/routes/${selectedRouteId}/stops`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stationName: stopForm.stationName,
        stopOrder: Number(stopForm.stopOrder),
        distanceFromOrigin: Number(stopForm.distanceFromOrigin),
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setMessage(json.message || "Failed to add stop.");
      return;
    }
    setMessage("Stop added.");
    setStopForm({ stationName: "", stopOrder: "2", distanceFromOrigin: "100" });
    await load();
  }

  async function scheduleTrip(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/admin/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        busId: tripForm.busId,
        routeId: tripForm.routeId || selectedRouteId,
        departureTime: tripForm.departureTime,
        arrivalTime: tripForm.arrivalTime,
        basePrice: Number(tripForm.basePrice),
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setMessage(json.message || "Failed to schedule trip.");
      return;
    }
    setMessage("Trip scheduled.");
    await load();
  }

  if (loading && routes.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center gap-2 text-teal-900/60">
        <Loader2 className="size-5 animate-spin" /> Loading routes…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Routes & Trips</h1>
        <p className="mt-1 text-sm text-teal-900/60">
          Create corridors, manage stop sequences, and schedule departures
        </p>
      </div>

      {message ? (
        <p className="rounded-xl border border-teal-900/10 bg-white px-4 py-3 text-sm text-teal-900">
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-teal-900/10 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Route creator</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createRoute} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Route name</Label>
                <Input
                  value={routeForm.name}
                  onChange={(e) =>
                    setRouteForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Karachi to Lahore Express"
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Origin</Label>
                  <Select
                    value={routeForm.originCity}
                    onValueChange={(v) =>
                      v && setRouteForm((p) => ({ ...p, originCity: v }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAKISTAN_CITIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Destination</Label>
                  <Select
                    value={routeForm.destinationCity}
                    onValueChange={(v) =>
                      v && setRouteForm((p) => ({ ...p, destinationCity: v }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAKISTAN_CITIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Distance (km)</Label>
                <Input
                  type="number"
                  min={1}
                  value={routeForm.distanceKm}
                  onChange={(e) =>
                    setRouteForm((p) => ({ ...p, distanceKm: e.target.value }))
                  }
                  required
                />
              </div>
              <Button type="submit" className="bg-teal-800 text-white hover:bg-teal-700">
                <Plus className="size-4" /> Create route
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-teal-900/10 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-xl">
              Stop sequence manager
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Select route</Label>
              <Select
                value={selectedRouteId}
                onValueChange={(v) => {
                  if (!v) return;
                  setSelectedRouteId(v);
                  setTripForm((p) => ({ ...p, routeId: v }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose route" />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRoute ? (
              <ol className="space-y-2 rounded-xl bg-teal-50/50 p-3 text-sm">
                {selectedRoute.stops.map((s) => (
                  <li key={s.id} className="flex justify-between gap-3">
                    <span>
                      <Badge variant="outline" className="mr-2">
                        {s.stopOrder}
                      </Badge>
                      {s.stationName}
                    </span>
                    <span className="text-teal-900/55">
                      {s.distanceFromOrigin} km
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}

            <Separator />

            <form onSubmit={addStop} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Station name</Label>
                <Input
                  value={stopForm.stationName}
                  onChange={(e) =>
                    setStopForm((p) => ({ ...p, stationName: e.target.value }))
                  }
                  placeholder="Sukkur Bypass Terminal"
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Stop order</Label>
                  <Input
                    type="number"
                    min={1}
                    value={stopForm.stopOrder}
                    onChange={(e) =>
                      setStopForm((p) => ({ ...p, stopOrder: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Distance from origin (km)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={stopForm.distanceFromOrigin}
                    onChange={(e) =>
                      setStopForm((p) => ({
                        ...p,
                        distanceFromOrigin: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>
              <Button type="submit" variant="outline">
                Add stop
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="border-teal-900/10 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Trip scheduler</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={scheduleTrip}
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"
          >
            <div className="space-y-1.5">
              <Label>Bus</Label>
              <Select
                value={tripForm.busId}
                onValueChange={(v) =>
                  v && setTripForm((p) => ({ ...p, busId: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select bus" />
                </SelectTrigger>
                <SelectContent>
                  {buses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.busNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Route</Label>
              <Select
                value={tripForm.routeId || selectedRouteId}
                onValueChange={(v) =>
                  v && setTripForm((p) => ({ ...p, routeId: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select route" />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Departure</Label>
              <Input
                type="datetime-local"
                value={tripForm.departureTime}
                onChange={(e) =>
                  setTripForm((p) => ({ ...p, departureTime: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Arrival</Label>
              <Input
                type="datetime-local"
                value={tripForm.arrivalTime}
                onChange={(e) =>
                  setTripForm((p) => ({ ...p, arrivalTime: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Base price (PKR)</Label>
              <Input
                type="number"
                min={1}
                value={tripForm.basePrice}
                onChange={(e) =>
                  setTripForm((p) => ({ ...p, basePrice: e.target.value }))
                }
                required
              />
            </div>
            <div className="md:col-span-2 xl:col-span-5">
              <Button type="submit" className="bg-teal-800 text-white hover:bg-teal-700">
                Schedule trip
              </Button>
            </div>
          </form>

          {selectedRoute && selectedRoute.recentTrips.length > 0 ? (
            <div className="mt-6 overflow-x-auto">
              <p className="mb-2 text-xs tracking-wide text-teal-900/55 uppercase">
                Recent trips on selected route
              </p>
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-teal-900/10 text-xs text-teal-900/55 uppercase">
                  <tr>
                    <th className="px-2 py-2">Bus</th>
                    <th className="px-2 py-2">Departure</th>
                    <th className="px-2 py-2">Arrival</th>
                    <th className="px-2 py-2">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRoute.recentTrips.map((t) => (
                    <tr key={t.id} className="border-b border-teal-900/5">
                      <td className="px-2 py-2">{t.busNumber}</td>
                      <td className="px-2 py-2">{formatTime(t.departureTime)}</td>
                      <td className="px-2 py-2">{formatTime(t.arrivalTime)}</td>
                      <td className="px-2 py-2">{formatRs(t.basePrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
