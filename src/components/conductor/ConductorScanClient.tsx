"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, Loader2, ScanLine, XCircle } from "lucide-react";
import { QRScanner } from "@/components/conductor/QRScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseTicketQr } from "@/lib/checkout-utils";
import { cn } from "@/lib/utils";

type VerifySuccess = {
  valid: true;
  data: {
    pnr: string;
    seatLabel: string;
    seats: string[];
    passengers: Array<{
      name: string;
      cnic: string | null;
      seatNumber: string;
    }>;
    boardingStop: { name: string } | null;
    dropStop: { name: string } | null;
    operatorName: string;
    busNumber: string;
  };
};

type VerifyFailure = {
  valid: false;
  reason: string;
};

type ScanResult =
  | { kind: "success"; payload: VerifySuccess["data"] }
  | { kind: "failure"; reason: string };

function playRejectFeedback() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([80, 40, 80, 40, 120]);
    }
  } catch {
    // ignore
  }

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 180;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
    window.setTimeout(() => void ctx.close(), 300);
  } catch {
    // ignore audio failures
  }
}

export function ConductorScanClient() {
  const [manualPnr, setManualPnr] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const verify = useCallback(async (input: { pnr?: string; rawQr?: string }) => {
    setVerifying(true);
    try {
      const res = await fetch("/api/conductor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = (await res.json()) as VerifySuccess | VerifyFailure;

      if (json.valid) {
        setResult({ kind: "success", payload: json.data });
      } else {
        playRejectFeedback();
        setResult({ kind: "failure", reason: json.reason });
      }
    } catch {
      playRejectFeedback();
      setResult({
        kind: "failure",
        reason: "Network error. Check connection and try again.",
      });
    } finally {
      setVerifying(false);
    }
  }, []);

  const onScan = useCallback(
    (decodedText: string) => {
      if (verifying || result) return;
      const parsed = parseTicketQr(decodedText);
      if (!parsed) {
        playRejectFeedback();
        setResult({
          kind: "failure",
          reason: "Invalid PNR / Ticket Not Found",
        });
        return;
      }
      void verify({ rawQr: decodedText, pnr: parsed.pnr });
    },
    [result, verifying, verify],
  );

  function onManualVerify(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseTicketQr(manualPnr.trim().toUpperCase());
    if (!parsed) {
      playRejectFeedback();
      setResult({
        kind: "failure",
        reason: "Invalid PNR / Ticket Not Found",
      });
      return;
    }
    void verify({ pnr: parsed.pnr });
  }

  function clearResult() {
    setResult(null);
  }

  return (
    <div className="mx-auto flex min-h-[100svh] w-full max-w-lg flex-col bg-zinc-950 text-zinc-50">
      <header className="px-4 pt-5 pb-3">
        <p className="text-xs tracking-[0.22em] text-emerald-400/80 uppercase">
          Ticketpass Conductor
        </p>
        <h1 className="mt-1 font-heading text-2xl font-semibold">
          Ticket scanner
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Scan passenger QR or type PNR manually.
        </p>
      </header>

      <div className="px-4">
        <QRScanner onScan={onScan} paused={Boolean(result) || verifying} />
      </div>

      <form
        onSubmit={onManualVerify}
        className="mt-4 flex items-end gap-2 px-4"
      >
        <div className="flex-1 space-y-1.5">
          <label htmlFor="manual-pnr" className="text-xs text-zinc-400">
            Manual PNR
          </label>
          <Input
            id="manual-pnr"
            value={manualPnr}
            onChange={(e) => setManualPnr(e.target.value.toUpperCase())}
            placeholder="PKR-8921A"
            className="h-11 border-zinc-700 bg-zinc-900 font-mono text-zinc-50 placeholder:text-zinc-600"
          />
        </div>
        <Button
          type="submit"
          disabled={verifying || !manualPnr.trim()}
          className="h-11 bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
        >
          {verifying ? <Loader2 className="size-4 animate-spin" /> : "Verify PNR"}
        </Button>
      </form>

      <div className="mt-4 flex items-center gap-2 px-4 pb-8 text-xs text-zinc-500">
        <ScanLine className="size-3.5" />
        Hold QR steady inside the frame · rear camera preferred
      </div>

      {verifying && !result ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
          <div className="flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-4 text-sm">
            <Loader2 className="size-5 animate-spin text-emerald-400" />
            Verifying ticket…
          </div>
        </div>
      ) : null}

      {result?.kind === "success" ? (
        <button
          type="button"
          onClick={clearResult}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-emerald-600 p-6 text-center text-white"
        >
          <CheckCircle2 className="size-24 drop-shadow-lg" strokeWidth={2.25} />
          <p className="mt-4 text-3xl font-bold tracking-wide">VALID</p>
          <p className="mt-1 text-emerald-50/90">Boarding approved</p>

          <div className="mt-8 w-full max-w-sm space-y-3 rounded-2xl bg-black/15 p-4 text-left text-sm backdrop-blur-sm">
            {result.payload.passengers.map((p) => (
              <div key={`${p.seatNumber}-${p.name}`} className="border-b border-white/15 pb-3 last:border-0 last:pb-0">
                <p className="text-lg font-semibold">{p.name}</p>
                <p className="font-mono text-emerald-50/85">
                  CNIC {p.cnic ?? "—"}
                </p>
              </div>
            ))}
            <p className="text-base font-semibold">{result.payload.seatLabel}</p>
            <p>
              {result.payload.boardingStop?.name ?? "Boarding"} →{" "}
              {result.payload.dropStop?.name ?? "Destination"}
            </p>
            <p className="text-emerald-50/80">
              {result.payload.operatorName} · {result.payload.busNumber} ·{" "}
              {result.payload.pnr}
            </p>
          </div>

          <p className="mt-10 text-sm font-medium text-emerald-50/95">
            Tap anywhere to scan next ticket
          </p>
        </button>
      ) : null}

      {result?.kind === "failure" ? (
        <div
          className={cn(
            "fixed inset-0 z-50 flex flex-col items-center justify-center bg-red-600 p-6 text-center text-white",
          )}
        >
          <XCircle className="size-24 drop-shadow-lg" strokeWidth={2.25} />
          <p className="mt-4 text-3xl font-bold tracking-wide">REJECTED</p>
          <p className="mt-4 max-w-sm text-lg font-semibold leading-snug">
            {result.reason}
          </p>
          <Button
            type="button"
            onClick={clearResult}
            className="mt-10 h-12 bg-white px-8 text-base font-semibold text-red-700 hover:bg-red-50"
          >
            Try Again
          </Button>
        </div>
      ) : null}
    </div>
  );
}
