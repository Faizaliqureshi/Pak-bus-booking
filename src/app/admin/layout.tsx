import Link from "next/link";
import type { ReactNode } from "react";
import { getAdminUser } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const admin = await getAdminUser();

  if (!admin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
        <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <h1 className="font-heading text-2xl font-semibold text-zinc-900">
            Admin access required
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Sign in with an <strong>ADMIN</strong> or <strong>MASTER</strong>{" "}
            account at the staff login page.
          </p>
          <Link
            href="/staff/login"
            className="mt-6 inline-flex rounded-xl bg-teal-800 px-4 py-2 text-sm text-white"
          >
            Staff login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f3f7f5] text-teal-950">
      <div className="sticky top-0 hidden h-screen md:block">
        <AdminSidebar userName={admin.name} userRole={admin.role} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-teal-900/10 bg-white px-4 py-3 md:px-6">
          <div>
            <p className="text-xs tracking-[0.18em] text-teal-800/55 uppercase md:hidden">
              Ticketpass Admin
            </p>
            <p className="text-sm text-teal-900/65">
              Signed in as {admin.name}
            </p>
          </div>
          <nav className="flex gap-2 overflow-x-auto md:hidden">
            <Link className="text-xs text-teal-800" href="/admin/dashboard">
              Overview
            </Link>
            <Link className="text-xs text-teal-800" href="/admin/partners">
              Partners
            </Link>
            <Link className="text-xs text-teal-800" href="/admin/buses">
              Fleet
            </Link>
          </nav>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
