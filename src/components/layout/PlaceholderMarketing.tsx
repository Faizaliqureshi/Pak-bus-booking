"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PlaceholderShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-[70vh] bg-[#f3f6fb]">
      <div className="bg-[#0a2f6b] px-4 py-12 text-white sm:px-6">
        <div className="mx-auto w-full max-w-4xl">
          {eyebrow ? (
            <p className="text-xs font-semibold tracking-[0.2em] text-[#f5a623] uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-white/75">{subtitle}</p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">{children}</div>
    </main>
  );
}

export function NotifyForm({
  successMessage = "Thanks — we will notify you at launch.",
}: {
  successMessage?: string;
}) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <form
      className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (!email.trim()) return;
        setDone(true);
      }}
    >
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="notify-email">Email</Label>
        <Input
          id="notify-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-11 bg-white"
        />
      </div>
      <Button
        type="submit"
        className="h-11 bg-[#FF5A1F] text-white hover:bg-[#e84e16]"
      >
        Notify me
      </Button>
      {done ? (
        <p className="text-sm text-emerald-700 sm:absolute sm:mt-14" role="status">
          {successMessage}
        </p>
      ) : null}
    </form>
  );
}

export function InquiryForm({
  whatsappHref,
  service = "VISA",
  country,
}: {
  whatsappHref?: string;
  service?: "VISA" | "UMRAH" | "HOLIDAY";
  country?: string;
}) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setSaving(true);
        const form = e.currentTarget;
        const data = new FormData(form);
        try {
          const res = await fetch("/api/services/inquiries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: service,
              country: country ?? data.get("country") ?? null,
              name: String(data.get("name") ?? ""),
              phone: String(data.get("phone") ?? ""),
              notes: String(data.get("notes") ?? ""),
            }),
          });
          const json = await res.json();
          if (!res.ok || !json.success) {
            throw new Error(json.message || "Could not send inquiry.");
          }
          setSent(true);
          form.reset();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not send inquiry.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="inq-name">Full name</Label>
          <Input id="inq-name" name="name" required className="h-11 bg-white" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inq-phone">Mobile</Label>
          <Input
            id="inq-phone"
            name="phone"
            required
            placeholder="0300-1234567"
            className="h-11 bg-white font-mono"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="inq-notes">Travel preferences</Label>
        <Input
          id="inq-notes"
          name="notes"
          className="h-11 bg-white"
          placeholder="Dates, group size…"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={saving}
          className="bg-[#0a2f6b] text-white hover:bg-[#08305f]"
        >
          {saving ? "Sending…" : "Submit inquiry"}
        </Button>
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[#0a2f6b]/15 bg-white px-4 text-sm font-semibold text-[#0a2f6b] hover:bg-[#f3f6fb]"
          >
            Inquire via WhatsApp
          </a>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {sent ? (
        <p className="text-sm text-emerald-700" role="status">
          Inquiry received. Our travel desk will contact you shortly.
        </p>
      ) : null}
    </form>
  );
}

export function BackToBuses() {
  return (
    <p className="mt-8 text-sm text-[#0a2f6b]/65">
      Looking for buses today?{" "}
      <Link href="/" className="font-semibold text-[#FF5A1F] hover:underline">
        Search TicketPass buses
      </Link>
    </p>
  );
}
