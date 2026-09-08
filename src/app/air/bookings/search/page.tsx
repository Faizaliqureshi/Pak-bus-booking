"use client";

import {
  BackToBuses,
  NotifyForm,
  PlaceholderShell,
} from "@/components/layout/PlaceholderMarketing";

export default function FlightSearchPlaceholderPage() {
  return (
    <PlaceholderShell
      eyebrow="Flights"
      title="Flights Launching Soon!"
      subtitle="Search domestic and international airfares from the same TicketPass app. Leave your email and we will notify you at launch."
    >
      <div className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-3 rounded-xl border border-dashed border-[#0a2f6b]/20 bg-[#f8fafc] p-4 sm:grid-cols-4">
          {["From (KHI)", "To (LHE)", "Depart", "Return"].map((label) => (
            <div
              key={label}
              className="rounded-lg border border-[#0a2f6b]/10 bg-white px-3 py-3 text-sm text-[#0a2f6b]/45"
            >
              {label}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm font-semibold text-[#0a2f6b]">
          Get notified
        </p>
        <NotifyForm successMessage="You are on the flights waitlist. Shukriya!" />
        <BackToBuses />
      </div>
    </PlaceholderShell>
  );
}
