"use client";

import { useEffect, useState } from "react";
import {
  BackToBuses,
  InquiryForm,
  PlaceholderShell,
} from "@/components/layout/PlaceholderMarketing";
import { HOLIDAY_TOURS, type HolidayTour } from "@/lib/holiday-tours";

export default function HolidayPackagesPage() {
  const [tours, setTours] = useState<HolidayTour[]>(HOLIDAY_TOURS);

  useEffect(() => {
    fetch("/api/services/catalog?kind=HOLIDAY")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data?.tours)) {
          setTours(json.data.tours);
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <PlaceholderShell
      eyebrow="Holidays"
      title="Domestic tours across Pakistan"
      subtitle="Hunza, Skardu, Swat and more — curated land packages with TicketPass travel desk support."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {tours.map((tour) => (
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
        <InquiryForm service="HOLIDAY" />
      </div>
      <BackToBuses />
    </PlaceholderShell>
  );
}
