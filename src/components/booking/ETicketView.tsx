"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Download, Loader2, Printer } from "lucide-react";
import { TicketPassLogo } from "@/components/brand/TicketPassLogo";
import { Button } from "@/components/ui/button";
import { formatPkr, formatTime } from "@/lib/booking-utils";
import { maskCnic } from "@/lib/checkout-utils";

export interface TicketViewData {
  pnr: string;
  qrPayload: string;
  totalPrice: number;
  paymentMethod: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  operatorName: string;
  busNumber: string;
  routeName: string;
  departureTime: string;
  arrivalTime: string;
  boardingTerminal: string;
  dropTerminal: string;
  passengers: Array<{
    seatNumber: string;
    name: string;
    cnic: string | null;
    gender: string;
  }>;
  canCancel?: boolean;
  refundPercent?: number;
  companyName?: string;
}

export function ETicketView({ ticket }: { ticket: TicketViewData }) {
  const router = useRouter();
  const [busySeat, setBusySeat] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canCancel = Boolean(ticket.canCancel);
  const seats = ticket.passengers
    .map((p) => p.seatNumber)
    .sort((a, b) => Number(a) - Number(b))
    .join(", ");

  async function cancelSeat(seatNumber: string) {
    if (
      !window.confirm(
        `Cancel seat ${seatNumber} under ${ticket.companyName ?? "this company"} rules${
          typeof ticket.refundPercent === "number"
            ? ` (${ticket.refundPercent}% wallet refund)`
            : ""
        }?`,
      )
    ) {
      return;
    }
    setBusySeat(seatNumber);
    setError(null);
    try {
      const res = await fetch(
        `/api/account/bookings/${encodeURIComponent(ticket.pnr)}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seatNumbers: [seatNumber] }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not cancel that seat.");
      }
      if ((json.data.remainingSeats as string[]).length === 0) {
        router.push("/account/bookings");
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed.");
    } finally {
      setBusySeat(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <a href="/">
          <TicketPassLogo tone="light" size="sm" />
        </a>
        <div className="flex items-center gap-2">
          <a
            href={`/api/account/bookings/${encodeURIComponent(ticket.pnr)}/ticket`}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-teal-800 px-3 text-sm font-semibold text-teal-900 hover:bg-teal-50"
          >
            <Download className="size-4" />
            Download E-Ticket
          </a>
          <Button
            type="button"
            className="h-10 bg-teal-800 text-white hover:bg-teal-700"
            onClick={() => window.print()}
          >
            <Printer className="size-4" />
            Print
          </Button>
        </div>
      </div>

      <article
        id="e-ticket"
        className="overflow-hidden rounded-2xl border border-teal-900/15 bg-white shadow-sm print:rounded-none print:border print:border-black print:shadow-none"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 bg-teal-950 px-6 py-5 text-teal-50 print:bg-white print:text-black print:border-b print:border-black">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase opacity-70">
              E-Ticket
            </p>
            <h1 className="font-heading text-2xl font-semibold">
              {ticket.operatorName}
            </h1>
            <p className="mt-1 text-sm opacity-80">{ticket.routeName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs tracking-wide uppercase opacity-70">PNR</p>
            <p className="font-heading text-3xl font-bold tracking-wide">
              {ticket.pnr}
            </p>
          </div>
        </header>

        <div className="grid gap-6 p-6 md:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs tracking-wide text-teal-900/55 uppercase">
                  Boarding
                </p>
                <p className="mt-1 font-heading text-xl font-semibold text-teal-950">
                  {formatTime(ticket.departureTime)}
                </p>
                <p className="mt-1 text-sm text-teal-900/70">
                  {ticket.boardingTerminal}
                </p>
              </div>
              <div>
                <p className="text-xs tracking-wide text-teal-900/55 uppercase">
                  Drop-off
                </p>
                <p className="mt-1 font-heading text-xl font-semibold text-teal-950">
                  {formatTime(ticket.arrivalTime)}
                </p>
                <p className="mt-1 text-sm text-teal-900/70">
                  {ticket.dropTerminal}
                </p>
              </div>
            </div>

            <div className="grid gap-3 rounded-xl border border-teal-900/10 bg-teal-50/40 p-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-teal-900/55">Bus number</p>
                <p className="font-medium text-teal-950">{ticket.busNumber}</p>
              </div>
              <div>
                <p className="text-teal-900/55">Seat(s)</p>
                <p className="font-medium text-teal-950">{seats}</p>
              </div>
              <div>
                <p className="text-teal-900/55">Amount paid</p>
                <p className="font-medium text-teal-950">
                  {formatPkr(ticket.totalPrice)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs tracking-wide text-teal-900/55 uppercase">
                Passengers
              </p>
              <ul className="mt-2 divide-y divide-teal-900/8 rounded-xl border border-teal-900/10">
                {ticket.passengers.map((p) => (
                  <li
                    key={`${p.seatNumber}-${p.name}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-teal-950">{p.name}</p>
                      <p className="font-mono text-xs text-teal-900/60">
                        CNIC {p.cnic ? maskCnic(p.cnic) : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="rounded-full bg-teal-900/5 px-3 py-1 text-xs font-medium text-teal-900">
                        Seat {p.seatNumber}
                      </p>
                      {canCancel ? (
                        <button
                          type="button"
                          disabled={busySeat === p.seatNumber}
                          onClick={() => void cancelSeat(p.seatNumber)}
                          className="rounded-full border border-red-700/40 px-3 py-1 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50 print:hidden"
                        >
                          {busySeat === p.seatNumber ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            "Cancel seat"
                          )}
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {error ? (
              <p className="text-sm text-red-700 print:hidden" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col items-center justify-start gap-3 rounded-xl border border-dashed border-teal-900/20 bg-[#fbfdfc] p-4 text-center">
            <QRCodeSVG
              value={ticket.qrPayload}
              size={168}
              level="M"
              includeMargin
              className="rounded-lg bg-white"
            />
            <p className="text-xs text-teal-900/60">
              Show this QR at the terminal gate
            </p>
            {ticket.paymentMethod ? (
              <p className="text-xs text-teal-900/55">
                Paid via {ticket.paymentMethod.replace("_", " / ")}
              </p>
            ) : null}
          </div>
        </div>

        <footer className="border-t border-teal-900/10 px-6 py-4 text-xs text-teal-900/55">
          TicketPass demo ticket · Contact {ticket.contactPhone ?? "—"} /{" "}
          {ticket.contactEmail ?? "—"}
        </footer>
      </article>
    </div>
  );
}
