"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export { HELPLINE_DISPLAY, HELPLINE_TEL } from "@/lib/helpline";

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
    href: "/visa",
    label: "Visas",
    emoji: "🛂",
  },
  {
    href: "/umrah-packages",
    label: "Umrah",
    emoji: "🕋",
    comingSoon: true,
  },
  {
    href: "/holiday-packages",
    label: "Holidays",
    emoji: "🌴",
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
              "relative inline-flex shrink-0 items-center gap-1.5 px-3.5 py-2 text-sm font-semibold transition sm:px-4",
              isHero
                ? cn(
                    "rounded-full backdrop-blur-sm",
                    active
                      ? "bg-white text-[#0a2f6b] shadow-md"
                      : "bg-white/15 text-white/90 hover:bg-white/25",
                  )
                : cn(
                    "rounded-full",
                    active
                      ? "bg-[#0a2f6b] text-white"
                      : "text-[#0a2f6b]/75 hover:bg-[#0a2f6b]/5",
                  ),
            )}
          >
            <span aria-hidden>{tab.emoji}</span>
            <span>{tab.label}</span>
            {soon ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase",
                  isHero && !active
                    ? "bg-white/20 text-white"
                    : "bg-[#F5A623] text-[#0A2F6B]",
                )}
              >
                Soon
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
