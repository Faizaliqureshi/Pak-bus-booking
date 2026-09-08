"use client";

import {
  BackToBuses,
  InquiryForm,
  PlaceholderShell,
} from "@/components/layout/PlaceholderMarketing";

export default function VisaAssistancePage() {
  return (
    <PlaceholderShell
      eyebrow="Visa Services"
      title="Visa assistance request"
      subtitle="Tourist, visit, and Umrah visa guidance with document checklists from TicketPass specialists."
    >
      <div className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-6 shadow-sm sm:p-8">
        <ul className="mb-6 list-disc space-y-1 pl-5 text-sm text-[#0a2f6b]/75">
          <li>Schengen / UK / USA visit guidance</li>
          <li>GCC and Umrah visa document prep</li>
          <li>Appointment booking support</li>
        </ul>
        <InquiryForm />
        <BackToBuses />
      </div>
    </PlaceholderShell>
  );
}
