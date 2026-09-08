"use client";

import {
  BackToBuses,
  InquiryForm,
  PlaceholderShell,
} from "@/components/layout/PlaceholderMarketing";

const TOURS = [
  {
    title: "Hunza Valley",
    blurb: "Passu cones, Attabad Lake, and mountain stays.",
    from: "PKR 48,000",
  },
  {
    title: "Skardu Escape",
    blurb: "Shangrila, Upper Kachura, and Deosai day trips.",
    from: "PKR 55,000",
  },
  {
    title: "Swat Highlights",
    blurb: "Malam Jabba, Fizagat, and family-friendly resorts.",
    from: "PKR 32,000",
  },
];

export default function HolidayPackagesPage() {
  return (
    <PlaceholderShell
      eyebrow="Holidays"
      title="Domestic tours across Pakistan"
      subtitle="Hunza, Skardu, Swat and more — curated land packages with TicketPass travel desk support."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {TOURS.map((tour) => (
          <article
            key={tour.title}
            className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm"
          >
            <p className="text-2xl" aria-hidden>
              🌴
            </p>
            <h2 className="mt-2 font-heading text-lg font-semibold text-[#0a2f6b]">
              {tour.title}
            </h2>
            <p className="mt-1 text-sm text-[#0a2f6b]/65">{tour.blurb}</p>
            <p className="mt-3 font-semibold text-[#FF5A1F]">From {tour.from}</p>
          </article>
        ))}
      </div>
      <div className="mt-8 rounded-2xl border border-[#0a2f6b]/10 bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-[#0a2f6b]">
          Holiday inquiry
        </h2>
        <InquiryForm />
      </div>
      <BackToBuses />
    </PlaceholderShell>
  );
}
