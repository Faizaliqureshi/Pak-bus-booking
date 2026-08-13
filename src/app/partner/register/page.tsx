import { PartnerRegisterForm } from "@/components/partner/PartnerRegisterForm";

export default function PartnerRegisterPage() {
  return (
    <main className="min-h-[70vh] bg-[#f3f6fb]">
      <div className="bg-[#0a2f6b] px-4 py-10 text-white sm:px-6">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Partner Registration
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/70">
            List your fleet on TicketPass — reach passengers searching Karachi,
            Lahore, Islamabad, and more.
          </p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-6 shadow-sm sm:p-8">
          <PartnerRegisterForm />
        </div>
      </div>
    </main>
  );
}
