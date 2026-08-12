"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPkr } from "@/lib/booking-utils";
import { cn } from "@/lib/utils";

const MAX_SEATS = 4;

type ApiSeatStatus =
  | "AVAILABLE"
  | "BOOKED"
  | "LOCKED_BY_YOU"
  | "LOCKED_BY_OTHER";

interface ApiSeat {
  seatNumber: string;
  status: ApiSeatStatus;
  gender?: "MALE" | "FEMALE" | "OTHER";
}

interface SeatAvailabilityPayload {
  tripId: string;
  totalSeats: number;
  availableSeatsCount: number;
  seats: ApiSeat[];
}

type VisualSeatStatus =
  | "AVAILABLE"
  | "RESERVED_MALE"
  | "RESERVED_FEMALE"
  | "LOCKED_BY_OTHER"
  | "SELECTED_MALE"
  | "SELECTED_FEMALE";

interface InteractiveSeatMapProps {
  tripId: string;
  boardingStopId: string;
  dropStopId: string;
  basePrice: number;
  layoutType: string;
  userId: string;
  operatorName?: string;
  /** Default selection gender for available seats (SastaTicket-style) */
  selectionGender?: "MALE" | "FEMALE";
  dealDiscount?: number;
  className?: string;
}

interface SelectedSeatState {
  seatNumber: string;
  expiresAt: number;
  gender: "MALE" | "FEMALE";
}

function buildRows(totalSeats: number, layoutType: string): string[][] {
  const seats = Array.from({ length: totalSeats }, (_, i) => String(i + 1));
  const isSleeper = layoutType.includes("2x1") || layoutType.includes("SLEEPER");
  const perRow = isSleeper ? 2 : 4;
  const rows: string[][] = [];
  for (let i = 0; i < seats.length; i += perRow) {
    rows.push(seats.slice(i, i + perRow));
  }
  // Last row of 5 for classic 2x2 coaches when remainder fits
  if (!isSleeper && totalSeats >= 40) {
    // keep simple grid; rear row already handled by remainder
  }
  return rows;
}

function visualStatus(
  seat: ApiSeat | undefined,
  selected: SelectedSeatState | undefined,
  selectionGender: "MALE" | "FEMALE",
): VisualSeatStatus {
  if (selected) {
    return selected.gender === "FEMALE" ? "SELECTED_FEMALE" : "SELECTED_MALE";
  }
  if (!seat) return "AVAILABLE";
  if (seat.status === "BOOKED" && seat.gender === "FEMALE") {
    return "RESERVED_FEMALE";
  }
  if (seat.status === "BOOKED") return "RESERVED_MALE";
  if (seat.status === "LOCKED_BY_OTHER") return "LOCKED_BY_OTHER";
  if (seat.status === "LOCKED_BY_YOU") {
    return selectionGender === "FEMALE" ? "SELECTED_FEMALE" : "SELECTED_MALE";
  }
  return "AVAILABLE";
}

function seatClass(status: VisualSeatStatus): string {
  switch (status) {
    case "SELECTED_FEMALE":
      return "border-[#f48fb1] bg-[#f48fb1] text-white";
    case "SELECTED_MALE":
      return "border-[#0a2f6b] bg-[#0a2f6b] text-white";
    case "RESERVED_MALE":
      return "cursor-not-allowed border-[#0a2f6b] bg-[#0a2f6b] text-white";
    case "RESERVED_FEMALE":
      return "cursor-not-allowed border-[#f48fb1] bg-[#f48fb1] text-white";
    case "LOCKED_BY_OTHER":
      return "cursor-not-allowed border-amber-400 bg-amber-200 text-amber-950";
    default:
      return "border-[#9aa8bc] bg-white text-[#0a2f6b] hover:border-[#0a2f6b]";
  }
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function InteractiveSeatMap({
  tripId,
  boardingStopId,
  dropStopId,
  basePrice,
  layoutType,
  userId,
  operatorName,
  selectionGender = "FEMALE",
  dealDiscount = 0,
  className,
}: InteractiveSeatMapProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busySeat, setBusySeat] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [payload, setPayload] = useState<SeatAvailabilityPayload | null>(null);
  const [selected, setSelected] = useState<SelectedSeatState[]>([]);
  const [gender, setGender] = useState<"MALE" | "FEMALE">(selectionGender);
  const [now, setNow] = useState(() => Date.now());
  const router = useRouter();

  const isSleeper = layoutType.includes("2x1") || layoutType.includes("SLEEPER");
  const unitPrice = Math.max(0, basePrice - dealDiscount);

  const fetchSeats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        boardingStopId,
        dropStopId,
        userId,
      });
      const res = await fetch(`/api/trips/${tripId}/seats?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load seats.");
      }
      setPayload(json.data);

      const lockedByYou: SelectedSeatState[] = (json.data.seats as ApiSeat[])
        .filter((s) => s.status === "LOCKED_BY_YOU")
        .map((s) => ({
          seatNumber: s.seatNumber,
          expiresAt: Date.now() + 10 * 60 * 1000,
          gender,
        }));

      setSelected((prev) => {
        const map = new Map(prev.map((p) => [p.seatNumber, p]));
        for (const seat of lockedByYou) {
          if (!map.has(seat.seatNumber)) map.set(seat.seatNumber, seat);
        }
        return Array.from(map.values()).filter((s) =>
          (json.data.seats as ApiSeat[]).some(
            (api) =>
              api.seatNumber === s.seatNumber &&
              (api.status === "LOCKED_BY_YOU" || api.status === "AVAILABLE"),
          ),
        );
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load seats.");
    } finally {
      setLoading(false);
    }
  }, [boardingStopId, dropStopId, tripId, userId]);

  useEffect(() => {
    void fetchSeats();
  }, [fetchSeats]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const expired = selected.filter((s) => s.expiresAt <= Date.now());
    if (expired.length === 0) return;
    setSelected((prev) => prev.filter((s) => s.expiresAt > Date.now()));
    void fetchSeats();
  }, [now, selected, fetchSeats]);

  const seatMap = useMemo(() => {
    const map = new Map<string, ApiSeat>();
    for (const seat of payload?.seats ?? []) map.set(seat.seatNumber, seat);
    return map;
  }, [payload]);

  const rows = useMemo(
    () => buildRows(payload?.totalSeats ?? 0, layoutType),
    [payload?.totalSeats, layoutType],
  );

  const earliestExpiry = useMemo(() => {
    if (selected.length === 0) return null;
    return Math.min(...selected.map((s) => s.expiresAt));
  }, [selected]);

  const remainingMs = earliestExpiry ? earliestExpiry - now : 0;
  const totalFare = selected.length * unitPrice;

  async function toggleSeat(seatNumber: string) {
    const apiSeat = seatMap.get(seatNumber);
    const isSelected = selected.some((s) => s.seatNumber === seatNumber);
    const status = visualStatus(
      apiSeat,
      selected.find((s) => s.seatNumber === seatNumber),
      gender,
    );

    if (
      status === "RESERVED_MALE" ||
      status === "RESERVED_FEMALE" ||
      status === "LOCKED_BY_OTHER"
    ) {
      return;
    }

    setBusySeat(seatNumber);
    setError(null);

    try {
      if (isSelected || status === "SELECTED_MALE" || status === "SELECTED_FEMALE") {
        const res = await fetch("/api/seats/unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tripId, seatNumber, userId }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Could not unlock seat.");
        }
        setSelected((prev) => prev.filter((s) => s.seatNumber !== seatNumber));
      } else {
        if (selected.length >= MAX_SEATS) {
          setError(`You can book maximum ${MAX_SEATS} seats at a time.`);
          setBusySeat(null);
          return;
        }
        const res = await fetch("/api/seats/lock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tripId, seatNumber, userId }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Could not lock seat.");
        }
        const expiresAt = json.data?.expiresAt
          ? new Date(json.data.expiresAt).getTime()
          : Date.now() + 10 * 60 * 1000;
        setSelected((prev) => [
          ...prev.filter((s) => s.seatNumber !== seatNumber),
          { seatNumber, expiresAt, gender },
        ]);
      }
      await fetchSeats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seat action failed.");
      await fetchSeats();
    } finally {
      setBusySeat(null);
    }
  }

  async function removeSeat(seatNumber: string) {
    await toggleSeat(seatNumber);
  }

  async function proceedToCheckout() {
    if (selected.length === 0 || checkingOut) return;
    setCheckingOut(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          userId,
          boardingStopId,
          dropStopId,
          seatNumbers: selected.map((s) => s.seatNumber),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not start checkout.");
      }
      router.push(json.data.checkoutUrl as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setCheckingOut(false);
    }
  }

  return (
    <div className={cn("grid gap-6 lg:grid-cols-[1.2fr_0.8fr]", className)}>
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#0a2f6b]">
              Select Your Seat
            </h3>
            <p className="mt-1 text-sm text-[#0a2f6b]/60">
              You can book maximum {MAX_SEATS} seats at a time.
            </p>
          </div>
          {payload ? (
            <p className="text-sm font-medium text-[#1a73e8]">
              Available seats {payload.availableSeatsCount}/{payload.totalSeats}
            </p>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#0a2f6b]/55">Booking as</span>
          <button
            type="button"
            onClick={() => setGender("FEMALE")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition",
              gender === "FEMALE"
                ? "bg-[#f48fb1] text-white"
                : "bg-[#fde7ef] text-[#a13d63]",
            )}
          >
            Female
          </button>
          <button
            type="button"
            onClick={() => setGender("MALE")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition",
              gender === "MALE"
                ? "bg-[#0a2f6b] text-white"
                : "bg-[#e8eef8] text-[#0a2f6b]",
            )}
          >
            Male
          </button>
        </div>

        {earliestExpiry && remainingMs > 0 ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#0a2f6b]/10 bg-[#eef2f8] px-3 py-2 text-sm text-[#0a2f6b]">
            <Timer className="size-4 animate-pulse" />
            Hold expires in{" "}
            <strong className="font-mono tabular-nums">
              {formatCountdown(remainingMs)}
            </strong>
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-4 rounded-2xl border border-[#0a2f6b]/10 bg-[#f8fafc] p-4">
          {loading && !payload ? (
            <div className="flex h-64 items-center justify-center gap-2 text-[#0a2f6b]/70">
              <Loader2 className="size-5 animate-spin" />
              Loading seat map…
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3">
              <p className="text-xs tracking-wide text-[#0a2f6b]/45 uppercase">
                {operatorName ? `${operatorName} · ` : ""}
                {isSleeper ? "2×1 Sleeper" : "2×2 Executive"}
              </p>
              <div className="w-full space-y-2">
                {rows.map((row, rowIndex) => (
                  <div
                    key={`row-${rowIndex}`}
                    className={cn(
                      "grid items-center gap-2",
                      isSleeper
                        ? "grid-cols-[1fr_20px_1fr]"
                        : "grid-cols-[1fr_1fr_20px_1fr_1fr]",
                    )}
                  >
                    {(isSleeper ? [0, null, 1] : [0, 1, null, 2, 3]).map(
                      (idx, i) =>
                        idx === null ? (
                          <div
                            key={`aisle-${rowIndex}-${i}`}
                            className="h-full min-h-9 w-full rounded-full bg-[#0a2f6b]/5"
                          />
                        ) : (
                          <SeatButton
                            key={`${rowIndex}-${idx}`}
                            seatNumber={row[idx]}
                            status={visualStatus(
                              seatMap.get(row[idx]),
                              selected.find((s) => s.seatNumber === row[idx]),
                              gender,
                            )}
                            busy={busySeat === row[idx]}
                            onClick={() =>
                              row[idx] && void toggleSeat(row[idx])
                            }
                          />
                        ),
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className="flex flex-col rounded-2xl border border-[#0a2f6b]/10 bg-white p-4">
        <div className="space-y-2 text-sm text-[#0a2f6b]/75">
          <Legend swatch="bg-[#f48fb1]" label="Reserved (Female)" />
          <Legend swatch="bg-[#0a2f6b]" label="Reserved (Male)" />
          <Legend
            swatch="bg-[#f48fb1]"
            label="Selected (Female)"
            checked
          />
          <Legend swatch="bg-[#0a2f6b]" label="Selected (Male)" checked />
          <Legend
            swatch="border border-[#9aa8bc] bg-white"
            label="Available"
          />
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold text-[#0a2f6b]">Selected Seats</p>
          <div className="mt-2 flex min-h-10 flex-wrap gap-2">
            {selected.length === 0 ? (
              <p className="text-xs text-[#0a2f6b]/45">No seats selected yet</p>
            ) : (
              selected
                .slice()
                .sort((a, b) => Number(a.seatNumber) - Number(b.seatNumber))
                .map((s) => (
                  <button
                    key={s.seatNumber}
                    type="button"
                    onClick={() => void removeSeat(s.seatNumber)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white",
                      s.gender === "FEMALE" ? "bg-[#f48fb1]" : "bg-[#0a2f6b]",
                    )}
                  >
                    {s.gender === "FEMALE" ? "F" : "M"}-{s.seatNumber}
                    <X className="size-3 opacity-80" />
                  </button>
                ))
            )}
          </div>
        </div>

        <div className="mt-auto pt-8">
          <div className="mb-3 flex items-end justify-between">
            <p className="text-sm text-[#0a2f6b]/55">Total Price</p>
            <p className="font-heading text-2xl font-semibold text-[#0a2f6b]">
              {formatPkr(totalFare || unitPrice)}
            </p>
          </div>
          <Button
            className="h-12 w-full bg-[#0a2f6b] text-white hover:bg-[#08305f]"
            disabled={selected.length === 0 || checkingOut}
            onClick={() => void proceedToCheckout()}
          >
            {checkingOut ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Starting checkout…
              </>
            ) : (
              "Continue Booking"
            )}
          </Button>
          <p className="mt-2 text-center text-[11px] text-[#0a2f6b]/45">
            {formatPkr(unitPrice)} / seat · holds auto-release after 10 minutes
          </p>
        </div>
      </aside>
    </div>
  );
}

function Legend({
  swatch,
  label,
  checked,
}: {
  swatch: string;
  label: string;
  checked?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "relative inline-flex size-4 items-center justify-center rounded-sm",
          swatch,
        )}
      >
        {checked ? <Check className="size-2.5 text-white" strokeWidth={3} /> : null}
      </span>
      {label}
    </span>
  );
}

function SeatButton({
  seatNumber,
  status,
  busy,
  onClick,
}: {
  seatNumber?: string;
  status: VisualSeatStatus;
  busy: boolean;
  onClick: () => void;
}) {
  if (!seatNumber) return <div />;
  const disabled =
    status === "RESERVED_MALE" ||
    status === "RESERVED_FEMALE" ||
    status === "LOCKED_BY_OTHER" ||
    busy;
  const selected =
    status === "SELECTED_MALE" || status === "SELECTED_FEMALE";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex aspect-square w-full items-center justify-center rounded-md border text-xs font-semibold transition-all duration-150",
        seatClass(status),
        busy && "opacity-60",
      )}
      aria-label={`Seat ${seatNumber}, ${status.toLowerCase().replaceAll("_", " ")}`}
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : selected ? (
        <Check className="size-3.5" strokeWidth={3} />
      ) : (
        seatNumber
      )}
    </button>
  );
}
