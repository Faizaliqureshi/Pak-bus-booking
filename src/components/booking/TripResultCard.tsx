"use client";

import {
  AirVent,
  BedDouble,
  Bus,
  Check,
  ChevronDown,
  Droplets,
  Headphones,
  Monitor,
  Plug,
  Star,
  Toilet,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { InteractiveSeatMap } from "@/components/booking/InteractiveSeatMap";
import type { TripSearchResult } from "@/components/booking/trip-types";
import {
  amenitiesForTrip,
  bilingualCity,
  busClassPill,
  busTypeLabel,
  formatDuration,
  formatPkr,
  formatTime,
  isTripRefundable,
  type BusAmenityId,
} from "@/lib/booking-utils";
import { featureAmenityId, featuresAsAmenities } from "@/lib/bus-catalog";
import { cn } from "@/lib/utils";

const AMENITY_ICONS: Record<BusAmenityId, LucideIcon> = {
  audio: Headphones,
  entertainment: Monitor,
  ac: AirVent,
  wifi: Wifi,
  usb: Plug,
  blanket: BedDouble,
  water: Droplets,
  restroom: Toilet,
};

interface TripResultCardProps {
  trip: TripSearchResult;
  expanded: boolean;
  deal: number;
  userId: string | null;
  onToggle: () => void;
}

export function TripResultCard({
  trip,
  expanded,
  deal,
  userId,
  onToggle,
}: TripResultCardProps) {
  const salePrice = trip.basePrice - deal;
  const refundable = isTripRefundable(trip.id);
  const classPill = busClassPill(trip.bus.layoutType);
  const partnerFeatures = trip.bus.features ?? [];
  const amenities =
    partnerFeatures.length > 0
      ? featuresAsAmenities(partnerFeatures)
      : amenitiesForTrip(trip.bus.layoutType, trip.id);
  const images = trip.bus.photos ?? [];
  const rating = trip.bus.rating;
  const boarding =
    trip.boardingStop?.name ?? `Main terminal, ${trip.route.originCity}`;
  const dropoff =
    trip.dropStop?.name ?? `Main terminal, ${trip.route.destinationCity}`;
  const initials = trip.operator.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article
      data-testid="trip-card"
      className={cn(
        "overflow-hidden rounded-xl border bg-white shadow-sm transition",
        expanded
          ? "border-[#0a2f6b]/25"
          : "border-[#d8dee8] hover:border-[#0a2f6b]/30",
      )}
    >
      {/* Header card */}
      <div className="grid md:grid-cols-[1fr_auto]">
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#0a2f6b]/12 bg-[#e8eef8] font-heading text-xs font-bold text-[#0a2f6b]"
              aria-hidden
            >
              {initials}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-medium text-[#1a1a1a]">
                {trip.operator.name}
              </h3>
              <p className="text-[11px] text-[#6b7280]">
                {trip.bus.busNumber} · {busTypeLabel(trip.bus.layoutType)}
              </p>
              {rating && rating.count > 0 ? (
                <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-[#b45309]">
                  <Star className="size-3 fill-current" />
                  {rating.average.toFixed(1)}
                  <span className="font-normal text-[#6b7280]">
                    ({rating.count})
                  </span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-2xl font-bold tracking-tight text-[#111827] sm:text-[1.65rem]">
              {formatTime(trip.departureTime)}
            </p>
            <span className="inline-flex items-center gap-2 text-[#9ca3af]">
              <span className="h-px w-5 bg-current sm:w-8" />
              <Bus className="size-4 shrink-0" strokeWidth={1.75} />
              <span className="h-px w-5 bg-current sm:w-8" />
            </span>
            <p className="text-2xl font-bold tracking-tight text-[#111827] sm:text-[1.65rem]">
              {formatTime(trip.arrivalTime)}
            </p>
            <span className="text-xs text-[#9ca3af]">
              {formatDuration(trip.durationMs)}
            </span>
          </div>

          <p className="mt-2 text-sm font-medium text-[#111827]">
            {bilingualCity(trip.route.originCity)} -{" "}
            {bilingualCity(trip.route.destinationCity)}
          </p>

          <div className="mt-1.5 space-y-0.5 text-[13px] leading-snug text-[#1a73e8]">
            <p>{boarding}</p>
            <p>{dropoff}</p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[#6b7280]">
              {amenities.slice(0, 4).map((a) => {
                const Icon = AMENITY_ICONS[a.id] ?? Check;
                return (
                  <span
                    key={`${a.id}-${a.label}`}
                    title={a.label}
                    className="inline-flex size-7 items-center justify-center rounded-md border border-[#e5e7eb] bg-[#f9fafb]"
                  >
                    <Icon className="size-3.5" strokeWidth={1.75} />
                  </span>
                );
              })}
            </span>
            <span className="rounded-full border border-[#d1d5db] bg-white px-2.5 py-0.5 text-xs font-medium text-[#111827]">
              {classPill}
            </span>
            {refundable ? (
              <span className="rounded-full border border-[#86efac] bg-[#ecfdf5] px-2.5 py-0.5 text-xs font-medium text-[#15803d]">
                Refundable
              </span>
            ) : (
              <span className="rounded-full border border-[#fecaca] bg-[#fef2f2] px-2.5 py-0.5 text-xs font-medium text-[#dc2626]">
                Non Refundable
              </span>
            )}
          </div>
        </div>

        {/* Price + CTA column */}
        <div className="flex flex-col items-stretch justify-center gap-3 border-t border-[#e5e7eb] px-4 py-4 sm:px-5 md:w-[180px] md:border-t-0 md:border-l md:items-end">
          <div className="text-left md:text-right">
            {deal > 0 ? (
              <p className="text-sm text-[#9ca3af] line-through">
                {formatPkr(trip.basePrice)}
              </p>
            ) : null}
            <p className="text-xl font-bold text-[#111827]">
              {formatPkr(salePrice)}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            data-testid="check-seats-btn"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0a2f6b] px-4 text-sm font-medium text-white transition hover:bg-[#08305f]"
          >
            Check Seats
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                expanded && "rotate-180",
              )}
            />
          </button>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded ? (
        <div className="border-t border-[#e5e7eb] bg-white p-4 sm:p-5">
          <div className="mb-5 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            <div>
              <p className="mb-2 text-sm font-semibold text-[#0a2f6b]">
                Bus gallery
              </p>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {images.length > 0 ? (
                  images.map((src, i) => (
                    <div
                      key={`${trip.id}-img-${i}`}
                      className="relative aspect-[4/3] overflow-hidden rounded-lg border border-[#e5e7eb] bg-[#f3f6fb]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`${trip.operator.name} coach ${i + 1}`}
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 flex aspect-[16/5] flex-col items-center justify-center rounded-lg border border-dashed border-[#e5e7eb] bg-[#f8fafc] text-[#94a3b8]">
                    <Bus className="size-7" />
                    <p className="mt-2 text-xs">No photos from this partner yet</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-[#0a2f6b]">
                Features
              </p>
              <ul className="grid gap-1.5 sm:grid-cols-1">
                {amenities.map((a) => {
                  const Icon =
                    AMENITY_ICONS[featureAmenityId(a.label) ?? a.id] ?? Check;
                  return (
                    <li
                      key={`${a.id}-${a.label}`}
                      className="flex items-center gap-2 rounded-lg border border-[#eef2f8] bg-[#fafbfd] px-2.5 py-1.5 text-sm text-[#0a2f6b]/85"
                    >
                      <Icon
                        className="size-3.5 shrink-0 text-[#0a2f6b]/55"
                        strokeWidth={1.75}
                      />
                      {a.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {trip.bus.reviews && trip.bus.reviews.length > 0 ? (
            <div className="mb-5">
              <p className="mb-2 text-sm font-semibold text-[#0a2f6b]">
                Passenger reviews
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {trip.bus.reviews.map((review) => (
                  <li
                    key={review.id}
                    className="rounded-lg border border-[#eef2f8] bg-[#fafbfd] px-3 py-2"
                  >
                    <p className="flex items-center gap-1 text-xs font-medium text-[#b45309]">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="size-3 fill-current" />
                      ))}
                      <span className="ml-1 text-[#0a2f6b]">{review.name}</span>
                    </p>
                    {review.comment ? (
                      <p className="mt-1 text-sm text-[#0a2f6b]/80">
                        {review.comment}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {trip.boardingStop && trip.dropStop && userId ? (
            <InteractiveSeatMap
              tripId={trip.id}
              boardingStopId={trip.boardingStop.id}
              dropStopId={trip.dropStop.id}
              basePrice={trip.basePrice}
              dealDiscount={deal}
              layoutType={trip.bus.layoutType}
              userId={userId}
              operatorName={trip.operator.name}
            />
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              Demo user not found. Run <code>npx prisma db seed</code>.
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}
