"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  paused?: boolean;
  className?: string;
}

export function QRScanner({ onScan, paused = false, className }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const elementId = "conductor-qr-reader";
    let cancelled = false;
    const scanner = new Html5Qrcode(elementId, { verbose: false });
    scannerRef.current = scanner;

    async function start() {
      setStarting(true);
      setError(null);
      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 8,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const edge = Math.min(viewfinderWidth, viewfinderHeight) * 0.72;
              return { width: edge, height: edge };
            },
            aspectRatio: 1,
            disableFlip: false,
          },
          (decodedText) => {
            const now = Date.now();
            const last = lastScanRef.current;
            if (
              last &&
              last.value === decodedText &&
              now - last.at < 2500
            ) {
              return;
            }
            lastScanRef.current = { value: decodedText, at: now };
            onScanRef.current(decodedText);
          },
          () => {
            // ignore frame-level no-detection noise
          },
        );
        if (!cancelled) {
          setReady(true);
          setStarting(false);
        }
      } catch (err) {
        if (!cancelled) {
          setReady(false);
          setStarting(false);
          setError(
            err instanceof Error
              ? err.message
              : "Camera permission denied or unavailable.",
          );
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      const active = scannerRef.current;
      scannerRef.current = null;
      if (active?.isScanning) {
        void active
          .stop()
          .then(() => active.clear())
          .catch(() => undefined);
      } else {
        try {
          active?.clear();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  useEffect(() => {
    const scanner = scannerRef.current;
    if (!scanner || !ready) return;

    async function syncPause() {
      try {
        if (paused) {
          await scanner?.pause(true);
        } else {
          await scanner?.resume();
        }
      } catch {
        // scanner may already be stopped
      }
    }

    void syncPause();
  }, [paused, ready]);

  async function retryCamera() {
    setError(null);
    setStarting(true);
    window.location.reload();
  }

  return (
    <div className={cn("relative w-full overflow-hidden rounded-2xl", className)}>
      <div
        id="conductor-qr-reader"
        className="overflow-hidden rounded-2xl bg-black [&_video]:rounded-2xl"
      />

      {(starting || error) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/95 p-6 text-center">
          {error ? (
            <>
              <CameraOff className="size-10 text-red-400" />
              <p className="text-sm text-zinc-200">{error}</p>
              <p className="text-xs text-zinc-500">
                Allow camera access and use the rear camera on mobile.
              </p>
              <Button
                type="button"
                onClick={() => void retryCamera()}
                className="mt-2 bg-white text-zinc-950 hover:bg-zinc-200"
              >
                Retry camera
              </Button>
            </>
          ) : (
            <>
              <Camera className="size-10 animate-pulse text-emerald-400" />
              <p className="text-sm text-zinc-300">Starting rear camera…</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
