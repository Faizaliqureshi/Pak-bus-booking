"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Phone, Search, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Buses", match: (p: string) => p === "/" || p.startsWith("/search") },
  { href: "/pages/umrah-packages", label: "Umrah" },
  { href: "/pages/holiday-packages", label: "Holidays" },
  { href: "/pages/visa", label: "Visa" },
  { href: "/air/sasta-rewards", label: "Rewards" },
  { href: "/pages/contact-us", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname.startsWith("/admin") || pathname.startsWith("/conductor")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#0a2f6b]/10 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-lg text-[#0a2f6b] hover:bg-[#0a2f6b]/5 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        <Link
          href="/"
          className="font-heading text-xl font-bold tracking-tight text-[#0a2f6b] sm:text-2xl"
        >
          Safar<span className="text-[#f5a623]">PK</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active = item.match
              ? item.match(pathname)
              : pathname === item.href || pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition",
                  active
                    ? "bg-[#0a2f6b] text-white"
                    : "text-[#0a2f6b]/75 hover:bg-[#0a2f6b]/5 hover:text-[#0a2f6b]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <a
            href="tel:021111172782"
            className="hidden items-center gap-1.5 rounded-full bg-[#0a2f6b]/5 px-3 py-1.5 text-xs font-medium text-[#0a2f6b] sm:inline-flex"
          >
            <Phone className="size-3.5" />
            24/7 Support
          </a>
          <Link
            href="/search"
            className="inline-flex size-10 items-center justify-center rounded-lg text-[#0a2f6b] hover:bg-[#0a2f6b]/5"
            aria-label="Search bookings"
          >
            <Search className="size-5" />
          </Link>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-[#0a2f6b]/10 bg-white px-4 py-3 lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#0a2f6b] hover:bg-[#0a2f6b]/5"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
