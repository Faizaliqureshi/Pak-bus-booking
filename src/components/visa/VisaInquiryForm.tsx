"use client";

import { InquiryForm } from "@/components/layout/PlaceholderMarketing";

const WA_BASE =
  "https://wa.me/9221111172782?text=" +
  encodeURIComponent("Assalam o Alaikum, I want TicketPass visa service details for ");

export function VisaInquiryForm({ country }: { country?: string }) {
  const href = country
    ? `${WA_BASE}${encodeURIComponent(country)}`
    : `${WA_BASE}${encodeURIComponent("the attached country list")}`;
  return <InquiryForm whatsappHref={href} service="VISA" country={country} />;
}
