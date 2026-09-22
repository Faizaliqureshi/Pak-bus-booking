import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedVisaService } from "@/lib/service-catalog";
import { formatRs } from "@/lib/booking-utils";
import { VisaInquiryForm } from "@/components/visa/VisaInquiryForm";
import { HELPLINE_DISPLAY, HELPLINE_TEL } from "@/components/layout/ServiceTabs";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const visa = await getPublishedVisaService(slug);
  if (!visa) return { title: "Visa services — TicketPass" };
  return {
    title: `${visa.country} visa — TicketPass`,
    description: `${visa.country} visa requirements and rates on TicketPass.`,
  };
}

export default async function VisaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const visa = await getPublishedVisaService(slug);
  if (!visa) notFound();

  return (
    <main className="min-h-[70vh] bg-[#f3f6fb]">
      <section className="bg-[#0a2f6b] px-4 py-10 text-white sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <Link
            href="/visa"
            className="text-sm font-medium text-white/70 hover:text-[#f5a623]"
          >
            ← All visas
          </Link>
          <p className="mt-4 text-4xl" aria-hidden>
            {visa.flag}
          </p>
          <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-[#f5a623] uppercase">
            Visa services
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {visa.country} visa
          </h1>
          <p className="mt-3 text-base text-white/75">{visa.blurb}</p>
          <p className="mt-2 text-sm text-white/60">{visa.processing}</p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <section className="overflow-hidden rounded-2xl border border-[#0a2f6b]/10 bg-white shadow-sm">
          <div className="border-b border-[#0a2f6b]/10 bg-[#f8fafc] px-5 py-3">
            <h2 className="font-heading text-lg font-semibold text-[#0a2f6b]">
              Rates
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-[#0a2f6b] text-xs tracking-wide text-white uppercase">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Validity</th>
                  {visa.category === "visit" ? (
                    <>
                      <th className="px-4 py-2.5 font-medium">Standard</th>
                      <th className="px-4 py-2.5 font-medium">Express</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-2.5 font-medium">Process fee</th>
                      <th className="px-4 py-2.5 font-medium">Embassy fee</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {visa.pricing.map((row) => (
                  <tr
                    key={row.label}
                    className="border-t border-[#eef2f7] text-[#1a2333]"
                  >
                    <td className="px-4 py-3 font-medium">{row.label}</td>
                    <td className="px-4 py-3 text-[#64748b]">
                      {row.validity}
                      {row.stay ? ` · stay ${row.stay}` : ""}
                    </td>
                    {visa.category === "visit" ? (
                      <>
                        <td className="px-4 py-3">
                          {row.normalPkr != null ? formatRs(row.normalPkr) : "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#0a2f6b]">
                          {row.donePkr != null ? formatRs(row.donePkr) : "—"}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          {row.processPkr != null
                            ? formatRs(row.processPkr)
                            : "—"}
                        </td>
                        <td className="px-4 py-3">{row.embassyFee ?? "—"}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-6 shadow-sm">
          <h2 className="font-heading text-lg font-semibold text-[#0a2f6b]">
            {visa.country} visa requirements
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[#0a2f6b]/80">
            {visa.requirements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {visa.notes?.length ? (
            <ul className="mt-4 space-y-2 text-sm text-amber-900">
              {visa.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-4 text-xs text-[#64748b]">
            Checklists are indicative. The issuing authority has the final say.
            If a normal embassy appointment is not available, extra charges
            apply for a paid slot.
          </p>
        </section>

        <section className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-6 shadow-sm">
          <h2 className="font-heading text-lg font-semibold text-[#0a2f6b]">
            Apply for {visa.country}
          </h2>
          <p className="mt-1 text-sm text-[#0a2f6b]/65">
            Leave your details or WhatsApp the desk to start this file —
            helpline{" "}
            <a className="font-semibold text-[#0a2f6b]" href={`tel:${HELPLINE_TEL}`}>
              {HELPLINE_DISPLAY}
            </a>
            .
          </p>
          <VisaInquiryForm country={visa.country} />
        </section>
      </div>
    </main>
  );
}
