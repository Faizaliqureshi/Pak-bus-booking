"use client";

import { InquiryForm } from "@/components/layout/PlaceholderMarketing";
import { helplineWhatsAppHref } from "@/lib/helpline";

export function VisaInquiryForm({ country }: { country?: string }) {
  const href = helplineWhatsAppHref(
    `Assalam o Alaikum, I want TicketPass visa service details for ${
      country ?? "the attached country list"
    }`,
  );
  return <InquiryForm whatsappHref={href} service="VISA" country={country} />;
}
