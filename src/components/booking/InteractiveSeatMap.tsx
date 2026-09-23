"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bus,
  Check,
  Info,
  Loader2,
  Timer,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPkr, busTypeLabel } from "@/lib/booking-utils";
import {
  buildCoachRows,
  buildSleeperDecks,
  isSleeperLayout,
  pairMate,
  sleeperLabelFor,
  type CoachRow,
  type SleeperDeck,
} from "@/lib/seat-layout";
import { cn } from "@/lib/utils";

const MAX_SEATS = 4;

type ApiSeatStatus =
  | "AVAILABLE"
  | "BOOKED"
  | "RESERVED"
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


const FEMALE_ADJACENT_MSG =
  "Seat reserved for female passenger adjacent to another female traveler.";

function visualStatus(
  seat: ApiSeat | undefined,
  selected: SelectedSeatState | undefined,
  selectionGender: "MALE" | "FEMALE",
): VisualSeatStatus {
  if (selected) {
    return selected.gender === "FEMALE" ? "SELECTED_FEMALE" : "SELECTED_MALE";
  }
  if (!seat) return "AVAILABLE";
  if (seat.status === "RESERVED") return "LOCKED_BY_OTHER";
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
      return "cursor-not-allowed border-2 border-[#f8bbd0] bg-[#fce4ec] text-[#ad1457] shadow-[inset_0_0_0_1px_#f48fb1]";
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

  const isSleeper = isSleeperLayout(layoutType);
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
      const url = `/api/trips/${tripId}/seats?${params}`;
      let res: Response | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          res = await fetch(url);
          break;
        } catch (err) {
          if (attempt === 1) throw err;
        }
      }
      const json = await res!.json();
      if (!res!.ok || !json.success) {
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
      setPayload(null);
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
    () => buildCoachRows(payload?.totalSeats ?? 0, layoutType),
    [payload?.totalSeats, layoutType],
  );

  const earliestExpiry = useMemo(() => {
    if (selected.length === 0) return null;
    return Math.min(...selected.map((s) => s.expiresAt));
  }, [selected]);

  const remainingMs = earliestExpiry ? earliestExpiry - now : 0;
  const totalFare = selected.length * unitPrice;
  const seatsUnavailable =
    !loading && (!payload || payload.totalSeats === 0 || rows.length === 0);

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
      if (
        isSelected ||
        status === "SELECTED_MALE" ||
        status === "SELECTED_FEMALE"
      ) {
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

        // Pakistani cultural seating: male cannot take seat beside a female traveller.
        if (gender === "MALE") {
          const mate = pairMate(seatNumber, rows, isSleeper);
          if (mate) {
            const mateApi = seatMap.get(mate);
            const mateSelected = selected.find((s) => s.seatNumber === mate);
            const mateIsFemaleBooked =
              mateApi?.status === "BOOKED" && mateApi.gender === "FEMALE";
            const mateIsFemaleHold = mateSelected?.gender === "FEMALE";
            if (mateIsFemaleBooked || mateIsFemaleHold) {
              setError(FEMALE_ADJACENT_MSG);
              setBusySeat(null);
              return;
            }
          }
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
            <h3 className="text-lg font-bold text-[#374151]">
              Select Your Seat
            </h3>
            <p className="mt-1 text-sm text-[#6b7280]">
              You can book maximum {MAX_SEATS} seats at a time.
            </p>
          </div>
          {payload && !seatsUnavailable ? (
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

        {error && !seatsUnavailable ? (
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
          ) : seatsUnavailable ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-4 py-10 text-center">
              <AlertTriangle
                className="size-14 text-[#eab308]"
                strokeWidth={1.5}
                fill="#fef08a"
              />
              <p className="mt-4 text-lg font-semibold text-[#374151]">
                No Result Found
              </p>
              <p className="mt-1 max-w-sm text-sm text-[#6b7280]">
                {error
                  ? error
                  : "Please try another date or modify your search."}
              </p>
              <button
                type="button"
                onClick={() => void fetchSeats()}
                className="mt-4 rounded-md border border-[#0a2f6b]/20 bg-white px-4 py-2 text-sm font-medium text-[#0a2f6b] transition hover:bg-[#e8eef8]"
              >
                Retry loading seats
              </button>
            </div>
          ) : (
            <div
              className={cn(
                "mx-auto flex w-full flex-col items-center gap-3",
                isSleeper ? "max-w-xl" : "max-w-md",
              )}
            >
              <p className="text-xs tracking-wide text-[#0a2f6b]/45 uppercase">
                {operatorName ? `${operatorName} · ` : ""}
                {busTypeLabel(layoutType)}
                {isSleeper ? "" : " · Lower deck"}
              </p>

              <div className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#0a2f6b]/10 bg-white px-3 py-2 text-[11px] font-medium text-[#0a2f6b]/70">
                <span className="rounded-md bg-[#0a2f6b]/8 px-2 py-1">
                  🚪 Front exit
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#0a2f6b] px-2.5 py-1 text-white">
                  🛞 Driver cabin
                </span>
                <span className="rounded-md bg-[#0a2f6b]/8 px-2 py-1">Door</span>
              </div>

              <div className="w-full rounded-xl bg-white p-4 sm:p-5">
                {isSleeper ? (
                  <SleeperDecksView
                    decks={buildSleeperDecks(payload?.totalSeats ?? 0)}
                    seatMap={seatMap}
                    selected={selected}
                    gender={gender}
                    busySeat={busySeat}
                    onToggle={(n) => void toggleSeat(n)}
                  />
                ) : (
                  <div className="space-y-3">
                    {rows.map((row, rowIndex) => (
                      <CoachRowView
                        key={`row-${rowIndex}`}
                        row={row}
                        sleeper={false}
                        seatMap={seatMap}
                        selected={selected}
                        gender={gender}
                        busySeat={busySeat}
                        onToggle={(n) => void toggleSeat(n)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex w-full items-center justify-center rounded-xl border border-[#0a2f6b]/10 bg-white px-3 py-2 text-[11px] font-medium text-[#0a2f6b]/70">
                🚪 Rear emergency exit
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className="flex flex-col rounded-2xl border border-[#0a2f6b]/10 bg-white p-4">
        <div className="grid grid-cols-1 gap-2.5 text-sm text-[#374151] sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Legend swatch="border-0 bg-[#f48fb1]" label="Reserved (Female)" />
          <Legend swatch="border-0 bg-[#0a2f6b]" label="Reserved (Male)" />
          <Legend
            swatch="border-2 border-[#f48fb1] bg-white"
            label="Selected (Female)"
            checked
            checkClass="text-[#f48fb1]"
          />
          <Legend
            swatch="border-2 border-[#0a2f6b] bg-white"
            label="Selected (Male)"
            checked
            checkClass="text-[#0a2f6b]"
          />
          <Legend
            swatch="border border-[#9aa8bc] bg-white"
            label="Available"
          />
        </div>

        <div className="mt-5 flex items-start gap-2 text-sm text-[#1a73e8]">
          <Bus className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          <p>
            For refund/cancellation kindly review{" "}
            <Link
              href="/terms-and-conditions"
              className="font-medium underline underline-offset-2 hover:text-[#0a2f6b]"
            >
              Terms and Conditions
            </Link>
          </p>
        </div>

        <div className="mt-4">
          <p className="text-sm font-semibold text-[#0a2f6b]">Selected Seats</p>
          <div className="mt-2 flex min-h-10 flex-wrap gap-2">
            {selected.length === 0 ? (
              <p className="inline-flex items-start gap-1.5 text-xs text-[#6b7280]">
                <Info className="mt-0.5 size-3.5 shrink-0 text-[#9ca3af]" />
                Please select an available seat from the chart to continue.
              </p>
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
                    {s.gender === "FEMALE" ? "F" : "M"}-
                    {isSleeper
                      ? sleeperLabelFor(s.seatNumber, payload?.totalSeats ?? 0)
                      : s.seatNumber}
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
            data-testid="continue-booking-btn"
            className={cn(
              "h-12 w-full text-white",
              selected.length === 0
                ? "bg-[#c5cdd8] hover:bg-[#c5cdd8]"
                : "bg-[#0a2f6b] hover:bg-[#08305f]",
            )}
            disabled={selected.length === 0 || checkingOut || seatsUnavailable}
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
  checkClass = "text-white",
}: {
  swatch: string;
  label: string;
  checked?: boolean;
  checkClass?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "relative inline-flex size-4 items-center justify-center rounded-sm",
          swatch,
        )}
      >
        {checked ? (
          <Check className={cn("size-2.5", checkClass)} strokeWidth={3} />
        ) : null}
      </span>
      {label}
    </span>
  );
}

function CoachRowView({
  row,
  sleeper,
  seatMap,
  selected,
  gender,
  busySeat,
  onToggle,
}: {
  row: CoachRow;
  sleeper: boolean;
  seatMap: Map<string, ApiSeat>;
  selected: SelectedSeatState[];
  gender: "MALE" | "FEMALE";
  busySeat: string | null;
  onToggle: (seatNumber: string) => void;
}) {
  const renderSeat = (seatNumber: string | null, key: string) =>
    seatNumber ? (
      <SeatButton
        key={key}
        seatNumber={seatNumber}
        circle={!sleeper}
        status={visualStatus(
          seatMap.get(seatNumber),
          selected.find((s) => s.seatNumber === seatNumber),
          gender,
        )}
        busy={busySeat === seatNumber}
        onClick={() => onToggle(seatNumber)}
      />
    ) : (
      <div key={key} />
    );

  if (row.fullWidth) {
    return (
      <div className="mx-auto grid w-full max-w-[280px] grid-cols-5 items-center justify-items-center gap-x-3 gap-y-2 sm:max-w-[320px]">
        {row.seats.map((n, i) => renderSeat(n, `fw-${i}`))}
      </div>
    );
  }

  if (sleeper) {
    return (
      <div className="grid w-full grid-cols-[1fr_28px_1fr] items-center gap-2">
        {renderSeat(row.seats[0], "l")}
        <div />
        {renderSeat(row.seats[1], "r")}
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[280px] grid-cols-[32px_32px_40px_32px_32px] items-center justify-items-center gap-x-3 sm:max-w-[320px] sm:grid-cols-[36px_36px_48px_36px_36px]">
      {renderSeat(row.seats[0], "lw")}
      {renderSeat(row.seats[1], "la")}
      <div aria-hidden />
      {renderSeat(row.seats[2], "ra")}
      {renderSeat(row.seats[3], "rw")}
    </div>
  );
}

function SleeperDecksView({
  decks,
  seatMap,
  selected,
  gender,
  busySeat,
  onToggle,
}: {
  decks: SleeperDeck[];
  seatMap: Map<string, ApiSeat>;
  selected: SelectedSeatState[];
  gender: "MALE" | "FEMALE";
  busySeat: string | null;
  onToggle: (seatNumber: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-6 sm:gap-8">
      {decks.map((deck) => (
        <div key={deck.name} className="space-y-3">
          <p className="text-center text-sm font-semibold text-[#0a2f6b]">
            {deck.name}
          </p>
          <div className="space-y-3">
            {deck.rows.map((row, i) => (
              <div
                key={`${deck.name}-${i}`}
                className={cn(
                  "mx-auto grid items-center justify-items-center gap-x-3",
                  row.lastTriple
                    ? "grid-cols-3 max-w-[140px]"
                    : "grid-cols-2 max-w-[92px]",
                )}
              >
                {row.berths.map((berth) => (
                  <SeatButton
                    key={berth.seatNumber}
                    seatNumber={berth.seatNumber}
                    label={berth.label}
                    circle
                    status={visualStatus(
                      seatMap.get(berth.seatNumber),
                      selected.find((s) => s.seatNumber === berth.seatNumber),
                      gender,
                    )}
                    busy={busySeat === berth.seatNumber}
                    onClick={() => onToggle(berth.seatNumber)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SeatButton({
  seatNumber,
  status,
  busy,
  onClick,
  circle,
  label,
}: {
  seatNumber?: string;
  status: VisualSeatStatus;
  busy: boolean;
  onClick: () => void;
  circle?: boolean;
  label?: string;
}) {
  if (!seatNumber) return <div />;
  const disabled =
    status === "RESERVED_MALE" ||
    status === "RESERVED_FEMALE" ||
    status === "LOCKED_BY_OTHER" ||
    busy;
  const shown = label ?? seatNumber;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      data-testid={`seat-${seatNumber}`}
      className={cn(
        "relative flex items-center justify-center border text-xs font-semibold transition-all duration-150",
        circle
          ? "size-8 rounded-full sm:size-9"
          : "aspect-square w-full rounded-md",
        seatClass(status),
        busy && "opacity-60",
      )}
      aria-label={`Seat ${shown}, ${status.toLowerCase().replaceAll("_", " ")}`}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : shown}
    </button>
  );
}
