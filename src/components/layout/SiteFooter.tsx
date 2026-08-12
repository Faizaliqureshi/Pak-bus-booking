"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const COMPANY = [
  { href: "/", label: "Home" },
  { href: "/pages/about-us", label: "About Us" },
  { href: "/pages/contact-us", label: "Contact Us" },
  { href: "/pages/faqs", label: "FAQ" },
  { href: "/pages/career", label: "Careers" },
];

const LEGAL = [
  { href: "/pages/privacy-policy", label: "Privacy Policy" },
  { href: "/pages/terms-and-conditions", label: "Terms & Conditions" },
];

const SERVICES = [
  { href: "/", label: "Online Bus Tickets" },
  { href: "/pages/umrah-packages", label: "Umrah Packages" },
  { href: "/pages/holiday-packages", label: "Holiday Packages" },
  { href: "/pages/visa", label: "Visa Services" },
  { href: "/air/sasta-rewards", label: "Safar Rewards" },
];

const OPERATORS = [
  "Daewoo Express",
  "Kainat Travels",
  "Niazi Express",
  "Faisal Movers",
  "Bilal Travels",
  "Skyways",
];

export function SiteFooter() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin") || pathname.startsWith("/conductor")) {
    return null;
  }

  return (
    <footer className="mt-auto border-t border-[#0a2f6b]/10 bg-[#0a2f6b] text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <p className="font-heading text-2xl font-bold tracking-tight">
            Safar<span className="text-[#f5a623]">PK</span>
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            Intercity bus tickets across Pakistan — live seats, secure holds,
            and transparent fares.
          </p>
        </div>

        <FooterCol title="Company" links={COMPANY} />
        <FooterCol title="Services" links={SERVICES} />
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-white/90 uppercase">
            Top Bus Operators
          </h3>
          <ul className="mt-3 space-y-2">
            {OPERATORS.map((name) => (
              <li key={name} className="text-sm text-white/65">
                {name}
              </li>
            ))}
          </ul>
          <ul className="mt-6 space-y-2">
            {LEGAL.map((link) => (
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
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} SafarPK. All rights reserved.</p>
          <p>Inspired by Pakistan travel marketplace UX patterns.</p>
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
