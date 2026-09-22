"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TicketPassLogo } from "@/components/brand/TicketPassLogo";
import { Label } from "@/components/ui/label";

const DEMO_STAFF = [
  {
    role: "Master",
    portal: "/master",
    email: "master@ticketpass.pk",
    password: "password123",
    hint: "Platform control + ops",
  },
  {
    role: "Partner",
    portal: "/partner/fleet",
    email: "partner@ticketpass.pk",
    password: "password123",
    hint: "Fleet & coaches",
  },
  {
    role: "Conductor",
    portal: "/conductor",
    email: "conductor@ticketpass.pk",
    password: "password123",
    hint: "Reservations + onboard scan",
  },
] as const;

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/staff-signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Sign in failed.");
      }
      router.push(json.data.redirectTo as string);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a2f6b] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <TicketPassLogo tone="light" size="md" suffix="Staff" />
        <h1 className="mt-2 font-heading text-xl font-semibold text-[#1a2333]">
          Staff portal login
        </h1>
        <p className="mt-1 text-sm text-[#0a2f6b]/60">
          Three staff portals:{" "}
          <strong>Master</strong>, <strong>Partner</strong>,{" "}
          <strong>Conductor</strong>. Passengers use{" "}
          <Link href="/auth/sign-in" className="underline">
            Sign In
          </Link>
          .
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full bg-[#0a2f6b] text-white hover:bg-[#08305f]"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <div className="mt-6 space-y-2">
          <p className="text-xs font-semibold tracking-wide text-[#0a2f6b]/55 uppercase">
            Demo accounts (tap to fill)
          </p>
          {DEMO_STAFF.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => {
                setEmail(account.email);
                setPassword(account.password);
                setError(null);
              }}
              className="flex w-full items-start justify-between gap-3 rounded-xl border border-[#0a2f6b]/10 bg-[#f3f6fb] px-3 py-2.5 text-left transition hover:border-[#0a2f6b]/25 hover:bg-[#e8eef8]"
            >
              <span>
                <span className="block text-sm font-semibold text-[#0a2f6b]">
                  {account.role}
                </span>
                <span className="block font-mono text-[11px] text-[#0a2f6b]/70">
                  {account.email}
                </span>
                <span className="mt-0.5 block text-[11px] text-[#0a2f6b]/45">
                  {account.hint}
                </span>
              </span>
              <span className="shrink-0 text-[10px] font-medium text-[#0a2f6b]/45">
                {account.portal}
              </span>
            </button>
          ))}
          <p className="text-center text-[11px] text-[#0a2f6b]/45">
            Password for demos: <strong>password123</strong>
          </p>
          <p className="text-center text-[11px] text-[#0a2f6b]/45">
            Passenger demo:{" "}
            <Link href="/auth/sign-in" className="underline">
              ali.khan@example.pk
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
