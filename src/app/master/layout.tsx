import Link from "next/link";
import type { ReactNode } from "react";
import { getAdminUser } from "@/lib/admin-auth";
import { MasterSidebar } from "@/components/master/MasterSidebar";

/**
 * Unified Master portal — MASTER and ADMIN share the same console.
 * Partner uses /partner; passengers use /auth + /account.
 */
export default async function MasterLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getAdminUser();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-4">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="font-heading text-2xl font-semibold text-[#0a2f6b]">
            Master access required
          </h1>
          <p className="mt-2 text-sm text-[#0a2f6b]/65">
            Sign in with a Master or platform Admin account.
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
    <div className="flex min-h-screen bg-[#f3f6fb] text-[#0a2f6b]">
      <div className="sticky top-0 hidden h-screen md:block">
        <MasterSidebar userName={user.name} userRole={user.role} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[#0a2f6b]/10 bg-white px-4 py-3 md:px-6">
          <div>
            <p className="text-xs tracking-[0.18em] text-[#0a2f6b]/55 uppercase md:hidden">
              TicketPass Master
            </p>
            <p className="text-sm text-[#0a2f6b]/65">
              Signed in as {user.name}
            </p>
          </div>
          <nav className="flex gap-3 overflow-x-auto text-xs font-medium md:hidden">
            <Link href="/master">Control</Link>
            <Link href="/master/dashboard">Ops</Link>
            <Link href="/master/buses">Fleet</Link>
            <Link href="/master/track">Track</Link>
            <Link href="/master/manifest">Manifest</Link>
          </nav>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
