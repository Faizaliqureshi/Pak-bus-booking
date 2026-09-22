"use client";

import { useCallback, useEffect, useState } from "react";
import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
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
import { BUS_LAYOUT_OPTIONS, busTypeLabel } from "@/lib/booking-utils";
import {
  BUS_FEATURE_OPTIONS,
  MAX_BUS_PHOTOS,
} from "@/lib/bus-catalog";

type BusPhoto = { id: string; url: string };

type BusRow = {
  id: string;
  busNumber: string;
  layoutType: string;
  totalSeats: number;
  tripCount: number;
  features: string[];
  photos: BusPhoto[];
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
  const [features, setFeatures] = useState<string[]>([]);
  const [customFeature, setCustomFeature] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

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

  function toggleFeature(label: string, current: string[], set: (next: string[]) => void) {
    set(
      current.includes(label)
        ? current.filter((f) => f !== label)
        : [...current, label],
    );
  }

  function addCustom(current: string[], set: (next: string[]) => void) {
    const label = customFeature.replace(/\s+/g, " ").trim();
    if (!label) return;
    if (!current.some((f) => f.toLowerCase() === label.toLowerCase())) {
      set([...current, label]);
    }
    setCustomFeature("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("busNumber", busNumber);
      form.set("layoutType", layoutType);
      form.set("totalSeats", totalSeats);
      for (const feature of features) form.append("features", feature);
      for (const file of photoFiles) form.append("photos", file);

      const res = await fetch("/api/partner/buses", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not add bus.");
      }
      setMessage(`Bus ${busNumber.toUpperCase()} added to your fleet.`);
      setBusNumber("");
      setLayoutType("2x2");
      setTotalSeats("40");
      setFeatures([]);
      setPhotoFiles([]);
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
          Add coaches, pictures, and facilities. Passengers see these while
          booking.
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
              {BUS_LAYOUT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
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

        <div className="space-y-2 sm:col-span-4">
          <Label>Features / facilities</Label>
          <div className="flex flex-wrap gap-2">
            {BUS_FEATURE_OPTIONS.map((opt) => {
              const on = features.includes(opt.label);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleFeature(opt.label, features, setFeatures)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    on
                      ? "border-[#0a2f6b] bg-[#0a2f6b] text-white"
                      : "border-[#d7dee8] bg-white text-[#0a2f6b]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <div className="flex max-w-md gap-2">
            <Input
              value={customFeature}
              onChange={(e) => setCustomFeature(e.target.value)}
              placeholder="Add a custom facility"
              className="h-10"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => addCustom(features, setFeatures)}
            >
              Add
            </Button>
          </div>
          {features.length > 0 ? (
            <p className="text-xs text-[#0a2f6b]/60">
              Selected: {features.join(" · ")}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-4">
          <Label>Pictures (up to {MAX_BUS_PHOTOS})</Label>
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) =>
              setPhotoFiles(Array.from(e.target.files ?? []).slice(0, MAX_BUS_PHOTOS))
            }
            className="h-11"
          />
          {photoFiles.length > 0 ? (
            <p className="text-xs text-[#0a2f6b]/60">
              {photoFiles.length} picture{photoFiles.length === 1 ? "" : "s"} ready
              to upload.
            </p>
          ) : null}
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
        ) : buses.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[#0a2f6b]/50">
            No buses yet — add your first coach above.
          </p>
        ) : (
          <ul className="divide-y divide-[#0a2f6b]/8">
            {buses.map((bus) => (
              <BusManageRow
                key={bus.id}
                bus={bus}
                open={openId === bus.id}
                onToggle={() => setOpenId(openId === bus.id ? null : bus.id)}
                onChanged={load}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BusManageRow({
  bus,
  open,
  onToggle,
  onChanged,
}: {
  bus: BusRow;
  open: boolean;
  onToggle: () => void;
  onChanged: () => Promise<void>;
}) {
  const [features, setFeatures] = useState(bus.features);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    setFeatures(bus.features);
  }, [bus.features]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveFeatures() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/partner/buses/${bus.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not save features.");
      }
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setSaving(false);
    }
  }

  async function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      for (const file of Array.from(files)) form.append("photos", file);
      const res = await fetch(`/api/partner/buses/${bus.id}/photos`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not add pictures.");
      }
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setUploading(false);
    }
  }

  async function deletePhoto(photoId: string) {
    setError(null);
    const res = await fetch(`/api/partner/buses/${bus.id}/photos/${photoId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setError(json.message || "Could not delete picture.");
      return;
    }
    await onChanged();
  }

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#f8fafc]"
      >
        <div>
          <p className="font-medium text-[#0a2f6b]">{bus.busNumber}</p>
          <p className="text-xs text-[#0a2f6b]/60">
            {busTypeLabel(bus.layoutType)} · {bus.totalSeats} seats ·{" "}
            {bus.photos.length} photos · {bus.features.length} features
          </p>
        </div>
        <span className="text-xs font-medium text-[#0a2f6b]">
          {open ? "Close" : "Manage"}
        </span>
      </button>
      {open ? (
        <div className="space-y-4 border-t border-[#0a2f6b]/8 bg-[#fbfdff] px-4 py-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-[#0a2f6b]">Pictures</p>
            <div className="flex flex-wrap gap-3">
              {bus.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative size-24 overflow-hidden rounded-lg border border-[#e5e7eb]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${photo.url}?t=${photo.id}`}
                    alt=""
                    className="size-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => void deletePhoto(photo.id)}
                    className="absolute top-1 right-1 rounded-full bg-white/90 p-1 text-red-700 shadow"
                    aria-label="Delete picture"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
              {bus.photos.length < MAX_BUS_PHOTOS ? (
                <label className="flex size-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#0a2f6b]/25 text-[#0a2f6b]/70 hover:bg-white">
                  {uploading ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="size-5" />
                      <span className="mt-1 text-[10px]">Add</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={(e) => void addPhotos(e.target.files)}
                  />
                </label>
              ) : null}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-[#0a2f6b]">
              Features / facilities
            </p>
            <div className="flex flex-wrap gap-2">
              {BUS_FEATURE_OPTIONS.map((opt) => {
                const on = features.includes(opt.label);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setFeatures(
                        on
                          ? features.filter((f) => f !== opt.label)
                          : [...features, opt.label],
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      on
                        ? "border-[#0a2f6b] bg-[#0a2f6b] text-white"
                        : "border-[#d7dee8] bg-white text-[#0a2f6b]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
              {features
                .filter(
                  (f) => !BUS_FEATURE_OPTIONS.some((opt) => opt.label === f),
                )
                .map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFeatures(features.filter((x) => x !== f))}
                    className="inline-flex items-center gap-1 rounded-full border border-[#0a2f6b] bg-[#0a2f6b] px-3 py-1 text-xs font-medium text-white"
                  >
                    {f}
                    <X className="size-3" />
                  </button>
                ))}
            </div>
            <div className="mt-2 flex max-w-md gap-2">
              <Input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Custom facility"
                className="h-10"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const label = custom.replace(/\s+/g, " ").trim();
                  if (label && !features.includes(label)) {
                    setFeatures([...features, label]);
                  }
                  setCustom("");
                }}
              >
                Add
              </Button>
              <Button
                type="button"
                onClick={() => void saveFeatures()}
                disabled={saving}
                className="bg-[#0a2f6b] text-white hover:bg-[#08305f]"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>
      ) : null}
    </li>
  );
}
