"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Pencil, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/account/bookings", label: "Bookings" },
  { href: "/account/purchase-history", label: "Purchase History" },
  { href: "/account/wallet", label: "Wallet" },
] as const;

export function AccountPortalLayout({
  name,
  email,
  children,
}: {
  name: string;
  email: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-[70vh] bg-[#f4f6fa]">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="flex flex-col rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm lg:min-h-[520px]">
          <div className="flex items-start gap-3">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#eef2f7] text-[#94a3b8]">
              <UserRound className="size-8" strokeWidth={1.4} />
            </div>
            <div className="min-w-0 pt-1">
              <p className="truncate text-sm font-semibold text-[#1a2333]">
                {name}
              </p>
              <p className="truncate text-xs text-[#64748b]">{email}</p>
            </div>
            <Link
              href="/account/edit-profile"
              aria-label="Edit profile"
              className="mt-1 ml-auto text-[#64748b] hover:text-[#0a2f6b]"
            >
              <Pencil className="size-4" />
            </Link>
          </div>

          <nav className="mt-8 flex flex-col gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-2.5 text-sm transition",
                    active
                      ? "bg-[#eef4fb] font-semibold text-[#0a2f6b]"
                      : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0a2f6b]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-auto w-full rounded-lg border border-[#0a2f6b] px-3 py-2.5 text-sm font-semibold text-[#0a2f6b] hover:bg-[#0a2f6b] hover:text-white"
          >
            Sign Out
          </button>
        </aside>

        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
