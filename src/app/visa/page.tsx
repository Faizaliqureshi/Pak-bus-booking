import Link from "next/link";
import { startingFrom, type VisaService } from "@/lib/visa-services";
import { getPublishedVisaServices } from "@/lib/service-catalog";
import { formatRs } from "@/lib/booking-utils";
import { VisaInquiryForm } from "@/components/visa/VisaInquiryForm";
import { BackToBuses } from "@/components/layout/PlaceholderMarketing";
import { HELPLINE_DISPLAY, HELPLINE_TEL } from "@/components/layout/ServiceTabs";

export const dynamic = "force-dynamic";

function VisaCard({ service }: { service: VisaService }) {
  const from = startingFrom(service);
  const first = service.pricing[0];
  return (
    <Link
      href={`/visa/${service.slug}`}
      className="group flex flex-col rounded-2xl border border-[#0a2f6b]/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0a2f6b]/25 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-3xl" aria-hidden>
          {service.flag}
        </span>
      </div>
      <h3 className="mt-3 font-heading text-lg font-semibold text-[#0a2f6b]">
        {service.country}
      </h3>
      <p className="mt-1 text-xs text-[#0a2f6b]/55">
        {first?.type}
        {first?.validity ? ` · ${first.validity}` : ""}
      </p>
      <p className="mt-3 text-sm font-semibold text-[#FF5A1F]">
        From {formatRs(from)}
      </p>
      <p className="mt-auto pt-4 text-sm font-semibold text-[#0a2f6b] group-hover:underline">
        Apply now
      </p>
    </Link>
  );
}

export default async function VisaServicesPage() {
  const visas = await getPublishedVisaServices();
  const visitVisas = visas.filter((v) => v.category === "visit");
  const processVisas = visas.filter((v) => v.category === "process");

  return (
    <main className="min-h-[70vh] bg-[#f3f6fb]">
      <section className="bg-[#0a2f6b] px-4 py-12 text-white sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#f5a623] uppercase">
            Visa Services
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-5xl">
            Speed up your visa process
          </h1>
          <p className="mt-3 max-w-2xl text-base text-white/75">
            Visit visas and embassy file-prep for the destinations on our
            published tariff. Open a country for the checklist, then apply.
          </p>
          <p className="mt-4 text-sm text-white/70">
            Helpline{" "}
            <a className="font-semibold text-[#f5a623]" href={`tel:${HELPLINE_TEL}`}>
              {HELPLINE_DISPLAY}
            </a>
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="font-heading text-2xl font-semibold text-[#0a2f6b]">
          Available visas
        </h2>
        <p className="mt-1 text-sm text-[#0a2f6b]/60">
          Standard and express (done) base rates in PKR. Embassy or appointment
          extras may apply.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visitVisas.map((service) => (
            <VisaCard key={service.slug} service={service} />
          ))}
        </div>

        <h2 className="mt-12 font-heading text-2xl font-semibold text-[#0a2f6b]">
          Additional visa services
        </h2>
        <p className="mt-1 text-sm text-[#0a2f6b]/60">
          Process-only files for popular embassy destinations. Embassy fee is
          separate.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {processVisas.map((service) => (
            <VisaCard key={service.slug} service={service} />
          ))}
        </div>

        <aside className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          If a normal embassy appointment is not available, extra charges apply
          for a paid embassy appointment slot.
        </aside>

        <div className="mt-10 rounded-2xl border border-[#0a2f6b]/10 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="font-heading text-lg font-semibold text-[#0a2f6b]">
            Request a callback
          </h2>
          <p className="mt-1 text-sm text-[#0a2f6b]/65">
            Tell us the country and travel month. Our visa desk will confirm
            the document list and start your file.
          </p>
          <VisaInquiryForm />
        </div>
        <BackToBuses />
      </div>
    </main>
  );
}
