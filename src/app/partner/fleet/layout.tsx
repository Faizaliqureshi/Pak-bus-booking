import Link from "next/link";
import type { ReactNode } from "react";
import { getPartnerUser } from "@/lib/admin-auth";

export default async function PartnerFleetLayout({
  children,
}: {
  children: ReactNode;
}) {
  const partner = await getPartnerUser();

  if (!partner) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-4">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="font-heading text-2xl font-semibold text-[#0a2f6b]">
            Partner access required
          </h1>
          <p className="mt-2 text-sm text-[#0a2f6b]/65">
            Sign in with the operator credentials shared by your TicketPass admin.
          </p>
          <Link
            href="/staff/login"
            className="mt-6 inline-flex rounded-xl bg-[#0a2f6b] px-4 py-2 text-sm text-white"
          >
            Partner login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-[#0a2f6b]">
      <header className="border-b border-[#0a2f6b]/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="font-heading text-xl font-bold">Partner portal</p>
            <p className="text-xs text-[#0a2f6b]/55">{partner.name}</p>
          </div>
          <nav className="flex gap-4 text-sm">
            <Link href="/partner/fleet" className="font-medium hover:underline">
              Fleet
            </Link>
            <Link href="/" className="hover:underline">
              Site
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
