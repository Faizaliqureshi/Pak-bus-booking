export const PAKISTAN_CITIES = [
  "Karachi",
  "Lahore",
  "Islamabad/Rawalpindi",
  "Multan",
  "Faisalabad",
  "Peshawar",
  "Sukkur",
  "Hyderabad",
  "Abbottabad",
  "Swat",
  "Quetta",
] as const;

export type PakistanCity = (typeof PAKISTAN_CITIES)[number];

/** Normalize UI city labels to DB originCity / destinationCity values */
export function normalizeCityForSearch(city: string): string[] {
  if (city === "Islamabad/Rawalpindi" || city === "Rawalpindi/Islamabad") {
    return ["Rawalpindi", "Islamabad", "Rawalpindi/Islamabad", "Islamabad/Rawalpindi"];
  }
  if (city === "Swat") {
    return ["Swat", "Mingora", "Saidu Sharif"];
  }
  return [city];
}

export function formatPkr(amount: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Admin-style PKR: Rs. 185,000 */
export function formatRs(amount: number): string {
  return `Rs. ${new Intl.NumberFormat("en-PK").format(Math.round(amount))}`;
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function defaultTravelDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateInputValue(tomorrow);
}

export type BusLayoutType = "2x2" | "2x1" | "2x1_SLEEPER" | string;

/** Canonical bus layout values shared by booking + staff portals. */
export const BUS_LAYOUT_OPTIONS = [
  { value: "2x2", label: "2×2 Executive" },
  { value: "2x1", label: "2×1 Business" },
  { value: "2x1_SLEEPER", label: "Sleeper" },
] as const;

export const ALLOWED_BUS_LAYOUT_TYPES = BUS_LAYOUT_OPTIONS.map((o) => o.value);

export function isAllowedBusLayoutType(layoutType: string): boolean {
  return (ALLOWED_BUS_LAYOUT_TYPES as readonly string[]).includes(layoutType);
}

/** Maps layoutType to SastaTicket-style bus class. */
export function busTypeCategory(
  layoutType: string,
): "executive" | "business" | "sleeper" {
  const t = layoutType.toUpperCase();
  if (t.includes("SLEEPER")) return "sleeper";
  if (t.includes("2X1") || t.includes("BUSINESS")) return "business";
  return "executive";
}

export function busTypeLabel(layoutType: string): string {
  const cat = busTypeCategory(layoutType);
  if (cat === "sleeper") return "Sleeper";
  if (cat === "business") return "2×1 Business";
  return "2×2 Executive";
}

/** Marketplace-style class pill (Luxury / Business / Sleeper). */
export function busClassPill(layoutType: string): string {
  const cat = busTypeCategory(layoutType);
  if (cat === "sleeper") return "Sleeper";
  if (cat === "business") return "Business";
  return "Luxury";
}

const CITY_URDU: Record<string, string> = {
  Karachi: "کراچی",
  Lahore: "لاہور",
  Islamabad: "اسلام آباد",
  Rawalpindi: "راولپنڈی",
  "Islamabad/Rawalpindi": "اسلام آباد / راولپنڈی",
  "Rawalpindi/Islamabad": "راولپنڈی / اسلام آباد",
  Multan: "ملتان",
  Faisalabad: "فیصل آباد",
  Peshawar: "پشاور",
  Sukkur: "سکھر",
  Hyderabad: "حیدرآباد",
  Abbottabad: "ایبٹ آباد",
  Swat: "سوات",
  Quetta: "کوئٹہ",
  Mingora: "منگورہ",
};

/** English city with optional Urdu parenthetical, e.g. Karachi (کراچی). */
export function bilingualCity(city: string): string {
  const urdu = CITY_URDU[city];
  return urdu ? `${city} (${urdu})` : city;
}

const CITY_CODES: Record<string, string> = {
  karachi: "KHI",
  lahore: "LHE",
  islamabad: "ISB",
  rawalpindi: "RWP",
  "islamabad/rawalpindi": "ISB",
  "rawalpindi/islamabad": "ISB",
  multan: "MUL",
  faisalabad: "FSD",
  peshawar: "PEW",
  sukkur: "SKZ",
  hyderabad: "HDD",
  abbottabad: "ATD",
  swat: "SWT",
  mingora: "SWT",
  quetta: "UET",
};

/** Short marketplace city code, e.g. Karachi → KHI. */
export function cityCode(city: string): string {
  const key = city.toLowerCase().trim();
  if (CITY_CODES[key]) return CITY_CODES[key];
  const letters = city.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
  return letters || city.slice(0, 3).toUpperCase();
}

export function formatCardDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-GB", { month: "short" });
  return `${day} ${month}, ${d.getFullYear()}`;
}

export type BusAmenityId =
  | "audio"
  | "entertainment"
  | "ac"
  | "wifi"
  | "usb"
  | "blanket"
  | "water"
  | "restroom";

export interface BusAmenity {
  id: BusAmenityId;
  label: string;
}

/** Deterministic amenity set from layout + trip id (demo marketplace). */
export function amenitiesForTrip(
  layoutType: string,
  tripId: string,
): BusAmenity[] {
  const cat = busTypeCategory(layoutType);
  const base: BusAmenity[] = [
    { id: "ac", label: "Air Conditioned" },
    { id: "audio", label: "Audio System" },
    { id: "entertainment", label: "Entertainment / TV" },
  ];
  if (cat === "business" || cat === "sleeper") {
    base.push({ id: "wifi", label: "Wi‑Fi" }, { id: "usb", label: "USB Charging" });
  } else {
    let hash = 0;
    for (let i = 0; i < tripId.length; i++) {
      hash = (hash + tripId.charCodeAt(i) * (i + 1)) % 97;
    }
    if (hash % 2 === 0) base.push({ id: "usb", label: "USB Charging" });
    if (hash % 3 === 0) base.push({ id: "wifi", label: "Wi‑Fi" });
  }
  if (cat === "sleeper") {
    base.push(
      { id: "blanket", label: "Blanket & Pillow" },
      { id: "water", label: "Complimentary Water" },
    );
  }
  base.push({ id: "restroom", label: "Onboard Restroom" });
  return base;
}

/** Deterministic refundable flag for marketplace cards. */
export function isTripRefundable(tripId: string): boolean {
  let hash = 0;
  for (let i = 0; i < tripId.length; i++) {
    hash = (hash + tripId.charCodeAt(i) * (i + 1)) % 11;
  }
  return hash % 2 === 0;
}

const BUS_IMAGE_POOL = [
  "https://images.unsplash.com/photo-1544620341-a629aafb9ce?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1464219789935-c2d9d9aba644?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1570125909517-53cb21c89ff2?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1557223562-6c77ef16210f?auto=format&fit=crop&w=800&q=80",
] as const;

/** Three coach images for the expanded trip gallery. */
export function busImagesForTrip(tripId: string): string[] {
  let hash = 0;
  for (let i = 0; i < tripId.length; i++) {
    hash = (hash + tripId.charCodeAt(i) * (i + 1)) % BUS_IMAGE_POOL.length;
  }
  return [0, 1, 2].map(
    (offset) => BUS_IMAGE_POOL[(hash + offset) % BUS_IMAGE_POOL.length],
  );
}
