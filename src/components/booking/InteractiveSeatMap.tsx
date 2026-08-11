"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Timer, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatPkr } from "@/lib/booking-utils";
import { cn } from "@/lib/utils";

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
  | "BOOKED"
  | "LOCKED_BY_OTHER"
  | "FEMALE"
  | "SELECTED";

interface InteractiveSeatMapProps {
  tripId: string;
  boardingStopId: string;
  dropStopId: string;
  basePrice: number;
  layoutType: string;
  userId: string;
  operatorName?: string;
}

interface SelectedSeatState {
  seatNumber: string;
  expiresAt: number;
}

function buildRows(totalSeats: number, layoutType: string): string[][] {
  const seats = Array.from({ length: totalSeats }, (_, i) => String(i + 1));
  const isSleeper = layoutType.includes("2x1") || layoutType.includes("SLEEPER");
  const perRow = isSleeper ? 2 : 4;
  const rows: string[][] = [];
  for (let i = 0; i < seats.length; i += perRow) {
    rows.push(seats.slice(i, i + perRow));
  }
  return rows;
}

function visualStatus(
  seat: ApiSeat | undefined,
  selected: boolean,
): VisualSeatStatus {
  if (selected) return "SELECTED";
  if (!seat) return "AVAILABLE";
  if (seat.status === "BOOKED" && seat.gender === "FEMALE") return "FEMALE";
  if (seat.status === "BOOKED") return "BOOKED";
  if (seat.status === "LOCKED_BY_OTHER") return "LOCKED_BY_OTHER";
  if (seat.status === "LOCKED_BY_YOU") return "SELECTED";
  return "AVAILABLE";
}

function seatClass(status: VisualSeatStatus): string {
  switch (status) {
    case "SELECTED":
      return "border-emerald-600 bg-emerald-500 text-white shadow-[0_0_0_2px_rgba(16,185,129,0.25)]";
    case "BOOKED":
      return "cursor-not-allowed border-zinc-300 bg-zinc-300 text-zinc-500";
    case "LOCKED_BY_OTHER":
      return "cursor-not-allowed border-amber-400 bg-amber-300 text-amber-950";
    case "FEMALE":
      return "cursor-not-allowed border-pink-300 bg-pink-200 text-pink-900";
    default:
      return "border-zinc-800 bg-white text-zinc-900 hover:border-emerald-600 hover:bg-emerald-50";
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
}: InteractiveSeatMapProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busySeat, setBusySeat] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [payload, setPayload] = useState<SeatAvailabilityPayload | null>(null);
  const [selected, setSelected] = useState<SelectedSeatState[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const router = useRouter();

  const isSleeper = layoutType.includes("2x1") || layoutType.includes("SLEEPER");

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
  const totalFare = selected.length * basePrice;

  async function toggleSeat(seatNumber: string) {
    const apiSeat = seatMap.get(seatNumber);
    const isSelected = selected.some((s) => s.seatNumber === seatNumber);
    const status = visualStatus(apiSeat, isSelected);

    if (
      status === "BOOKED" ||
      status === "FEMALE" ||
      status === "LOCKED_BY_OTHER"
    ) {
      return;
    }

    setBusySeat(seatNumber);
    setError(null);

    try {
      if (isSelected || status === "SELECTED") {
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
          { seatNumber, expiresAt },
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-1 px-1">
        <p className="text-xs tracking-[0.18em] text-teal-800/70 uppercase">
          Seat map
        </p>
        <h3 className="font-heading text-xl font-semibold text-teal-950">
          {operatorName ?? "Select your seats"}
        </h3>
        <p className="text-sm text-teal-900/65">
          Tap an available seat to hold it for 10 minutes.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <Legend swatch="border-zinc-800 bg-white" label="Available" />
        <Legend swatch="border-zinc-300 bg-zinc-300" label="Booked" />
        <Legend swatch="border-amber-400 bg-amber-300" label="Held by other" />
        <Legend swatch="border-pink-300 bg-pink-200" label="Female reserved" />
        <Legend swatch="border-emerald-600 bg-emerald-500" label="Selected" />
      </div>

      {earliestExpiry && remainingMs > 0 ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-700/15 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          <Timer className="size-4 animate-pulse text-emerald-700" />
          <span>
            Hold expires in{" "}
            <strong className="font-mono tabular-nums">
              {formatCountdown(remainingMs)}
            </strong>
          </span>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <ScrollArea className="mt-4 min-h-0 flex-1 rounded-2xl border border-teal-900/10 bg-[linear-gradient(180deg,#f4faf8_0%,#eef6f3_100%)] p-4">
        {loading && !payload ? (
          <div className="flex h-64 items-center justify-center gap-2 text-teal-900/70">
            <Loader2 className="size-5 animate-spin" />
            Loading seat map…
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3">
            <div className="flex w-full items-center justify-between rounded-full bg-teal-950 px-4 py-2 text-xs text-teal-50">
              <span>Front</span>
              <span className="inline-flex items-center gap-1">
                <UserRound className="size-3.5" /> Driver
              </span>
              <span className="opacity-70">●</span>
            </div>

            <div
              className="w-full rounded-[1.75rem] border-2 border-teal-900/20 bg-white/70 p-3 shadow-inner"
              aria-label="Bus cabin"
            >
              <div className="mb-3 flex justify-center">
                <div className="h-8 w-16 rounded-b-2xl border border-teal-900/20 bg-teal-900/10" />
              </div>

              <div className="space-y-2">
                {rows.map((row, rowIndex) => (
                  <div
                    key={`row-${rowIndex}`}
                    className={cn(
                      "grid items-center gap-2",
                      isSleeper
                        ? "grid-cols-[1fr_24px_1fr]"
                        : "grid-cols-[1fr_1fr_24px_1fr_1fr]",
                    )}
                  >
                    {isSleeper ? (
                      <>
                        <SeatButton
                          seatNumber={row[0]}
                          status={visualStatus(
                            seatMap.get(row[0]),
                            selected.some((s) => s.seatNumber === row[0]),
                          )}
                          busy={busySeat === row[0]}
                          onClick={() => void toggleSeat(row[0])}
                        />
                        <div className="h-full w-full rounded-full bg-teal-900/5" />
                        <SeatButton
                          seatNumber={row[1]}
                          status={visualStatus(
                            seatMap.get(row[1]),
                            selected.some((s) => s.seatNumber === row[1]),
                          )}
                          busy={busySeat === row[1]}
                          onClick={() => row[1] && void toggleSeat(row[1])}
                        />
                      </>
                    ) : (
                      <>
                        <SeatButton
                          seatNumber={row[0]}
                          status={visualStatus(
                            seatMap.get(row[0]),
                            selected.some((s) => s.seatNumber === row[0]),
                          )}
                          busy={busySeat === row[0]}
                          onClick={() => void toggleSeat(row[0])}
                        />
                        <SeatButton
                          seatNumber={row[1]}
                          status={visualStatus(
                            seatMap.get(row[1]),
                            selected.some((s) => s.seatNumber === row[1]),
                          )}
                          busy={busySeat === row[1]}
                          onClick={() => void toggleSeat(row[1])}
                        />
                        <div className="h-full w-full rounded-full bg-teal-900/5" />
                        <SeatButton
                          seatNumber={row[2]}
                          status={visualStatus(
                            seatMap.get(row[2]),
                            selected.some((s) => s.seatNumber === row[2]),
                          )}
                          busy={busySeat === row[2]}
                          onClick={() => row[2] && void toggleSeat(row[2])}
                        />
                        <SeatButton
                          seatNumber={row[3]}
                          status={visualStatus(
                            seatMap.get(row[3]),
                            selected.some((s) => s.seatNumber === row[3]),
                          )}
                          busy={busySeat === row[3]}
                          onClick={() => row[3] && void toggleSeat(row[3])}
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Badge
              variant="secondary"
              className="bg-teal-900/5 text-teal-900/70"
            >
              {isSleeper ? "2×1 Sleeper layout" : "2×2 Executive layout"}
            </Badge>
          </div>
        )}
      </ScrollArea>

      <div className="mt-4 rounded-2xl border border-teal-900/10 bg-white p-4 shadow-[0_-8px_30px_-18px_rgba(8,40,36,0.35)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-wide text-teal-900/55 uppercase">
              Selection
            </p>
            <p className="mt-1 text-sm text-teal-950">
              <strong>{selected.length}</strong> seat
              {selected.length === 1 ? "" : "s"}
              {selected.length > 0
                ? `: ${selected
                    .map((s) => s.seatNumber)
                    .sort((a, b) => Number(a) - Number(b))
                    .join(", ")}`
                : ""}
            </p>
            <p className="mt-1 font-heading text-2xl font-semibold text-teal-950">
              {formatPkr(totalFare)}
            </p>
          </div>
          {selected.length === 0 ? (
            <Button
              disabled
              className="h-11 bg-teal-800 px-5 text-white hover:bg-teal-700 disabled:opacity-50"
            >
              Proceed to Passenger Details
            </Button>
          ) : (
            <Button
              className="h-11 bg-teal-800 px-5 text-white hover:bg-teal-700"
              onClick={() => void proceedToCheckout()}
              disabled={checkingOut}
            >
              {checkingOut ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Starting checkout…
                </>
              ) : (
                "Proceed to Passenger Details"
              )}
            </Button>
          )}        </div>
        <Separator className="my-3" />
        <p className="text-xs text-teal-900/55">
          Fare shown at base price {formatPkr(basePrice)} / seat. Holds auto-release
          after 10 minutes.
        </p>
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-teal-900/70">
      <span className={cn("size-3.5 rounded-sm border", swatch)} />
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
    status === "BOOKED" ||
    status === "FEMALE" ||
    status === "LOCKED_BY_OTHER" ||
    busy;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex aspect-square w-full items-center justify-center rounded-lg border-2 text-xs font-semibold transition-all duration-200",
        seatClass(status),
        busy && "opacity-60",
      )}
      aria-label={`Seat ${seatNumber}, ${status.toLowerCase().replaceAll("_", " ")}`}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : seatNumber}
    </button>
  );
}
