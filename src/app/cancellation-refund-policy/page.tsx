"use client";

import { useEffect, useState } from "react";
import { StaticPage } from "@/components/layout/StaticPage";
import type { CompanyCancelPolicy } from "@/lib/cancel-policy";

export default function CancellationRefundPolicyPage() {
  const [policies, setPolicies] = useState<CompanyCancelPolicy[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/cancel-policies");
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Could not load policies.");
        }
        if (!cancelled) setPolicies(json.data as CompanyCancelPolicy[]);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load.");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StaticPage
      title="Cancellation & Refund Policy"
      subtitle="Refunds follow each bus company’s own slabs. TicketPass credits the wallet after a valid cancel."
    >
      <p>
        Seat holds that expire before payment are released automatically. Paid
        tickets are cancelled company-wise: open Manage My Booking, or contact
        support@ticketpass.pk / helpline 03312882767.
      </p>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {policies.map((policy) => (
        <section key={policy.operatorId} className="mt-6">
          <h2 className="font-heading text-xl font-semibold text-[#0a2f6b]">
            {policy.companyName}
          </h2>
          <p className="mt-1 text-sm text-[#0a2f6b]/70">
            {policy.passengerCancelEnabled
              ? `Online cancel allowed until ${policy.cutoffHours} hours before departure.`
              : "This company does not allow online cancellation."}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {policy.tiers.map((tier) => (
              <li key={`${policy.operatorId}-${tier.minHours}-${tier.refundPercent}`}>
                {tier.minHours === 0
                  ? `Under the last slab: ${tier.refundPercent}% refund`
                  : `${tier.minHours}+ hours before departure: ${tier.refundPercent}% refund`}
              </li>
            ))}
          </ul>
          {policy.note ? (
            <p className="mt-2 text-sm text-[#0a2f6b]/60">{policy.note}</p>
          ) : null}
        </section>
      ))}
    </StaticPage>
  );
}
