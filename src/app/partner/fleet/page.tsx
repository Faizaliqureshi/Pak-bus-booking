"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
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
import { busTypeLabel } from "@/lib/booking-utils";

type BusRow = {
  id: string;
  busNumber: string;
  layoutType: string;
  totalSeats: number;
  tripCount: number;
};

export default function PartnerFleetPage() {
  const [buses, setBuses] = useState<BusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busNumber, setBusNumber] = useState("");
  const [layoutType, setLayoutType] = useState("2x2");
  const [totalSeats, setTotalSeats] = useState("40");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partner/buses");
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
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/partner/buses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          busNumber,
          layoutType,
          totalSeats: Number(totalSeats),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not add bus.");
      }
      setMessage(`Bus ${busNumber.toUpperCase()} added to your fleet.`);
      setBusNumber("");
      setLayoutType("2x2");
      setTotalSeats("40");
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
        <h1 className="font-heading text-3xl font-semibold">Your fleet</h1>
        <p className="mt-1 text-sm text-[#0a2f6b]/65">
          Add coaches that passengers can book under your operator name.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm sm:grid-cols-4"
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Bus number</Label>
          <Input
            required
            value={busNumber}
            onChange={(e) => setBusNumber(e.target.value)}
            className="h-11"
            placeholder="KAINAT-101"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Layout</Label>
          <Select value={layoutType} onValueChange={(v) => v && setLayoutType(v)}>
            <SelectTrigger className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2x2">2×2 Executive</SelectItem>
              <SelectItem value="2x1_SLEEPER">2×1 Sleeper</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Total seats</Label>
          <Input
            type="number"
            min={1}
            required
            value={totalSeats}
            onChange={(e) => setTotalSeats(e.target.value)}
            className="h-11"
          />
        </div>
        {error ? <p className="text-sm text-red-700 sm:col-span-4">{error}</p> : null}
        {message ? (
          <p className="text-sm text-emerald-700 sm:col-span-4">{message}</p>
        ) : null}
        <div className="sm:col-span-4">
          <Button
            type="submit"
            disabled={saving}
            className="h-11 bg-[#0a2f6b] text-white hover:bg-[#08305f]"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Plus className="size-4" />
                Add bus
              </>
            )}
          </Button>
        </div>
      </form>

      <div className="rounded-2xl border border-[#0a2f6b]/10 bg-white shadow-sm">
        <div className="border-b border-[#0a2f6b]/10 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold">Registered buses</h2>
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
                  <th className="px-4 py-3">Bus #</th>
                  <th className="px-4 py-3">Layout</th>
                  <th className="px-4 py-3">Seats</th>
                  <th className="px-4 py-3">Trips</th>
                </tr>
              </thead>
              <tbody>
                {buses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-[#0a2f6b]/50"
                    >
                      No buses yet — add your first coach above.
                    </td>
                  </tr>
                ) : (
                  buses.map((b) => (
                    <tr key={b.id} className="border-t border-[#0a2f6b]/8">
                      <td className="px-4 py-3 font-medium">{b.busNumber}</td>
                      <td className="px-4 py-3">{busTypeLabel(b.layoutType)}</td>
                      <td className="px-4 py-3">{b.totalSeats}</td>
                      <td className="px-4 py-3">{b.tripCount}</td>
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
