import Link from "next/link";
import type { ReactNode } from "react";
import { getMasterUser } from "@/lib/admin-auth";

export default async function MasterLayout({
  children,
}: {
  children: ReactNode;
}) {
  const master = await getMasterUser();

  if (!master) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-4">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="font-heading text-2xl font-semibold text-[#0a2f6b]">
            Master access required
          </h1>
          <p className="mt-2 text-sm text-[#0a2f6b]/65">
            Sign in with a MASTER account for the platform control centre.
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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="font-heading text-xl font-bold">
              Ticket<span className="text-[#f5a623]">Pass</span> Master
            </p>
            <p className="text-xs text-[#0a2f6b]/55">
              Signed in as {master.name} · platform owner
            </p>
          </div>
          <nav className="flex flex-wrap gap-3 text-sm font-medium">
            <Link href="/master" className="hover:underline">
              Control centre
            </Link>
            <Link href="/admin/dashboard" className="hover:underline">
              Admin console
            </Link>
            <Link href="/staff/login" className="hover:underline">
              Switch account
            </Link>
            <Link href="/" className="hover:underline">
              Site
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
