import { helplineWhatsAppHref } from "@/lib/helpline";

export type UmrahPackage = {
  title: string;
  nights: string;
  from: string;
  fromPkr: number;
};

export const UMRAH_PACKAGES: UmrahPackage[] = [
  {
    title: "Economy Umrah",
    nights: "14 nights · Madinah + Makkah",
    from: "PKR 285,000",
    fromPkr: 285_000,
  },
  {
    title: "Family Umrah",
    nights: "10 nights · Shared transport",
    from: "PKR 345,000",
    fromPkr: 345_000,
  },
  {
    title: "Premium Umrah",
    nights: "12 nights · Near Haram stay",
    from: "PKR 520,000",
    fromPkr: 520_000,
  },
];

export const UMRAH_WHATSAPP = helplineWhatsAppHref(
  "Assalam o Alaikum, I want Umrah package details on TicketPass",
);
