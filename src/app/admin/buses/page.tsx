"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
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
import { busTypeLabel } from "@/lib/booking-utils";

type BusRow = {
  id: string;
  busNumber: string;
  layoutType: string;
  totalSeats: number;
  operator: { id: string; name: string };
  tripCount: number;
};

export default function AdminBusesPage() {
  const [buses, setBuses] = useState<BusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    busNumber: "",
    layoutType: "2x2",
    totalSeats: "40",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/buses");
      const json = await res.json();
      if (json.success) setBuses(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/admin/buses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        busNumber: form.busNumber,
        layoutType: form.layoutType,
        totalSeats: Number(form.totalSeats),
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setMessage(json.message || "Failed to register bus.");
      return;
    }
    setOpen(false);
    setForm({ busNumber: "", layoutType: "2x2", totalSeats: "40" });
    setMessage("Bus registered.");
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Fleet Manager</h1>
          <p className="mt-1 text-sm text-teal-900/60">
            Registered coaches, layouts, and seat capacity
          </p>
        </div>

        <Button
          className="bg-teal-800 text-white hover:bg-teal-700"
          onClick={() => setOpen(true)}
        >
          <Plus className="size-4" /> Register bus
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Register new bus</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Registration number</Label>
                <Input
                  value={form.busNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, busNumber: e.target.value }))
                  }
                  placeholder="DAEWOO-786"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Layout type</Label>
                <Select
                  value={form.layoutType}
                  onValueChange={(v) =>
                    v && setForm((p) => ({ ...p, layoutType: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2x2">2x2 Executive</SelectItem>
                    <SelectItem value="2x1_SLEEPER">2x1 Sleeper</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Total seats</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.totalSeats}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, totalSeats: e.target.value }))
                  }
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-teal-800 text-white hover:bg-teal-700"
              >
                Save bus
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {message ? (
        <p className="rounded-xl border border-teal-900/10 bg-white px-4 py-3 text-sm">
          {message}
        </p>
      ) : null}

      <Card className="border-teal-900/10 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Registered buses</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex h-32 items-center justify-center gap-2 text-teal-900/60">
              <Loader2 className="size-5 animate-spin" /> Loading fleet…
            </div>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-teal-900/10 text-xs tracking-wide text-teal-900/55 uppercase">
                <tr>
                  <th className="px-2 py-2">Bus number</th>
                  <th className="px-2 py-2">Operator</th>
                  <th className="px-2 py-2">Layout</th>
                  <th className="px-2 py-2">Seats</th>
                  <th className="px-2 py-2">Trips</th>
                </tr>
              </thead>
              <tbody>
                {buses.map((b) => (
                  <tr key={b.id} className="border-b border-teal-900/5">
                    <td className="px-2 py-3 font-medium">{b.busNumber}</td>
                    <td className="px-2 py-3">
                      {b.operator.name.replace(/\s+Operator$/i, "")}
                    </td>
                    <td className="px-2 py-3">
                      <Badge variant="secondary">
                        {busTypeLabel(b.layoutType)}
                      </Badge>
                    </td>
                    <td className="px-2 py-3">{b.totalSeats}</td>
                    <td className="px-2 py-3">{b.tripCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
