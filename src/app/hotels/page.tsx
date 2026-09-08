"use client";

import {
  BackToBuses,
  NotifyForm,
  PlaceholderShell,
} from "@/components/layout/PlaceholderMarketing";

export default function HotelsComingSoonPage() {
  return (
    <PlaceholderShell
      eyebrow="Hotels"
      title="Hotels Coming Soon"
      subtitle="Book stays with the same TicketPass account. Get notified when hotel search goes live."
    >
      <div className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-6 shadow-sm">
        <NotifyForm />
        <BackToBuses />
      </div>
    </PlaceholderShell>
  );
}
