export type VisaPricing = {
  label: string;
  type: string;
  validity: string;
  stay?: string;
  normalPkr?: number;
  donePkr?: number;
  processPkr?: number;
  embassyFee?: string;
};

export type VisaService = {
  slug: string;
  country: string;
  flag: string;
  category: "visit" | "process";
  blurb: string;
  processing: string;
  pricing: VisaPricing[];
  requirements: string[];
  notes?: string[];
};

function visitDocs(extra: string[] = []): string[] {
  return [
    "Passport bio pages (valid at least 6 months from travel)",
    "Smart CNIC, front and back (adult / child / infant as applicable)",
    "Recent passport photo on a white background (embassy size)",
    "Applicant mobile and emergency contact",
    "Intended travel dates",
    "Hotel reservation for the first nights",
    ...extra,
    "Embassy or consulate may ask for extra papers or a personal appearance",
  ];
}

export const VISA_SERVICES: VisaService[] = [
  {
    slug: "bahrain",
    country: "Bahrain",
    flag: "🇧🇭",
    category: "visit",
    blurb: "Single and multiple-entry visit visas for Manama and the Gulf.",
    processing: "Typically 5–8 working days after a complete file",
    pricing: [
      {
        label: "Single entry",
        type: "Single entry",
        validity: "14 days",
        stay: "14 days",
        normalPkr: 15_000,
        donePkr: 20_000,
      },
      {
        label: "Multiple entry · 3 months",
        type: "Multiple entry",
        validity: "3 months",
        stay: "30 days",
        normalPkr: 20_000,
        donePkr: 30_000,
      },
      {
        label: "Multiple entry · 1 year",
        type: "Multiple entry",
        validity: "1 year",
        stay: "Per visit as stamped",
        normalPkr: 44_000,
        donePkr: 55_000,
      },
    ],
    requirements: visitDocs([
      "Confirmed return or onward ticket when the file is lodged",
      "6-month bank statement with bank certificate if requested",
    ]),
  },
  {
    slug: "indonesia",
    country: "Indonesia",
    flag: "🇮🇩",
    category: "visit",
    blurb: "Visit visa for Jakarta, Bali, and beyond.",
    processing: "Typically 8–10 working days",
    pricing: [
      {
        label: "Visit visa",
        type: "Visit visa",
        validity: "60 days",
        stay: "60 days",
        normalPkr: 22_000,
        donePkr: 35_000,
      },
    ],
    requirements: visitDocs([
      "Passport valid about 8 months from travel",
      "Cover letter stating the purpose of visit",
      "Yearly income note and travel history if you have it",
      "Email address for e-visa delivery",
    ]),
  },
  {
    slug: "thailand",
    country: "Thailand",
    flag: "🇹🇭",
    category: "visit",
    blurb: "30-day visit visa for Bangkok, Phuket, and the islands.",
    processing: "Typically 10–12 working days",
    pricing: [
      {
        label: "Visit visa",
        type: "Visit visa",
        validity: "30 days",
        stay: "30 days",
        normalPkr: 19_000,
        donePkr: 50_000,
      },
    ],
    requirements: visitDocs([
      "Passport valid about 8 months from travel",
      "Cover letter stating the purpose of visit",
      "Yearly income documentation",
      "Travel history if you have previous visas or stamps",
      "Last 6 months bank statement plus certificate (about PKR 300,000 per person is commonly asked)",
    ]),
  },
  {
    slug: "azerbaijan",
    country: "Azerbaijan",
    flag: "🇦🇿",
    category: "visit",
    blurb: "Baku visit visa — e-file with hotel and passport scans.",
    processing: "Typically 5–7 working days",
    pricing: [
      {
        label: "Visit visa",
        type: "Visit visa",
        validity: "30 days",
        stay: "30 days",
        normalPkr: 14_000,
        donePkr: 20_000,
      },
    ],
    requirements: visitDocs([
      "Passport first and last pages",
      "Name of the first hotel in Azerbaijan",
      "Travel insurance is optional for many e-visas but recommended",
    ]),
  },
  {
    slug: "singapore",
    country: "Singapore",
    flag: "🇸🇬",
    category: "visit",
    blurb: "Single-entry visit visa for the Lion City.",
    processing: "Typically 10–12 working days",
    pricing: [
      {
        label: "Visit visa",
        type: "Visit visa",
        validity: "30 days",
        stay: "30 days",
        normalPkr: 17_000,
        donePkr: 50_000,
      },
    ],
    requirements: visitDocs([
      "Passport valid about 8 months from travel",
      "Photo 35×45 mm, white background, dark clothing, ears visible, no glasses",
      "Cover letter stating the purpose of visit",
      "Applicant monthly income",
    ]),
  },
  {
    slug: "malaysia",
    country: "Malaysia",
    flag: "🇲🇾",
    category: "visit",
    blurb: "Visit visa for Kuala Lumpur, Langkawi, and Penang.",
    processing: "Typically 4–5 working days",
    pricing: [
      {
        label: "Visit visa",
        type: "Visit visa",
        validity: "30 days",
        stay: "30 days",
        normalPkr: 15_000,
        donePkr: 25_000,
      },
    ],
    requirements: visitDocs([
      "Passport valid about 8 months from travel",
      "Recent unused photo 35×45 mm, white background",
    ]),
  },
  {
    slug: "cambodia",
    country: "Cambodia",
    flag: "🇰🇭",
    category: "visit",
    blurb: "Visit visa for Phnom Penh and Siem Reap.",
    processing: "Typically 5–8 working days",
    pricing: [
      {
        label: "Visit visa",
        type: "Visit visa",
        validity: "30 days",
        stay: "30 days",
        normalPkr: 10_000,
        donePkr: 25_000,
      },
    ],
    requirements: visitDocs(["Return ticket when the file is lodged"]),
  },
  {
    slug: "kenya",
    country: "Kenya",
    flag: "🇰🇪",
    category: "visit",
    blurb: "Visit visa for Nairobi, Mombasa, and safari itineraries.",
    processing: "Typically 5–8 working days",
    pricing: [
      {
        label: "Visit visa",
        type: "Visit visa",
        validity: "30 days",
        stay: "30 days",
        normalPkr: 15_000,
        donePkr: 28_000,
      },
    ],
    requirements: visitDocs([
      "Yellow fever certificate if arriving from or via a listed country",
    ]),
  },
  {
    slug: "uganda",
    country: "Uganda",
    flag: "🇺🇬",
    category: "visit",
    blurb: "Visit visa for Kampala and wildlife parks.",
    processing: "Typically 5–8 working days",
    pricing: [
      {
        label: "Visit visa",
        type: "Visit visa",
        validity: "30 days",
        stay: "30 days",
        normalPkr: 19_000,
        donePkr: 30_000,
      },
    ],
    requirements: visitDocs([
      "Yellow fever certificate if requested for the itinerary",
    ]),
  },
  {
    slug: "ethiopia",
    country: "Ethiopia",
    flag: "🇪🇹",
    category: "visit",
    blurb: "Visit visa for Addis Ababa and domestic connections.",
    processing: "Typically 5–8 working days",
    pricing: [
      {
        label: "Visit visa",
        type: "Visit visa",
        validity: "30 days",
        stay: "30 days",
        normalPkr: 22_000,
        donePkr: 33_000,
      },
    ],
    requirements: visitDocs(),
  },
  {
    slug: "vietnam",
    country: "Vietnam",
    flag: "🇻🇳",
    category: "visit",
    blurb: "Visit visa for Hanoi, Ho Chi Minh City, and the coast.",
    processing: "Typically 6–10 working days",
    pricing: [
      {
        label: "Visit visa",
        type: "Visit visa",
        validity: "30 days",
        stay: "30 days",
        normalPkr: 20_000,
        donePkr: 35_000,
      },
    ],
    requirements: visitDocs(["Cover letter stating the purpose of visit"]),
  },
  {
    slug: "rwanda",
    country: "Rwanda",
    flag: "🇷🇼",
    category: "visit",
    blurb: "Visit visa for Kigali and national parks.",
    processing: "Typically 5–8 working days",
    pricing: [
      {
        label: "Visit visa",
        type: "Visit visa",
        validity: "30 days",
        stay: "30 days",
        normalPkr: 18_000,
        donePkr: 28_000,
      },
    ],
    requirements: visitDocs(),
  },
  {
    slug: "saudi-arabia",
    country: "Saudi Arabia",
    flag: "🇸🇦",
    category: "visit",
    blurb:
      "1-year multiple-entry visit for eligible GCC, Schengen, UK, or USA residents.",
    processing: "Typically 7–10 working days",
    pricing: [
      {
        label: "Multiple entry · residents",
        type: "Multiple entry",
        validity: "1 year",
        stay: "Per visit as stamped",
        normalPkr: 40_000,
        donePkr: 65_000,
      },
    ],
    requirements: visitDocs([
      "Proof of residence in GCC, Schengen, UK, or USA (iqama, residence card, or visa as applicable)",
      "Meningitis ACWY and polio (OPV) certificates if the trip includes Umrah",
    ]),
    notes: [
      "This rate is for eligible residents of GCC, Schengen, UK, or USA — not a standard tourist e-visa for every Pakistani passport.",
    ],
  },
  {
    slug: "china",
    country: "China",
    flag: "🇨🇳",
    category: "visit",
    blurb: "Visit visa for Beijing, Shanghai, and business or family trips.",
    processing: "Typically 8–12 working days after appointment",
    pricing: [
      {
        label: "Visit visa",
        type: "Visit visa",
        validity: "30 days",
        stay: "30 days",
        normalPkr: 35_000,
        donePkr: 115_000,
      },
    ],
    requirements: visitDocs([
      "Invitation or hotel booking matching the itinerary",
      "6-month bank statement with certificate",
      "Employment or business proof",
    ]),
  },
  {
    slug: "sri-lanka",
    country: "Sri Lanka",
    flag: "🇱🇰",
    category: "visit",
    blurb: "Visit visa for Colombo, Kandy, and the south coast.",
    processing: "Typically 4–5 working days",
    pricing: [
      {
        label: "Visit visa",
        type: "Visit visa",
        validity: "30 days",
        stay: "30 days",
        normalPkr: 5_000,
        donePkr: 8_000,
      },
    ],
    requirements: visitDocs(["Email address for e-visa delivery"]),
  },
  {
    slug: "united-kingdom",
    country: "United Kingdom",
    flag: "🇬🇧",
    category: "process",
    blurb: "Visit-visa file prep. Embassy fee is paid separately in euros.",
    processing: "File prep first — embassy timeline after biometrics",
    pricing: [
      {
        label: "Visit visa · process only",
        type: "Process only",
        validity: "Per embassy grant",
        processPkr: 25_000,
        embassyFee: "135 EUR",
      },
    ],
    requirements: [
      "Passport (valid, with unused pages)",
      "UK visa photos to current spec",
      "6-month bank statements and financial proof",
      "Employment letter or business documents",
      "Travel itinerary and ties to Pakistan",
      "Completed UK visit application (we help prepare the file)",
    ],
  },
  {
    slug: "united-states",
    country: "United States",
    flag: "🇺🇸",
    category: "process",
    blurb: "B1/B2 visit file prep. Embassy fee is paid separately in USD.",
    processing: "File prep first — interview date depends on the embassy",
    pricing: [
      {
        label: "Visit visa · process only",
        type: "Process only",
        validity: "Per embassy grant",
        processPkr: 25_000,
        embassyFee: "185 USD",
      },
    ],
    requirements: [
      "Passport valid for travel",
      "DS-160 confirmation and photo to US spec",
      "6-month bank statements and income proof",
      "Employment or business documents",
      "Family and travel history details",
    ],
  },
  {
    slug: "canada",
    country: "Canada",
    flag: "🇨🇦",
    category: "process",
    blurb: "Visitor-visa file prep. Embassy fee is paid separately in CAD.",
    processing: "File prep first — IRCC processing after biometrics",
    pricing: [
      {
        label: "Visit visa · process only",
        type: "Process only",
        validity: "Per embassy grant",
        processPkr: 25_000,
        embassyFee: "185 CAD",
      },
    ],
    requirements: [
      "Passport bio pages",
      "Digital photo to IRCC spec",
      "Bank statements, employment, and family documents",
      "Travel purpose letter and itinerary",
      "Biometrics appointment after the file is submitted",
    ],
  },
  {
    slug: "schengen",
    country: "Schengen",
    flag: "🇪🇺",
    category: "process",
    blurb: "Schengen visit file prep. Embassy fee is paid separately in euros.",
    processing: "File prep first — VFS / embassy slot after the file is ready",
    pricing: [
      {
        label: "Country visa · process only",
        type: "Process only",
        validity: "Per embassy grant",
        processPkr: 20_000,
        embassyFee: "90 EUR",
      },
    ],
    requirements: [
      "Passport with 6+ months validity and unused pages",
      "Schengen photos",
      "Travel insurance covering the Schengen stay",
      "Hotel and flight itinerary",
      "6-month bank statements and employment proof",
      "Cover letter and supporting ties to Pakistan",
    ],
  },
  {
    slug: "japan",
    country: "Japan",
    flag: "🇯🇵",
    category: "process",
    blurb: "Visit-visa file prep. Embassy fee is listed as zero on this tariff.",
    processing: "File prep first — embassy timeline after submission",
    pricing: [
      {
        label: "Visit visa · process only",
        type: "Process only",
        validity: "Per embassy grant",
        processPkr: 15_000,
        embassyFee: "Zero",
      },
    ],
    requirements: [
      "Passport bio pages",
      "Japan visa photos",
      "Daily itinerary and hotel bookings",
      "Bank statements and employment documents",
      "Invitation or guarantee if visiting family or a company",
    ],
  },
];

export function getVisaService(slug: string): VisaService | undefined {
  return VISA_SERVICES.find((v) => v.slug === slug);
}

export function startingFrom(service: VisaService): number {
  const amounts = service.pricing.flatMap((p) =>
    [p.normalPkr, p.processPkr].filter((n): n is number => typeof n === "number"),
  );
  return amounts.length ? Math.min(...amounts) : 0;
}

export const VISIT_VISAS = VISA_SERVICES.filter((v) => v.category === "visit");
export const PROCESS_VISAS = VISA_SERVICES.filter((v) => v.category === "process");
