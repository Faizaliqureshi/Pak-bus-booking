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
