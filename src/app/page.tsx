import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Headphones,
  MapPinned,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { SearchWidget } from "@/components/booking/SearchWidget";
import { ServiceTabs } from "@/components/layout/ServiceTabs";
import { HELPLINE_DISPLAY, HELPLINE_TEL } from "@/lib/helpline";

const ROUTES = [
  {
    from: "Karachi",
    to: "Lahore",
    fromPrice: 4000,
    duration: "Approx. 16h drive",
    amenity: "Luxury AC Sleeper available",
    image: "/routes/karachi.png",
    imageAlt: "Karachi waterfront skyline at dusk",
  },
  {
    from: "Lahore",
    to: "Islamabad/Rawalpindi",
    fromPrice: 2200,
    duration: "Approx. 5h drive",
    amenity: "Executive coach available",
    image: "/routes/lahore.png",
    imageAlt: "Lahore Badshahi Mosque and historic old city",
  },
  {
    from: "Karachi",
    to: "Multan",
    fromPrice: 3500,
    duration: "Approx. 10h drive",
    amenity: "AC Sleeper available",
    image: "/routes/multan.png",
    imageAlt: "Historic blue-tiled shrines in Multan",
  },
  {
    from: "Islamabad/Rawalpindi",
    to: "Peshawar",
    fromPrice: 1800,
    duration: "Approx. 2.5h drive",
    amenity: "Luxury AC coach available",
    image: "/routes/islamabad.png",
    imageAlt: "Faisal Mosque with the Margalla Hills in Islamabad",
  },
];

export default function HomePage() {
  return (
    <main className="bg-[#f3f6fb] text-[#0a2f6b]">
      <section className="relative isolate min-h-[520px] overflow-hidden bg-[#061833] sm:min-h-[560px]">
        <div aria-hidden className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero/travel-mosaic-bus.png"
            alt=""
            className="h-full w-full object-cover"
            style={{ objectPosition: "12% 38%" }}
          />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-28 bg-gradient-to-b from-black/45 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-24 bg-gradient-to-b from-transparent to-[#f3f6fb]"
        />

        <div className="relative z-10 mx-auto flex min-h-[520px] w-full max-w-6xl flex-col justify-end px-4 pb-8 pt-8 sm:min-h-[560px] sm:px-6 sm:pb-10 sm:pt-10">
          <div className="flex max-w-xl flex-col items-start [text-shadow:0_2px_16px_rgba(0,0,0,0.55)]">
            <h1 className="origin-left scale-x-[0.84] font-heading text-2xl font-semibold tracking-tighter text-white sm:text-3xl lg:text-4xl">
              One App for Every Journey
            </h1>
          </div>

          <div className="mt-8 sm:mt-10">
            <ServiceTabs variant="hero" />
            <SearchWidget className="mt-1.5" />
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
            href={`tel:${HELPLINE_TEL}`}
            className="text-sm font-medium text-[#0a2f6b] underline-offset-2 hover:underline"
          >
            Call {HELPLINE_DISPLAY}
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
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROUTES.map((route) => (
              <Link
                key={`${route.from}-${route.to}`}
                href={`/search?origin=${encodeURIComponent(route.from)}&destination=${encodeURIComponent(route.to)}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative h-44 overflow-hidden">
                  <Image
                    src={route.image}
                    alt={route.imageAlt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover object-[center_70%] transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <span className="absolute bottom-3 left-3 rounded-full bg-[#F5A623] px-2.5 py-1 text-[11px] font-bold text-[#0A2F6B] shadow-sm">
                    Starting from PKR {route.fromPrice.toLocaleString("en-PK")}
                  </span>
                </div>
                <div className="space-y-2 p-4">
                  <p className="font-heading text-base font-semibold text-slate-900">
                    {route.from} → {route.to}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {route.duration}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {route.amenity}
                    </span>
                  </div>
                </div>
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
