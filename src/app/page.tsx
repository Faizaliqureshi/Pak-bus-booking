import Link from "next/link";
import type { ReactNode } from "react";
import { MapPinned, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { SearchWidget } from "@/components/booking/SearchWidget";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#071b19] text-teal-50">
      <section className="relative isolate min-h-[100svh] overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(45,212,191,0.22),transparent_45%),radial-gradient(ellipse_at_80%_10%,rgba(251,191,36,0.14),transparent_40%),linear-gradient(160deg,#041312_0%,#0b2f2a_48%,#123f38_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(circle_at_center,black,transparent_78%)]"
        />
        <div
          aria-hidden
          className="absolute -right-20 bottom-[-10%] h-[55vh] w-[70vw] rounded-full bg-[radial-gradient(circle,rgba(20,184,166,0.28),transparent_65%)] blur-2xl"
        />

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
          <Link
            href="/"
            className="font-heading text-2xl font-semibold tracking-tight text-teal-50"
          >
            SafarPK
          </Link>
          <p className="hidden text-sm text-teal-100/70 sm:block">
            Intercity buses · Pakistan
          </p>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-5.5rem)] w-full max-w-6xl flex-col justify-center gap-8 px-4 pb-16 sm:px-6">
          <div className="max-w-3xl animate-[fadeRise_700ms_ease-out]">
            <p className="mb-3 text-sm tracking-[0.22em] text-teal-200/80 uppercase">
              SafarPK
            </p>
            <h1 className="font-heading text-4xl leading-[1.08] font-semibold tracking-tight text-balance text-white sm:text-5xl lg:text-6xl">
              Book Intercity Bus Tickets across Pakistan with Zero Hassle
            </h1>
            <p className="mt-4 max-w-xl text-base text-teal-100/75 sm:text-lg">
              Search Karachi to Lahore and beyond — lock your seat in seconds
              before someone else does.
            </p>
          </div>

          <div className="animate-[fadeRise_900ms_ease-out]">
            <SearchWidget />
          </div>
        </div>
      </section>

      <section className="relative bg-[#f4f8f6] px-4 py-20 text-teal-950 sm:px-6">
        <div className="mx-auto grid w-full max-w-6xl gap-10 md:grid-cols-3">
          <Feature
            icon={<MapPinned className="size-5" />}
            title="Live Tracking"
            text="Know where your coach is along major corridors from Sindh to Punjab."
            delay="0ms"
          />
          <Feature
            icon={<Sparkles className="size-5" />}
            title="Instant Seat Selection"
            text="Pick from a live 2D seat map with 10-minute holds so double-booking never ruins your trip."
            delay="80ms"
          />
          <Feature
            icon={<UsersRound className="size-5" />}
            title="Female-Friendly Seating"
            text="Clear seat cues help families and women travelers choose comfortable, respectful seating."
            delay="160ms"
          />
        </div>

        <div className="mx-auto mt-16 flex max-w-6xl items-center gap-3 rounded-2xl border border-teal-900/10 bg-white px-5 py-4 text-sm text-teal-900/70">
          <ShieldCheck className="size-5 text-teal-700" />
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
  delay,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  delay: string;
}) {
  return (
    <article
      className="group animate-[fadeRise_800ms_ease-out] rounded-2xl border border-teal-900/8 bg-white/80 p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(8,40,36,0.45)]"
      style={{ animationDelay: delay }}
    >
      <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-teal-800 text-teal-50 transition group-hover:scale-105">
        {icon}
      </div>
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-teal-900/65">{text}</p>
    </article>
  );
}
