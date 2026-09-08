"use client";

import {
  BackToBuses,
  InquiryForm,
  PlaceholderShell,
} from "@/components/layout/PlaceholderMarketing";

const PACKAGES = [
  {
    title: "Economy Umrah",
    nights: "14 nights · Madinah + Makkah",
    from: "PKR 285,000",
  },
  {
    title: "Family Umrah",
    nights: "10 nights · Shared transport",
    from: "PKR 345,000",
  },
  {
    title: "Premium Umrah",
    nights: "12 nights · Near Haram stay",
    from: "PKR 520,000",
  },
];

const WA =
  "https://wa.me/9221111172782?text=Assalam%20o%20Alaikum%2C%20I%20want%20Umrah%20package%20details%20on%20TicketPass";

export default function UmrahPackagesPage() {
  return (
    <PlaceholderShell
      eyebrow="Umrah Packages"
      title="Plan your Umrah with TicketPass"
      subtitle="Curated packages with flights, hotels, and ziyarat support. Inquire now — bookings open soon."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {PACKAGES.map((pkg) => (
          <article
            key={pkg.title}
            className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm"
          >
            <p className="text-2xl" aria-hidden>
              🕋
            </p>
            <h2 className="mt-2 font-heading text-lg font-semibold text-[#0a2f6b]">
              {pkg.title}
            </h2>
            <p className="mt-1 text-sm text-[#0a2f6b]/65">{pkg.nights}</p>
            <p className="mt-3 font-semibold text-[#FF5A1F]">From {pkg.from}</p>
            <a
              href={WA}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#25D366] text-sm font-semibold text-white hover:bg-[#1ebe57]"
            >
              Inquire via WhatsApp
            </a>
          </article>
        ))}
      </div>
      <div className="mt-8 rounded-2xl border border-[#0a2f6b]/10 bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-[#0a2f6b]">
          Request a callback
        </h2>
        <InquiryForm whatsappHref={WA} />
      </div>
      <BackToBuses />
    </PlaceholderShell>
  );
}
