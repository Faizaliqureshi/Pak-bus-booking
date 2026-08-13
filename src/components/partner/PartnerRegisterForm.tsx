"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PartnerRegisterForm() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [fleetSize, setFleetSize] = useState("1");
  const [routesServed, setRoutesServed] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/partner/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactName,
          email,
          phone,
          city,
          fleetSize,
          routesServed,
          message,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Submission failed.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-950">
        <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
        <h2 className="mt-3 font-heading text-xl font-semibold">
          Application received
        </h2>
        <p className="mt-2 text-sm text-emerald-900/75">
          Thanks for registering as a TicketPass partner. Our team will review your
          fleet details and contact you shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="companyName">Company / operator name</Label>
          <Input
            id="companyName"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="h-11"
            placeholder="e.g. Kainat Travels"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactName">Contact person</Label>
          <Input
            id="contactName"
            required
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-11"
            placeholder="03XX XXXXXXX"
          />
        </div>
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
          <Label htmlFor="city">Head-office city</Label>
          <Input
            id="city"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="h-11"
            placeholder="Karachi"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fleetSize">Fleet size (buses)</Label>
          <Input
            id="fleetSize"
            type="number"
            min={1}
            required
            value={fleetSize}
            onChange={(e) => setFleetSize(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="routesServed">Routes served</Label>
          <Input
            id="routesServed"
            required
            value={routesServed}
            onChange={(e) => setRoutesServed(e.target.value)}
            className="h-11"
            placeholder="Karachi–Lahore, Lahore–Islamabad"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="message">Additional notes (optional)</Label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder="Amenities, terminals, partnership goals…"
          />
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={loading}
        className="h-11 w-full bg-[#0a2f6b] text-white hover:bg-[#08305f] sm:w-auto sm:px-8"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Submitting…
          </>
        ) : (
          "Submit Partner Application"
        )}
      </Button>
    </form>
  );
}
