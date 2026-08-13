import Link from "next/link";
import type { ReactNode } from "react";
import {
  BusFront,
  Gift,
  Headphones,
  IdCard,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Trees,
  UsersRound,
} from "lucide-react";
import { SearchWidget } from "@/components/booking/SearchWidget";
import { cn } from "@/lib/utils";

const SERVICES = [
  { href: "/", label: "Buses", icon: BusFront, active: true },
  { href: "/pages/umrah-packages", label: "Umrah", icon: Sparkles },
  { href: "/pages/holiday-packages", label: "Packages", icon: Trees },
  { href: "/pages/visa", label: "Visa", icon: IdCard },
  { href: "/air/sasta-rewards", label: "Rewards", icon: Gift },
] as const;

const ROUTES = [
  { from: "Karachi", to: "Lahore", fromPrice: 4000 },
  { from: "Lahore", to: "Islamabad", fromPrice: 2200 },
  { from: "Karachi", to: "Multan", fromPrice: 3500 },
  { from: "Islamabad", to: "Peshawar", fromPrice: 1800 },
];

export default function HomePage() {
  return (
    <main className="bg-[#f3f6fb] text-[#0a2f6b]">
      <section className="relative isolate overflow-hidden bg-[#0a2f6b]">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(245,166,35,0.22),transparent_42%),radial-gradient(ellipse_at_90%_20%,rgba(255,255,255,0.12),transparent_45%)]"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#f3f6fb]"
        />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
          <div className="max-w-3xl animate-[fadeRise_700ms_ease-out]">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
              One App for Every Journey
            </h1>
            <p className="mt-3 max-w-xl text-sm text-white/70 sm:text-base">
              Pakistan’s next-generation travel platform — start with real-time
              bus bookings, then grow into flights, trains, packages, and more.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-2 animate-[fadeRise_800ms_ease-out]">
            {SERVICES.map((service) => {
              const Icon = service.icon;
              return (
                <Link
                  key={service.label}
                  href={service.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition",
                    "active" in service && service.active
                      ? "bg-white text-[#0a2f6b] shadow-sm"
                      : "bg-[#08305f] text-white/90 hover:bg-[#0d3a72]",
                  )}
                >
                  <Icon className="size-4" />
                  {service.label}
                </Link>
              );
            })}
          </div>

          <div className="relative z-10 mt-6 animate-[fadeRise_900ms_ease-out]">
            <SearchWidget />
          </div>
        </div>
      </section>

      <section className="border-b border-[#0a2f6b]/8 bg-[#e8eef8] px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#0a2f6b] text-white">
              <Headphones className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0a2f6b]">
                24/7 Customer Support
              </p>
              <p className="text-xs text-[#0a2f6b]/65">
                Speak to a travel expert for booking help
              </p>
            </div>
          </div>
          <a
            href="tel:03123137349"
            className="text-sm font-medium text-[#0a2f6b] underline-offset-2 hover:underline"
          >
            Call 0312 3137349
          </a>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="font-heading text-2xl font-semibold text-[#0a2f6b]">
            Popular Routes
          </h2>
          <p className="mt-1 text-sm text-[#0a2f6b]/65">
            Start with Pakistan&apos;s busiest corridors.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ROUTES.map((route) => (
              <Link
                key={`${route.from}-${route.to}`}
                href={`/search?origin=${encodeURIComponent(route.from)}&destination=${encodeURIComponent(route.to)}`}
                className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#0a2f6b]/25 hover:shadow-md"
              >
                <p className="font-medium text-[#0a2f6b]">
                  {route.from} → {route.to}
                </p>
                <p className="mt-2 text-xs text-[#0a2f6b]/55">Starting from</p>
                <p className="font-heading text-lg font-semibold text-[#0a2f6b]">
                  PKR {route.fromPrice.toLocaleString("en-PK")}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid w-full max-w-6xl gap-6 md:grid-cols-3">
          <Feature
            icon={<MapPinned className="size-5" />}
            title="Live Tracking"
            text="Know where your coach is along major corridors from Sindh to Punjab."
          />
          <Feature
            icon={<Sparkles className="size-5" />}
            title="Instant Seat Selection"
            text="Pick from a live 2D seat map with 10-minute holds so double-booking never ruins your trip."
          />
          <Feature
            icon={<UsersRound className="size-5" />}
            title="Female-Friendly Seating"
            text="Clear pink / blue seat cues help families and women travellers choose comfortable seating."
          />
        </div>

        <div className="mx-auto mt-10 flex max-w-6xl items-center gap-3 rounded-2xl border border-[#0a2f6b]/10 bg-white px-5 py-4 text-sm text-[#0a2f6b]/70">
          <ShieldCheck className="size-5 text-[#0a2f6b]" />
          Secure holds powered by Redis + Prisma — built for Pakistani routes.
        </div>
      </section>
    </main>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-2xl border border-[#0a2f6b]/8 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(10,47,107,0.35)]">
      <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-[#0a2f6b] text-white">
        {icon}
      </div>
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#0a2f6b]/65">{text}</p>
    </article>
  );
}
