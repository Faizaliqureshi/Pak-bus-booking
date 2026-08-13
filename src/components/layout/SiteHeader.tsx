"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Menu, Phone, Search, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SUPPORT_PHONE_DISPLAY = "0312 3137349";
const SUPPORT_PHONE_TEL = "03123137349";

const NAV = [
  {
    href: "/",
    label: "Buses",
    match: (p: string) => p === "/" || p.startsWith("/search"),
  },
  { href: "/pages/umrah-packages", label: "Umrah Packages" },
  { href: "/pages/holiday-packages", label: "Holiday Packages" },
  { href: "/pages/visa", label: "Visa" },
  { href: "/air/sasta-rewards", label: "TicketPass Rewards" },
  { href: "/partner/register", label: "Partner Registration" },
  { href: "/pages/contact-us", label: "Contact Us" },
  { href: "/pages/about-us", label: "About Us" },
  { href: "/pages/faqs", label: "FAQs" },
  { href: "/staff/login", label: "Staff / Partner Login" },
];

const PROFILE_LINKS = [
  { href: "/account/cancel-booking", label: "Cancel Booking" },
  { href: "/account/edit-profile", label: "Edit Profile" },
  { href: "/account/wallet", label: "TicketPass Wallet" },
  { href: "/air/sasta-rewards", label: "TicketPass Rewards" },
] as const;

type SessionUser = {
  id: string;
  name: string;
  email: string;
};

function displayName(user: SessionUser): string {
  const first = user.name.trim().split(/\s+/)[0] || user.email.split("@")[0];
  return first.toLowerCase();
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json();
        if (!cancelled && res.ok && json.success) {
          setUser(json.data);
        } else if (!cancelled) {
          setUser(null);
        }
      } catch {
        if (!cancelled) setUser(null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target)) setMenuOpen(false);
      if (!profileRef.current?.contains(target)) setProfileOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function signOut() {
    setProfileOpen(false);
    await fetch("/api/auth/signout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

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
    <header className="sticky top-0 z-40 border-b border-[#0a2f6b]/10 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        {/* Left: menu + logo (once) */}
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-lg text-[#0a2f6b] hover:bg-[#0a2f6b]/5"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => {
                setMenuOpen((v) => !v);
                setProfileOpen(false);
              }}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>

            {menuOpen ? (
              <nav
                role="menu"
                className="absolute top-full left-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[#d7dde8] bg-white py-2 shadow-[0_16px_40px_-20px_rgba(10,47,107,0.45)]"
              >
                {NAV.map((item) => {
                  const active = item.match
                    ? item.match(pathname)
                    : pathname === item.href || pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "block px-4 py-2.5 text-sm transition",
                        active
                          ? "bg-[#0a2f6b] font-semibold text-white"
                          : "text-[#0a2f6b] hover:bg-[#f3f6fb]",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
          </div>

          <Link
            href="/"
            className="font-heading text-xl font-bold tracking-tight text-[#0a2f6b] sm:text-2xl"
          >
            Ticket<span className="text-[#f5a623]">Pass</span>
          </Link>
        </div>

        {/* Right: contact + auth */}
        <div className="relative flex items-center gap-2 sm:gap-3">
          <a
            href={`tel:${SUPPORT_PHONE_TEL}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0a2f6b]/5 px-2.5 py-1.5 text-xs font-semibold text-[#0a2f6b] sm:px-3"
          >
            <Phone className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">{SUPPORT_PHONE_DISPLAY}</span>
            <span className="sm:hidden">Call</span>
          </a>

          <button
            type="button"
            className="hidden items-center gap-1.5 text-sm font-medium text-[#0a2f6b] sm:inline-flex"
            aria-label="Currency PKR"
          >
            <span className="text-base leading-none" aria-hidden>
              🇵🇰
            </span>
            PKR
            <ChevronDown className="size-3.5 opacity-60" />
          </button>

          {user ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((v) => !v);
                  setMenuOpen(false);
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0a2f6b] hover:opacity-80"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
              >
                <UserRound className="size-5 stroke-[1.5]" />
                <span className="max-w-[100px] truncate">{displayName(user)}</span>
              </button>

              {profileOpen ? (
                <div
                  role="menu"
                  className="absolute top-full right-0 z-50 mt-2 min-w-[180px] overflow-hidden rounded-md border border-[#d7dde8] bg-white py-1 shadow-[0_8px_24px_-12px_rgba(10,47,107,0.35)]"
                >
                  {PROFILE_LINKS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2.5 text-sm text-[#1a2333] transition hover:bg-[#f3f6fb]"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void signOut()}
                    className="block w-full px-4 py-2.5 text-left text-sm text-[#1a2333] transition hover:bg-[#f3f6fb]"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link
              href="/auth/sign-in"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#0a2f6b] px-3 text-xs font-semibold text-white hover:bg-[#08305f]"
            >
              <UserRound className="size-3.5" />
              Sign In
            </Link>
          )}

          <Link
            href="/search"
            className="inline-flex size-9 items-center justify-center rounded-lg text-[#0a2f6b] hover:bg-[#0a2f6b]/5"
            aria-label="Search bookings"
          >
            <Search className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
