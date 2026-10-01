"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CancelTier, CompanyCancelPolicy } from "@/lib/cancel-policy";

export default function PartnerCancelPolicyPage() {
  const [policy, setPolicy] = useState<CompanyCancelPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/partner/cancel-policy");
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Could not load policy.");
        }
        if (!cancelled) setPolicy(json.data as CompanyCancelPolicy);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateTier(index: number, patch: Partial<CancelTier>) {
    setPolicy((prev) => {
      if (!prev) return prev;
      const tiers = prev.tiers.map((tier, i) =>
        i === index ? { ...tier, ...patch } : tier,
      );
      return { ...prev, tiers };
    });
  }

  async function save() {
    if (!policy) return;
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch("/api/partner/cancel-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policy),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not save policy.");
      }
      setPolicy(json.data as CompanyCancelPolicy);
      setSaved("Company cancellation policy saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (!policy) {
    return <p className="text-sm text-red-700">{error || "Policy not found."}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">
          Cancellation policy
        </h1>
        <p className="mt-1 text-sm text-[#0a2f6b]/65">
          These slabs apply only to {policy.companyName} bookings. TicketPass
          refunds follow your hours-before-departure rules.
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-[#0a2f6b]/10 bg-white p-5">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={policy.passengerCancelEnabled}
            onChange={(e) =>
              setPolicy({
                ...policy,
                passengerCancelEnabled: e.target.checked,
              })
            }
          />
          Allow passengers to cancel online
        </label>
        <label className="block text-sm font-medium">
          Cutoff (hours before departure)
          <input
            type="number"
            min={0}
            value={policy.cutoffHours}
            onChange={(e) =>
              setPolicy({
                ...policy,
                cutoffHours: Number(e.target.value),
              })
            }
            className="mt-1 h-11 w-full max-w-xs rounded-lg border border-[#d7dee8] px-3"
          />
        </label>
        <label className="block text-sm font-medium">
          Note shown to passengers
          <textarea
            value={policy.note}
            onChange={(e) => setPolicy({ ...policy, note: e.target.value })}
            rows={3}
            className="mt-1 w-full rounded-lg border border-[#d7dee8] px-3 py-2 text-sm"
          />
        </label>
      </section>

      <section className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold">Refund slabs</h2>
          <button
            type="button"
            className="text-sm font-medium text-[#0a2f6b] underline"
            onClick={() =>
              setPolicy({
                ...policy,
                tiers: [...policy.tiers, { minHours: 0, refundPercent: 0 }],
              })
            }
          >
            Add slab
          </button>
        </div>
        <ul className="mt-4 space-y-3">
          {policy.tiers.map((tier, index) => (
            <li
              key={`${tier.minHours}-${index}`}
              className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
            >
              <label className="text-xs font-medium text-[#0a2f6b]/70">
                Min hours before departure
                <input
                  type="number"
                  min={0}
                  value={tier.minHours}
                  onChange={(e) =>
                    updateTier(index, { minHours: Number(e.target.value) })
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-[#d7dee8] px-3 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-[#0a2f6b]/70">
                Refund %
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={tier.refundPercent}
                  onChange={(e) =>
                    updateTier(index, {
                      refundPercent: Number(e.target.value),
                    })
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-[#d7dee8] px-3 text-sm"
                />
              </label>
              <button
                type="button"
                className="self-end pb-2 text-xs text-red-700"
                onClick={() =>
                  setPolicy({
                    ...policy,
                    tiers: policy.tiers.filter((_, i) => i !== index),
                  })
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <Button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="h-11 bg-[#0a2f6b] text-white hover:bg-[#08305f]"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : "Save company policy"}
      </Button>
      {saved ? <p className="text-sm text-emerald-800">{saved}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
