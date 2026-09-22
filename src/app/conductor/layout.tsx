import Link from "next/link";
import type { ReactNode } from "react";
import { TicketPassLogo } from "@/components/brand/TicketPassLogo";
import { getConductorUser } from "@/lib/admin-auth";

export default async function ConductorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const conductor = await getConductorUser();

  if (!conductor) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-4">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="font-heading text-2xl font-semibold text-[#0a2f6b]">
            Conductor access required
          </h1>
          <p className="mt-2 text-sm text-[#0a2f6b]/65">
            Sign in with a Conductor account to view reservations and confirm
            boarding.
          </p>
          <Link
            href="/staff/login"
            className="mt-6 inline-flex rounded-xl bg-[#0a2f6b] px-4 py-2 text-sm text-white"
          >
            Staff login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-[#0a2f6b]">
      <header className="border-b border-[#0a2f6b]/10 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <TicketPassLogo tone="light" size="sm" suffix="Conductor" />
            <p className="text-xs text-[#0a2f6b]/55">{conductor.name}</p>
          </div>
          <nav className="flex flex-wrap gap-4 text-sm font-medium">
            <Link href="/conductor" className="hover:underline">
              Reservations
            </Link>
            <Link href="/conductor/scan" className="hover:underline">
              Scan onboard
            </Link>
            <Link href="/conductor/track" className="hover:underline">
              Track Bus
            </Link>
            <Link href="/staff/login" className="hover:underline">
              Switch account
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
