import type { BusAmenity, BusAmenityId } from "@/lib/booking-utils";

export const MAX_BUS_PHOTOS = 8;
export const MAX_PHOTO_BYTES = 1_500_000;
export const MAX_FEATURES = 16;
export const MAX_FEATURE_LEN = 40;
export const MAX_REVIEW_LEN = 500;

export const ALLOWED_PHOTO_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const BUS_FEATURE_OPTIONS: readonly { id: string; label: string }[] = [
  { id: "ac", label: "Air Conditioned" },
  { id: "wifi", label: "Wi-Fi" },
  { id: "usb", label: "USB Charging" },
  { id: "entertainment", label: "Entertainment / TV" },
  { id: "audio", label: "Audio System" },
  { id: "blanket", label: "Blanket & Pillow" },
  { id: "water", label: "Complimentary Water" },
  { id: "restroom", label: "Onboard Restroom" },
  { id: "recliner", label: "Recliner Seats" },
  { id: "ladies", label: "Ladies Seats" },
  { id: "refreshments", label: "Refreshments" },
  { id: "prayer", label: "Prayer Breaks" },
];

export function photoPublicUrl(photoId: string): string {
  return `/api/bus-photos/${encodeURIComponent(photoId)}`;
}

export function normalizeFeatures(input: unknown): string[] {
  const raw = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(",")
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const label = String(item ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_FEATURE_LEN);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= MAX_FEATURES) break;
  }
  return out;
}

export function featureAmenityId(label: string): BusAmenityId | null {
  const t = label.toLowerCase();
  if (t.includes("wifi") || t.includes("wi-fi") || t.includes("wi fi")) {
    return "wifi";
  }
  if (t.includes("usb") || t.includes("charg")) return "usb";
  if (t.includes("tv") || t.includes("entertain") || t.includes("movie")) {
    return "entertainment";
  }
  if (t.includes("audio") || t.includes("music")) return "audio";
  if (t.includes("blanket") || t.includes("pillow") || t.includes("sleeper")) {
    return "blanket";
  }
  if (t.includes("water") || t.includes("refresh")) return "water";
  if (t.includes("restroom") || t.includes("toilet") || t.includes("wash")) {
    return "restroom";
  }
  if (t.includes("ac") || t.includes("air") || t.includes("cool")) return "ac";
  return null;
}

export function featuresAsAmenities(features: string[]): BusAmenity[] {
  return features.map((label) => ({
    id: featureAmenityId(label) ?? "audio",
    label,
  }));
}

export function averageRating(ratings: number[]): {
  average: number;
  count: number;
} {
  if (ratings.length === 0) return { average: 0, count: 0 };
  const sum = ratings.reduce((acc, n) => acc + n, 0);
  return {
    average: Math.round((sum / ratings.length) * 10) / 10,
    count: ratings.length,
  };
}

export function clampRating(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

export function normalizeReviewComment(value: unknown): string | null {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_REVIEW_LEN);
  return text || null;
}

export async function readUploadedPhotos(
  files: FormDataEntryValue[],
): Promise<{ mimeType: string; data: Buffer }[]> {
  const photos: { mimeType: string; data: Buffer }[] = [];
  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue;
    const mimeType = file.type || "application/octet-stream";
    if (
      !ALLOWED_PHOTO_TYPES.includes(
        mimeType as (typeof ALLOWED_PHOTO_TYPES)[number],
      )
    ) {
      throw new Error("Photos must be JPEG, PNG, or WebP.");
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new Error("Each photo must be 1.5 MB or smaller.");
    }
    photos.push({
      mimeType: mimeType === "image/jpg" ? "image/jpeg" : mimeType,
      data: Buffer.from(await file.arrayBuffer()),
    });
  }
  return photos;
}
