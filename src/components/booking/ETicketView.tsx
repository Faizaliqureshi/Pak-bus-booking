"use client";

import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
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
}

export function ETicketView({ ticket }: { ticket: TicketViewData }) {
  const seats = ticket.passengers
    .map((p) => p.seatNumber)
    .sort((a, b) => Number(a) - Number(b))
    .join(", ");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <a
          href="/"
          className="font-heading text-lg font-semibold tracking-tight text-teal-950"
        >
          SafarPK
        </a>
        <Button
          type="button"
          className="h-10 bg-teal-800 text-white hover:bg-teal-700"
          onClick={() => window.print()}
        >
          <Printer className="size-4" />
          Print / Save as PDF
        </Button>
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
                    <p className="rounded-full bg-teal-900/5 px-3 py-1 text-xs font-medium text-teal-900">
                      Seat {p.seatNumber}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
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
          SafarPK demo ticket · Contact {ticket.contactPhone ?? "—"} /{" "}
          {ticket.contactEmail ?? "—"}
        </footer>
      </article>
    </div>
  );
}
