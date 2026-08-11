"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Loader2,
  Smartphone,
  Timer,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  formatCnic,
  isValidCnic,
  isValidEmail,
  isValidPkPhone,
  type PaymentMethod,
} from "@/lib/checkout-utils";
import { formatPkr, formatTime } from "@/lib/booking-utils";
import { cn } from "@/lib/utils";

export interface CheckoutBookingView {
  id: string;
  pnr: string;
  totalPrice: number;
  lockExpiresAt: string | null;
  heldSeats: string[];
  contactPhone?: string | null;
  contactEmail?: string | null;
  trip: {
    id: string;
    departureTime: string;
    arrivalTime: string;
    basePrice: number;
    busNumber: string;
    operatorName: string;
    routeName: string;
    originCity: string;
    destinationCity: string;
  };
  boardingStop: { id: string; name: string } | null;
  dropStop: { id: string; name: string } | null;
}

interface PassengerFormState {
  seatNumber: string;
  fullName: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "";
  cnic: string;
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CheckoutForm({ booking }: { booking: CheckoutBookingView }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("JAZZCASH");
  const [contactPhone, setContactPhone] = useState(
    booking.contactPhone ?? "03001234567",
  );
  const [contactEmail, setContactEmail] = useState(
    booking.contactEmail ?? "ali.khan@example.pk",
  );
  const [passengers, setPassengers] = useState<PassengerFormState[]>(() =>
    booking.heldSeats.map((seatNumber) => ({
      seatNumber,
      fullName: "",
      gender: "",
      cnic: "",
    })),
  );

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remainingMs = useMemo(() => {
    if (!booking.lockExpiresAt) return 0;
    return new Date(booking.lockExpiresAt).getTime() - now;
  }, [booking.lockExpiresAt, now]);

  const expired = remainingMs <= 0;

  function updatePassenger(
    seatNumber: string,
    patch: Partial<PassengerFormState>,
  ) {
    setPassengers((prev) =>
      prev.map((p) => (p.seatNumber === seatNumber ? { ...p, ...patch } : p)),
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (expired) {
      setError("Seat hold expired. Please select seats again.");
      return;
    }

    for (const p of passengers) {
      if (!p.fullName.trim()) {
        setError(`Enter full name for seat ${p.seatNumber}.`);
        return;
      }
      if (!p.gender) {
        setError(`Select gender for seat ${p.seatNumber}.`);
        return;
      }
      if (!isValidCnic(p.cnic)) {
        setError(`Invalid CNIC for seat ${p.seatNumber}. Use 00000-0000000-0.`);
        return;
      }
    }

    if (!isValidPkPhone(contactPhone)) {
      setError("Enter a valid mobile number (e.g. 03001234567).");
      return;
    }
    if (!isValidEmail(contactEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          contactPhone,
          contactEmail,
          paymentMethod,
          passengers: passengers.map((p) => ({
            seatNumber: p.seatNumber,
            fullName: p.fullName.trim(),
            gender: p.gender,
            cnic: p.cnic,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Payment failed.");
      }
      router.push(json.data.ticketUrl as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-teal-900/10 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs tracking-[0.18em] text-teal-800/60 uppercase">
                Booking draft
              </p>
              <h1 className="mt-1 font-heading text-2xl font-semibold text-teal-950">
                Passenger details
              </h1>
              <p className="mt-1 text-sm text-teal-900/65">
                PNR reserved: <strong>{booking.pnr}</strong>
              </p>
            </div>
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm",
                expired
                  ? "border border-red-200 bg-red-50 text-red-800"
                  : "border border-emerald-700/15 bg-emerald-50 text-emerald-950",
              )}
            >
              <Timer className="size-4" />
              {expired ? (
                <span>Hold expired</span>
              ) : (
                <span>
                  Hold expires in{" "}
                  <strong className="font-mono tabular-nums">
                    {formatCountdown(remainingMs)}
                  </strong>
                </span>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-teal-900/55">Operator</dt>
              <dd className="font-medium text-teal-950">
                {booking.trip.operatorName}
              </dd>
            </div>
            <div>
              <dt className="text-teal-900/55">Bus</dt>
              <dd className="font-medium text-teal-950">
                {booking.trip.busNumber}
              </dd>
            </div>
            <div>
              <dt className="text-teal-900/55">Route</dt>
              <dd className="font-medium text-teal-950">
                {booking.trip.originCity} → {booking.trip.destinationCity}
              </dd>
            </div>
            <div>
              <dt className="text-teal-900/55">Seats</dt>
              <dd className="font-medium text-teal-950">
                {booking.heldSeats.join(", ")}
              </dd>
            </div>
            <div>
              <dt className="text-teal-900/55">Departure</dt>
              <dd className="font-medium text-teal-950">
                {formatTime(booking.trip.departureTime)} ·{" "}
                {booking.boardingStop?.name}
              </dd>
            </div>
            <div>
              <dt className="text-teal-900/55">Arrival</dt>
              <dd className="font-medium text-teal-950">
                {formatTime(booking.trip.arrivalTime)} ·{" "}
                {booking.dropStop?.name}
              </dd>
            </div>
          </dl>
        </section>

        {passengers.map((passenger, index) => (
          <section
            key={passenger.seatNumber}
            className="rounded-2xl border border-teal-900/10 bg-white p-5 shadow-sm"
          >
            <h2 className="font-heading text-lg font-semibold text-teal-950">
              Passenger {index + 1} · Seat {passenger.seatNumber}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor={`name-${passenger.seatNumber}`}>Full name</Label>
                <Input
                  id={`name-${passenger.seatNumber}`}
                  value={passenger.fullName}
                  onChange={(e) =>
                    updatePassenger(passenger.seatNumber, {
                      fullName: e.target.value,
                    })
                  }
                  placeholder="As on CNIC"
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select
                  value={passenger.gender || undefined}
                  onValueChange={(v) =>
                    v &&
                    updatePassenger(passenger.seatNumber, {
                      gender: v as PassengerFormState["gender"],
                    })
                  }
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`cnic-${passenger.seatNumber}`}>CNIC</Label>
                <Input
                  id={`cnic-${passenger.seatNumber}`}
                  value={passenger.cnic}
                  onChange={(e) =>
                    updatePassenger(passenger.seatNumber, {
                      cnic: formatCnic(e.target.value),
                    })
                  }
                  placeholder="00000-0000000-0"
                  inputMode="numeric"
                  className="h-11 font-mono"
                  required
                />
              </div>
            </div>
          </section>
        ))}

        <section className="rounded-2xl border border-teal-900/10 bg-white p-5 shadow-sm">
          <h2 className="font-heading text-lg font-semibold text-teal-950">
            Primary contact
          </h2>
          <p className="mt-1 text-sm text-teal-900/65">
            E-ticket will be sent to this phone/email.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Mobile number</Label>
              <Input
                id="phone"
                value={contactPhone}
                onChange={(e) =>
                  setContactPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 11))
                }
                placeholder="03001234567"
                className="h-11 font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11"
                required
              />
            </div>
          </div>
        </section>
      </div>

      <aside className="h-fit space-y-4 lg:sticky lg:top-6">
        <section className="rounded-2xl border border-teal-900/10 bg-white p-5 shadow-sm">
          <h2 className="font-heading text-lg font-semibold text-teal-950">
            Payment method
          </h2>
          <div className="mt-4 space-y-2">
            <PaymentOption
              selected={paymentMethod === "JAZZCASH"}
              onSelect={() => setPaymentMethod("JAZZCASH")}
              icon={<Smartphone className="size-4" />}
              title="JazzCash"
              subtitle="Mobile wallet"
            />
            <PaymentOption
              selected={paymentMethod === "EASYPAISA"}
              onSelect={() => setPaymentMethod("EASYPAISA")}
              icon={<Wallet className="size-4" />}
              title="EasyPaisa"
              subtitle="Mobile wallet"
            />
            <PaymentOption
              selected={paymentMethod === "CARD"}
              onSelect={() => setPaymentMethod("CARD")}
              icon={<CreditCard className="size-4" />}
              title="Credit / Debit Card"
              subtitle="Stripe placeholder"
            />
          </div>

          <Separator className="my-4" />

          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs tracking-wide text-teal-900/55 uppercase">
                Total due
              </p>
              <p className="font-heading text-3xl font-semibold text-teal-800">
                {formatPkr(booking.totalPrice)}
              </p>
            </div>
            <p className="text-xs text-teal-900/55">
              {booking.heldSeats.length} × {formatPkr(booking.trip.basePrice)}
            </p>
          </div>

          {error ? (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={submitting || expired}
            className="mt-4 h-11 w-full bg-teal-800 text-white hover:bg-teal-700"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Processing…
              </>
            ) : (
              "Pay & confirm booking"
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="mt-2 w-full"
            render={<Link href="/search" />}
          >
            Cancel and search again
          </Button>
        </section>
      </aside>
    </form>
  );
}

function PaymentOption({
  selected,
  onSelect,
  icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition",
        selected
          ? "border-teal-800 bg-teal-800 text-white"
          : "border-teal-900/10 bg-teal-50/40 text-teal-950 hover:bg-teal-50",
      )}
    >
      <span
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-lg",
          selected ? "bg-white/15" : "bg-white",
        )}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span
          className={cn(
            "block text-xs",
            selected ? "text-teal-50/75" : "text-teal-900/55",
          )}
        >
          {subtitle}
        </span>
      </span>
      <span
        className={cn(
          "ml-auto size-4 rounded-full border-2",
          selected ? "border-white bg-white" : "border-teal-800/30",
        )}
      />
    </button>
  );
}
