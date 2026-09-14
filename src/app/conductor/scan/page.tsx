"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRScanner } from "@/components/conductor/QRScanner";

type VerifyOk = {
  valid: true;
  data: {
    pnr: string;
    seatLabel: string;
    routeName: string;
    busNumber: string;
    passengers: Array<{ name: string; seatNumber: string }>;
  };
};

type VerifyFail = {
  valid: false;
  reason: string;
};

export default function ConductorScanPage() {
  const [pnr, setPnr] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerifyOk | VerifyFail | null>(null);
  const [paused, setPaused] = useState(false);

  async function verify(payload: { rawQr?: string; pnr?: string }) {
    setBusy(true);
    setPaused(true);
    setResult(null);
    try {
      const res = await fetch("/api/conductor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as VerifyOk | VerifyFail;
      setResult(json);
    } catch {
      setResult({ valid: false, reason: "Could not reach verify API." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Scan onboard</h1>
        <p className="mt-1 text-sm text-[#0a2f6b]/65">
          Scan the e-ticket QR or enter the PNR to confirm the passenger has
          boarded.
        </p>
      </div>

      <QRScanner
        paused={paused || busy}
        onScan={(text) => void verify({ rawQr: text })}
      />

      <form
        className="space-y-3 rounded-2xl border border-[#0a2f6b]/10 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (pnr.trim()) void verify({ pnr: pnr.trim() });
        }}
      >
        <Label htmlFor="pnr">Or enter PNR</Label>
        <div className="flex gap-2">
          <Input
            id="pnr"
            value={pnr}
            onChange={(e) => setPnr(e.target.value.toUpperCase())}
            placeholder="PKR-XXXXX"
            className="h-11 font-mono"
          />
          <Button
            type="submit"
            disabled={busy || !pnr.trim()}
            className="h-11 bg-[#0a2f6b] text-white hover:bg-[#08305f]"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Confirm"}
          </Button>
        </div>
      </form>

      {result ? (
        <div
          className={`rounded-2xl border p-4 ${
            result.valid
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          {result.valid ? (
            <>
              <p className="flex items-center gap-2 font-semibold text-emerald-900">
                <CheckCircle2 className="size-5" />
                Boarded
              </p>
              <p className="mt-2 text-sm text-emerald-950">
                {result.data.pnr} · {result.data.seatLabel}
                <br />
                {result.data.routeName} · {result.data.busNumber}
              </p>
              <ul className="mt-2 text-sm text-emerald-900">
                {result.data.passengers.map((p) => (
                  <li key={`${p.seatNumber}-${p.name}`}>
                    {p.name} · Seat {p.seatNumber}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="flex items-center gap-2 font-semibold text-red-800">
              <XCircle className="size-5" />
              {result.reason}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => {
              setResult(null);
              setPaused(false);
            }}
          >
            Scan next
          </Button>
        </div>
      ) : null}

      <p className="text-center text-sm">
        <Link href="/conductor" className="underline">
          Back to reservations
        </Link>
      </p>
    </div>
  );
}
