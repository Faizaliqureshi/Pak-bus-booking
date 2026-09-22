"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bus,
  ClipboardList,
  LayoutDashboard,
  MapPinned,
  Moon,
  Radio,
  Settings,
  Shield,
  Stamp,
  Sun,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/master", label: "Control centre", icon: Shield, exact: true },
  { href: "/master/dashboard", label: "Ops overview", icon: LayoutDashboard },
  { href: "/master/partners", label: "Partners", icon: Users },
  { href: "/master/routes", label: "Routes & Trips", icon: MapPinned },
  { href: "/master/buses", label: "Fleet Manager", icon: Bus },
  { href: "/master/track", label: "Track Bus", icon: Radio },
  {
    href: "/master/manifest",
    label: "Passenger Manifests",
    icon: ClipboardList,
  },
  { href: "/master/visas", label: "Visas", icon: Stamp },
  { href: "/master/umrah", label: "Umrah", icon: Moon },
  { href: "/master/holidays", label: "Holidays", icon: Sun },
  { href: "/master/settings", label: "Settings", icon: Settings },
] as const;

export function MasterSidebar({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[#0a2f6b]/15 bg-[#0a2f6b] text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/master" className="font-heading text-xl font-semibold">
          Ticket<span className="text-[#f5a623]">Pass</span> Master
        </Link>
        <p className="mt-1 text-xs text-white/60">
          Platform control · ops &amp; fleet
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map((item) => {
          const exact = "exact" in item && item.exact;
          const active = exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition",
                active
                  ? "bg-[#f5a623] text-[#0a2f6b]"
                  : "text-white/80 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="truncate text-sm font-medium">{userName}</p>
        <p className="text-xs tracking-wide text-white/55 uppercase">
          {userRole}
        </p>
        <Link
          href="/staff/login"
          className="mt-2 inline-block text-xs text-white/70 hover:underline"
        >
          Switch account
        </Link>
        <Link
          href="/"
          className="mt-1 block text-xs text-[#f5a623] hover:underline"
        >
          ← Passenger site
        </Link>
      </div>
    </aside>
  );
}
