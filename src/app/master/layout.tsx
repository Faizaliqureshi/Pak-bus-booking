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
            Sign in with a MASTER account to create platform admins.
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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="font-heading text-xl font-bold">
              Ticket<span className="text-[#f5a623]">Pass</span> Master
            </p>
            <p className="text-xs text-[#0a2f6b]/55">
              Signed in as {master.name}
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/admin/dashboard" className="hover:underline">
              Admin console
            </Link>
            <Link href="/" className="hover:underline">
              Site
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
