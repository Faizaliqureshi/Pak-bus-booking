"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
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
  formatPkPhone,
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
    photos?: string[];
    features?: string[];
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

const PAYMENT_TABS: {
  id: PaymentMethod;
  title: string;
  subtitle: string;
  icon: ReactNode;
}[] = [
  {
    id: "JAZZCASH",
    title: "JazzCash",
    subtitle: "Mobile account + OTP",
    icon: <Smartphone className="size-4" />,
  },
  {
    id: "EASYPAISA",
    title: "EasyPaisa",
    subtitle: "Push payment prompt",
    icon: <Wallet className="size-4" />,
  },
  {
    id: "CARD",
    title: "Debit / Credit Card",
    subtitle: "Visa · Mastercard",
    icon: <CreditCard className="size-4" />,
  },
  {
    id: "ONEBILL",
    title: "1BILL / Counter",
    subtitle: "Pay at retailer",
    icon: <Building2 className="size-4" />,
  },
];

export function CheckoutForm({ booking }: { booking: CheckoutBookingView }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("JAZZCASH");
  const [walletAccount, setWalletAccount] = useState("");
  const [contactPhone, setContactPhone] = useState(
    formatPkPhone(booking.contactPhone ?? "03001234567"),
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
      setError("Enter a valid mobile number (e.g. 0300-1234567).");
      return;
    }
    if (!isValidEmail(contactEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (
      (paymentMethod === "JAZZCASH" || paymentMethod === "EASYPAISA") &&
      !isValidPkPhone(walletAccount || contactPhone)
    ) {
      setError("Enter a valid JazzCash / EasyPaisa mobile account number.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          contactPhone: contactPhone.replace(/[\s-]/g, ""),
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
        <section className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs tracking-[0.18em] text-[#0a2f6b]/55 uppercase">
                Booking draft
              </p>
              <h1 className="mt-1 font-heading text-2xl font-semibold text-[#0a2f6b]">
                Passenger details
              </h1>
              <p className="mt-1 text-sm text-[#0a2f6b]/65">
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
              <dt className="text-[#0a2f6b]/55">Operator</dt>
              <dd className="font-medium text-[#0a2f6b]">
                {booking.trip.operatorName}
              </dd>
            </div>
            <div>
              <dt className="text-[#0a2f6b]/55">Bus</dt>
              <dd className="font-medium text-[#0a2f6b]">
                {booking.trip.busNumber}
              </dd>
            </div>
            {booking.trip.features && booking.trip.features.length > 0 ? (
              <div className="sm:col-span-2">
                <dt className="text-[#0a2f6b]/55">Facilities</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {booking.trip.features.map((feature) => (
                    <span
                      key={feature}
                      className="rounded-full border border-[#d7dee8] bg-[#f8fafc] px-2.5 py-0.5 text-xs text-[#0a2f6b]"
                    >
                      {feature}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
            {booking.trip.photos && booking.trip.photos.length > 0 ? (
              <div className="sm:col-span-2">
                <dt className="mb-1.5 text-[#0a2f6b]/55">Bus pictures</dt>
                <dd className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {booking.trip.photos.map((src) => (
                    <div
                      key={src}
                      className="aspect-[4/3] overflow-hidden rounded-lg border border-[#e5e7eb]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="size-full object-cover" />
                    </div>
                  ))}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[#0a2f6b]/55">Route</dt>
              <dd className="font-medium text-[#0a2f6b]">
                {booking.trip.originCity} → {booking.trip.destinationCity}
              </dd>
            </div>
            <div>
              <dt className="text-[#0a2f6b]/55">Seats</dt>
              <dd className="font-medium text-[#0a2f6b]">
                {booking.heldSeats.join(", ")}
              </dd>
            </div>
            <div>
              <dt className="text-[#0a2f6b]/55">Departure</dt>
              <dd className="font-medium text-[#0a2f6b]">
                {formatTime(booking.trip.departureTime)} ·{" "}
                {booking.boardingStop?.name}
              </dd>
            </div>
            <div>
              <dt className="text-[#0a2f6b]/55">Arrival</dt>
              <dd className="font-medium text-[#0a2f6b]">
                {formatTime(booking.trip.arrivalTime)} ·{" "}
                {booking.dropStop?.name}
              </dd>
            </div>
          </dl>
        </section>

        {passengers.map((passenger, index) => (
          <section
            key={passenger.seatNumber}
            className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm"
          >
            <h2 className="font-heading text-lg font-semibold text-[#0a2f6b]">
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

        <section className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm">
          <h2 className="font-heading text-lg font-semibold text-[#0a2f6b]">
            Primary contact
          </h2>
          <p className="mt-1 text-sm text-[#0a2f6b]/65">
            E-ticket will be sent to this phone/email.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Mobile number</Label>
              <Input
                id="phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(formatPkPhone(e.target.value))}
                placeholder="0300-1234567"
                className="h-11 font-mono"
                inputMode="numeric"
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
        <section className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm">
          <h2 className="font-heading text-lg font-semibold text-[#0a2f6b]">
            Local payment
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {PAYMENT_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPaymentMethod(tab.id)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition",
                  paymentMethod === tab.id
                    ? "border-[#F5A623] bg-[#fff8e8] text-[#0a2f6b]"
                    : "border-[#0a2f6b]/10 bg-[#f8fafc] text-[#0a2f6b] hover:bg-[#eef2f8]",
                )}
              >
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                  {tab.icon}
                  {tab.title}
                </span>
                <span className="text-[11px] text-[#0a2f6b]/55">{tab.subtitle}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-[#0a2f6b]/10 bg-[#f8fafc] p-4 text-sm text-[#0a2f6b]/75">
            {paymentMethod === "JAZZCASH" ? (
              <div className="space-y-3">
                <Label htmlFor="jazz-account">JazzCash mobile account</Label>
                <Input
                  id="jazz-account"
                  value={walletAccount}
                  onChange={(e) => setWalletAccount(formatPkPhone(e.target.value))}
                  placeholder="0300-1234567"
                  className="h-11 font-mono bg-white"
                  inputMode="numeric"
                />
                <p className="text-xs leading-relaxed">
                  You will receive a JazzCash OTP / payment request. Approve it
                  in the JazzCash app to confirm this TicketPass booking.
                </p>
              </div>
            ) : null}

            {paymentMethod === "EASYPAISA" ? (
              <div className="space-y-3">
                <Label htmlFor="ep-account">EasyPaisa mobile account</Label>
                <Input
                  id="ep-account"
                  value={walletAccount}
                  onChange={(e) => setWalletAccount(formatPkPhone(e.target.value))}
                  placeholder="0300-1234567"
                  className="h-11 font-mono bg-white"
                  inputMode="numeric"
                />
                <p className="text-xs leading-relaxed">
                  EasyPaisa will send a push prompt to your phone. Open the app
                  and accept the payment to complete checkout.
                </p>
              </div>
            ) : null}

            {paymentMethod === "CARD" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-md bg-[#1a1f71] px-2.5 py-1 text-[11px] font-bold text-white">
                    VISA
                  </span>
                  <span className="rounded-md bg-[#eb001b] px-2.5 py-1 text-[11px] font-bold text-white">
                    Mastercard
                  </span>
                </div>
                <p className="text-xs leading-relaxed">
                  Debit and credit cards are accepted. Card capture is simulated
                  in this demo — your booking will confirm after you continue.
                </p>
              </div>
            ) : null}

            {paymentMethod === "ONEBILL" ? (
              <div className="space-y-2 text-xs leading-relaxed">
                <p className="font-semibold text-[#0a2f6b]">
                  1BILL voucher / Pay at Counter
                </p>
                <p>
                  After confirmation you will receive a 1BILL consumer number.
                  Pay at any JazzCash / EasyPaisa retailer, bank branch, or
                  partner counter before your seat hold expires.
                </p>
                <p>
                  Keep the voucher SMS with you — conductors may ask for payment
                  proof with your PNR.
                </p>
              </div>
            ) : null}
          </div>

          <Separator className="my-4" />

          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs tracking-wide text-[#0a2f6b]/55 uppercase">
                Total due
              </p>
              <p className="font-heading text-3xl font-semibold text-[#0a2f6b]">
                {formatPkr(booking.totalPrice)}
              </p>
            </div>
            <p className="text-xs text-[#0a2f6b]/55">
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
            data-testid="pay-confirm-btn"
            disabled={submitting || expired}
            className="mt-4 h-11 w-full bg-[#F5A623] text-[#0A2F6B] hover:bg-[#e09415]"
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
