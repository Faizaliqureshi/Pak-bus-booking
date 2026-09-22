"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CatalogPayload } from "@/lib/service-catalog";
import type { ServiceKind } from "@/lib/service-desk";
import type { HolidayTour } from "@/lib/holiday-tours";
import type { UmrahPackage } from "@/lib/umrah-packages";
import type { VisaPricing, VisaService } from "@/lib/visa-services";

function emptyVisa(): VisaService {
  return {
    slug: "",
    country: "",
    flag: "🏳️",
    category: "visit",
    blurb: "",
    processing: "",
    pricing: [
      {
        label: "Single entry",
        type: "Single entry",
        validity: "",
        normalPkr: 0,
      },
    ],
    requirements: [],
    notes: [],
  };
}

function emptyPackage(): UmrahPackage {
  return { title: "", nights: "", from: "", fromPkr: 0 };
}

function emptyTour(): HolidayTour {
  return { title: "", blurb: "", from: "", fromPkr: 0 };
}

function moneyLabel(pkr?: number): string {
  return `PKR ${Math.round(pkr ?? 0).toLocaleString("en-US")}`;
}

function amountOrZero(value?: number): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

export function MasterCatalogEditor({ kind }: { kind: ServiceKind }) {
  const [payload, setPayload] = useState<CatalogPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/master/services/catalog?kind=${kind}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Could not load catalog.");
        }
        if (!cancelled) setPayload(json.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load catalog.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  async function save() {
    if (!payload) return;
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const next: CatalogPayload = { ...payload };
      if (kind === "UMRAH") {
        next.packages = (next.packages ?? []).map((pkg) => ({
          ...pkg,
          from: pkg.from || moneyLabel(pkg.fromPkr),
        }));
      }
      if (kind === "HOLIDAY") {
        next.tours = (next.tours ?? []).map((tour) => ({
          ...tour,
          from: tour.from || moneyLabel(tour.fromPkr),
        }));
      }
      if (kind === "VISA") {
        next.visas = (next.visas ?? []).map((visa) => ({
          ...visa,
          slug:
            visa.slug.trim() ||
            visa.country.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        }));
      }
      const res = await fetch("/api/master/services/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, payload: next }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not save catalog.");
      }
      setPayload(json.data);
      setSaved("Catalog published. Public pages now use these details.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-[#0a2f6b]">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (!payload) {
    return (
      <p className="text-sm text-red-700" role="alert">
        {error ?? "Catalog unavailable."}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#0a2f6b]/65">
          Edit rates and document lists. Save publishes them on the public
          {kind === "VISA" ? " visa" : kind === "UMRAH" ? " Umrah" : " holiday"}{" "}
          pages.
        </p>
        <Button
          type="button"
          disabled={saving}
          className="bg-[#0a2f6b] text-white hover:bg-[#08305f]"
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save catalog"}
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? <p className="text-sm text-emerald-700">{saved}</p> : null}

      {kind === "VISA" ? (
        <VisaEditor
          visas={payload.visas ?? []}
          onChange={(visas) => setPayload({ ...payload, visas })}
        />
      ) : kind === "UMRAH" ? (
        <PackageEditor
          packages={payload.packages ?? []}
          onChange={(packages) => setPayload({ ...payload, packages })}
        />
      ) : (
        <TourEditor
          tours={payload.tours ?? []}
          onChange={(tours) => setPayload({ ...payload, tours })}
        />
      )}
    </div>
  );
}

function VisaEditor({
  visas,
  onChange,
}: {
  visas: VisaService[];
  onChange: (next: VisaService[]) => void;
}) {
  function update(index: number, patch: Partial<VisaService>) {
    onChange(visas.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...visas, emptyVisa()])}
      >
        Add country
      </Button>
      {visas.map((visa, index) => (
        <details
          key={`${visa.slug}-${index}`}
          className="rounded-xl border border-[#0a2f6b]/10 bg-white p-4"
        >
          <summary className="cursor-pointer font-heading font-semibold text-[#0a2f6b]">
            {visa.flag} {visa.country || "New country"}
          </summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Country"
              value={visa.country}
              onChange={(country) => update(index, { country })}
            />
            <Field
              label="Slug"
              value={visa.slug}
              onChange={(slug) => update(index, { slug })}
            />
            <Field
              label="Flag"
              value={visa.flag}
              onChange={(flag) => update(index, { flag })}
            />
            <div className="space-y-1">
              <Label>Category</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={visa.category}
                onChange={(e) =>
                  update(index, {
                    category: e.target.value === "process" ? "process" : "visit",
                  })
                }
              >
                <option value="visit">Visit (standard / express)</option>
                <option value="process">Process only</option>
              </select>
            </div>
            <Field
              className="sm:col-span-2"
              label="Blurb"
              value={visa.blurb}
              onChange={(blurb) => update(index, { blurb })}
            />
            <Field
              className="sm:col-span-2"
              label="Processing"
              value={visa.processing}
              onChange={(processing) => update(index, { processing })}
            />
          </div>

          <p className="mt-4 text-xs font-semibold tracking-wide text-[#64748b] uppercase">
            Rates
          </p>
          <div className="mt-2 space-y-2">
            {visa.pricing.map((row, rowIndex) => (
              <div
                key={`${row.label}-${rowIndex}`}
                className="grid gap-2 rounded-lg bg-[#f8fafc] p-3 sm:grid-cols-6"
              >
                <Field
                  label="Label"
                  value={row.label}
                  onChange={(label) =>
                    updatePricing(visas, onChange, index, rowIndex, { label, type: label })
                  }
                />
                <Field
                  label="Validity"
                  value={row.validity}
                  onChange={(validity) =>
                    updatePricing(visas, onChange, index, rowIndex, { validity })
                  }
                />
                <Field
                  label="Stay"
                  value={row.stay ?? ""}
                  onChange={(stay) =>
                    updatePricing(visas, onChange, index, rowIndex, { stay })
                  }
                />
                {visa.category === "visit" ? (
                  <>
                    <NumField
                      label="Standard PKR"
                      value={row.normalPkr}
                      onChange={(normalPkr) =>
                        updatePricing(visas, onChange, index, rowIndex, { normalPkr })
                      }
                    />
                    <NumField
                      label="Express PKR"
                      value={row.donePkr}
                      onChange={(donePkr) =>
                        updatePricing(visas, onChange, index, rowIndex, { donePkr })
                      }
                    />
                  </>
                ) : (
                  <>
                    <NumField
                      label="Process PKR"
                      value={row.processPkr}
                      onChange={(processPkr) =>
                        updatePricing(visas, onChange, index, rowIndex, { processPkr })
                      }
                    />
                    <Field
                      label="Embassy fee"
                      value={row.embassyFee ?? ""}
                      onChange={(embassyFee) =>
                        updatePricing(visas, onChange, index, rowIndex, { embassyFee })
                      }
                    />
                  </>
                )}
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full"
                    onClick={() =>
                      update(index, {
                        pricing: visa.pricing.filter((_, i) => i !== rowIndex),
                      })
                    }
                  >
                    Remove rate
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                update(index, {
                  pricing: [
                    ...visa.pricing,
                    { label: "New rate", type: "New rate", validity: "" },
                  ],
                })
              }
            >
              Add rate
            </Button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Documents (one per line)</Label>
              <textarea
                className="min-h-36 w-full rounded-md border border-input px-3 py-2 text-sm"
                value={visa.requirements.join("\n")}
                onChange={(e) =>
                  update(index, {
                    requirements: e.target.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Notes (one per line)</Label>
              <textarea
                className="min-h-36 w-full rounded-md border border-input px-3 py-2 text-sm"
                value={(visa.notes ?? []).join("\n")}
                onChange={(e) =>
                  update(index, {
                    notes: e.target.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-4 text-red-700"
            onClick={() => onChange(visas.filter((_, i) => i !== index))}
          >
            Remove country
          </Button>
        </details>
      ))}
    </div>
  );
}

function updatePricing(
  visas: VisaService[],
  onChange: (next: VisaService[]) => void,
  visaIndex: number,
  rowIndex: number,
  patch: Partial<VisaPricing>,
) {
  onChange(
    visas.map((visa, i) =>
      i === visaIndex
        ? {
            ...visa,
            pricing: visa.pricing.map((row, j) =>
              j === rowIndex ? { ...row, ...patch } : row,
            ),
          }
        : visa,
    ),
  );
}

function PackageEditor({
  packages,
  onChange,
}: {
  packages: UmrahPackage[];
  onChange: (next: UmrahPackage[]) => void;
}) {
  return (
    <div className="space-y-3">
      {packages.map((pkg, index) => (
        <div
          key={`${pkg.title}-${index}`}
          className="grid gap-3 rounded-xl border border-[#0a2f6b]/10 bg-white p-4 sm:grid-cols-4"
        >
          <Field
            label="Title"
            value={pkg.title}
            onChange={(title) =>
              onChange(packages.map((p, i) => (i === index ? { ...p, title } : p)))
            }
          />
          <Field
            label="Nights / stay"
            value={pkg.nights}
            onChange={(nights) =>
              onChange(packages.map((p, i) => (i === index ? { ...p, nights } : p)))
            }
          />
          <NumField
            label="From PKR"
            value={pkg.fromPkr}
            onChange={(fromPkr) =>
              onChange(
                packages.map((p, i) =>
                  i === index
                    ? {
                        ...p,
                        fromPkr: amountOrZero(fromPkr),
                        from: moneyLabel(fromPkr),
                      }
                    : p,
                ),
              )
            }
          />
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full"
              onClick={() => onChange(packages.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange([...packages, emptyPackage()])}>
        Add package
      </Button>
    </div>
  );
}

function TourEditor({
  tours,
  onChange,
}: {
  tours: HolidayTour[];
  onChange: (next: HolidayTour[]) => void;
}) {
  return (
    <div className="space-y-3">
      {tours.map((tour, index) => (
        <div
          key={`${tour.title}-${index}`}
          className="grid gap-3 rounded-xl border border-[#0a2f6b]/10 bg-white p-4 sm:grid-cols-4"
        >
          <Field
            label="Title"
            value={tour.title}
            onChange={(title) =>
              onChange(tours.map((t, i) => (i === index ? { ...t, title } : t)))
            }
          />
          <Field
            label="Blurb"
            value={tour.blurb}
            onChange={(blurb) =>
              onChange(tours.map((t, i) => (i === index ? { ...t, blurb } : t)))
            }
          />
          <NumField
            label="From PKR"
            value={tour.fromPkr}
            onChange={(fromPkr) =>
              onChange(
                tours.map((t, i) =>
                  i === index
                    ? {
                        ...t,
                        fromPkr: amountOrZero(fromPkr),
                        from: moneyLabel(fromPkr),
                      }
                    : t,
                ),
              )
            }
          />
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full"
              onClick={() => onChange(tours.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange([...tours, emptyTour()])}>
        Add tour
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={className ? `${className} space-y-1` : "space-y-1"}>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        inputMode="numeric"
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (!raw) {
            onChange(undefined);
            return;
          }
          const next = Number(raw);
          onChange(Number.isFinite(next) ? next : undefined);
        }}
      />
    </div>
  );
}
