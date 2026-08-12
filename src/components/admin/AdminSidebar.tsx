"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bus,
  ClipboardList,
  LayoutDashboard,
  MapPinned,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/partners", label: "Partners", icon: Users },
  { href: "/admin/routes", label: "Routes & Trips", icon: MapPinned },
  { href: "/admin/buses", label: "Fleet Manager", icon: Bus },
  { href: "/admin/manifest", label: "Passenger Manifests", icon: ClipboardList },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export function AdminSidebar({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-teal-900/10 bg-teal-950 text-teal-50">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/admin/dashboard" className="font-heading text-xl font-semibold">
          SafarPK Admin
        </Link>
        <p className="mt-1 text-xs text-teal-200/70">Fleet & revenue console</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition",
                active
                  ? "bg-emerald-500 text-teal-950"
                  : "text-teal-100/80 hover:bg-white/10 hover:text-white",
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
        <p className="text-xs tracking-wide text-teal-200/60 uppercase">
          {userRole}
        </p>
        <Link
          href="/"
          className="mt-3 inline-block text-xs text-emerald-300 hover:underline"
        >
          ← Back to booking site
        </Link>
      </div>
    </aside>
  );
}
