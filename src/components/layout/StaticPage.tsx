import type { ReactNode } from "react";

export function StaticPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-[70vh] bg-[#f3f6fb]">
      <div className="bg-[#0a2f6b] px-4 py-12 text-white sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 text-base text-white/75">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <div className="space-y-4 rounded-2xl border border-[#0a2f6b]/10 bg-white p-6 text-sm leading-relaxed text-[#0a2f6b]/80 shadow-sm sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}
