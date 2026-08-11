import type { Metadata } from "next";
import { ConductorScanClient } from "@/components/conductor/ConductorScanClient";

export const metadata: Metadata = {
  title: "Conductor Scanner · SafarPK",
  description: "Scan and verify intercity bus e-tickets.",
};

export default function ConductorScanPage() {
  return (
    <main className="min-h-[100svh] bg-zinc-950">
      <ConductorScanClient />
    </main>
  );
}
