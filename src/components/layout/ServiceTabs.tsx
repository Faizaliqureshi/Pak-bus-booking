"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const HELPLINE_DISPLAY = "021-111-172-782";
export const HELPLINE_TEL = "021111172782";

export const SERVICE_TABS = [
  {
    href: "/",
    label: "Buses",
    emoji: "🚌",
    activeMatch: (p: string) => p === "/" || p.startsWith("/search"),
  },
  {
    href: "/air/bookings/search",
    label: "Flights",
    emoji: "✈️",
    comingSoon: true,
  },
  {
    href: "/hotels",
    label: "Hotels",
    emoji: "🏨",
    comingSoon: true,
  },
  {
    href: "/umrah-packages",
    label: "Umrah Packages",
    emoji: "🕋",
    comingSoon: true,
  },
  {
    href: "/holiday-packages",
    label: "Holidays",
    emoji: "🌴",
    comingSoon: true,
  },
  {
    href: "/visa",
    label: "Visa Services",
    emoji: "🛂",
    comingSoon: true,
  },
] as const;

export function ServiceTabs({
  className,
  variant = "hero",
}: {
  className?: string;
  variant?: "hero" | "light";
}) {
  const pathname = usePathname();
  const isHero = variant === "hero";

  return (
    <div
      className={cn(
        "flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="tablist"
      aria-label="Travel services"
    >
      {SERVICE_TABS.map((tab) => {
        const active =
          "activeMatch" in tab && tab.activeMatch
            ? tab.activeMatch(pathname)
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const soon = "comingSoon" in tab && tab.comingSoon;

        return (
          <Link
            key={tab.label}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={cn(
              "relative inline-flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-2.5 text-sm font-medium transition sm:px-4",
              isHero
                ? active
                  ? "bg-white text-[#0a2f6b]"
                  : "bg-transparent text-white/85 hover:bg-white/10"
                : active
                  ? "bg-[#fff4ef] text-[#0a2f6b]"
                  : "text-[#0a2f6b]/75 hover:bg-[#0a2f6b]/5",
            )}
          >
            <span aria-hidden>{tab.emoji}</span>
            <span>{tab.label}</span>
            {soon ? (
              <span className="rounded-full bg-[#FF5A1F] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase">
                Soon
              </span>
            ) : null}
            {active ? (
              <span
                aria-hidden
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#FF5A1F]"
              />
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
