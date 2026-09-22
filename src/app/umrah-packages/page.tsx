"use client";

import { useEffect, useState } from "react";
import {
  BackToBuses,
  InquiryForm,
  PlaceholderShell,
} from "@/components/layout/PlaceholderMarketing";
import { UMRAH_PACKAGES, UMRAH_WHATSAPP, type UmrahPackage } from "@/lib/umrah-packages";

export default function UmrahPackagesPage() {
  const [packages, setPackages] = useState<UmrahPackage[]>(UMRAH_PACKAGES);

  useEffect(() => {
    fetch("/api/services/catalog?kind=UMRAH")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data?.packages)) {
          setPackages(json.data.packages);
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <PlaceholderShell
      eyebrow="Umrah Packages"
      title="Plan your Umrah with TicketPass"
      subtitle="Curated packages with flights, hotels, and ziyarat support. Inquire now — bookings open soon."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {packages.map((pkg) => (
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
            <p className="mt-3 font-semibold text-[#F5A623]">From {pkg.from}</p>
            <a
              href={UMRAH_WHATSAPP}
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
        <InquiryForm whatsappHref={UMRAH_WHATSAPP} service="UMRAH" />
      </div>
      <BackToBuses />
    </PlaceholderShell>
  );
}
