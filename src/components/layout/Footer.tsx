"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HELPLINE_DISPLAY, HELPLINE_TEL } from "@/components/layout/ServiceTabs";

const COMPANY = [
  { href: "/about-us", label: "About Us" },
  { href: "/career", label: "Careers" },
  { href: "/contact-us", label: "Contact Us" },
];

const POLICIES = [
  { href: "/terms-and-conditions", label: "Terms & Conditions" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/cancellation-refund-policy", label: "Cancellation & Refund Policy" },
];

const SUPPORT = [
  { href: "/faqs", label: "FAQs" },
  { href: `tel:${HELPLINE_TEL}`, label: `24/7 Helpline (${HELPLINE_DISPLAY})` },
  { href: "mailto:support@pakbus.com", label: "Email Support (support@pakbus.com)" },
];

const PAYMENT_PARTNERS = [
  { name: "JazzCash", tone: "bg-[#c41230] text-white" },
  { name: "EasyPaisa", tone: "bg-[#28a745] text-white" },
  { name: "1BILL", tone: "bg-[#0a2f6b] text-white" },
  { name: "Visa", tone: "bg-[#1a1f71] text-white" },
  { name: "Mastercard", tone: "bg-[#eb001b] text-white" },
] as const;

/** Full SastaTicket-style marketplace footer. */
export function Footer() {
  const pathname = usePathname();

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/conductor") ||
    pathname.startsWith("/master") ||
    pathname.startsWith("/staff") ||
    pathname.startsWith("/partner/fleet")
  ) {
    return null;
  }

  return (
    <footer className="mt-auto border-t border-[#0a2f6b]/10 bg-[#0a2f6b] text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <p className="font-heading text-2xl font-bold tracking-tight">
            Ticket<span className="text-[#f5a623]">Pass</span>
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            One App for Every Journey — buses today, flights, packages, and visa
            assistance tomorrow.
          </p>
          <h3 className="mt-6 text-sm font-semibold tracking-wide text-white/90 uppercase">
            Company
          </h3>
          <ul className="mt-3 space-y-2">
            {COMPANY.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-white/65 transition hover:text-[#f5a623]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <FooterCol title="Policies" links={POLICIES} />
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-white/90 uppercase">
            Support
          </h3>
          <ul className="mt-3 space-y-2">
            {SUPPORT.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-sm text-white/65 transition hover:text-[#f5a623]"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold tracking-wide text-white/90 uppercase">
            Payment Partners
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {PAYMENT_PARTNERS.map((partner) => (
              <span
                key={partner.name}
                className={`inline-flex items-center rounded-md px-2.5 py-1.5 text-[11px] font-bold tracking-wide ${partner.tone}`}
              >
                {partner.name}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-white/50">
            Secure local wallets and cards accepted at checkout. Demo payments are
            simulated for TicketPass staging.
          </p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-white/55 sm:px-6">
          <p>© {new Date().getFullYear()} TicketPass. All rights reserved.</p>
          <p>
            TicketPass Technologies (Private) Limited — online travel marketplace
            for intercity bus bookings across Pakistan. Carriage is provided by
            listed operators; TicketPass acts as a booking platform.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold tracking-wide text-white/90 uppercase">
        {title}
      </h3>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-white/65 transition hover:text-[#f5a623]"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** @deprecated Prefer Footer */
export { Footer as SiteFooter };
