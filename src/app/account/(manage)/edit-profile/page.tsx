"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

const TITLES = ["Mr", "Mrs", "Ms", "Miss"] as const;
const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

type Profile = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  title: string | null;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  passportNumber: string | null;
  nicNumber: string | null;
};

function pkLocalFromPhone(phone: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("92") && digits.length >= 12) return digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) return digits.slice(1);
  return digits;
}

function splitName(profile: Profile): { first: string; last: string } {
  if (profile.firstName || profile.lastName) {
    return {
      first: profile.firstName ?? "",
      last: profile.lastName ?? "",
    };
  }
  const parts = profile.name.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

function FieldCheck({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-emerald-500">
      <Check className="size-4" strokeWidth={2.5} />
    </span>
  );
}

export default function EditProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("Mr");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [country, setCountry] = useState("Pakistan");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [nicNumber, setNicNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(
    () => Array.from({ length: 31 }, (_, i) => String(i + 1)),
    [],
  );
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: current - 1920 + 1 }, (_, i) =>
      String(current - i),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/account/profile");
        const json = await res.json();
        if (!res.ok || !json.success) {
          router.replace("/auth/sign-in");
          return;
        }
        if (cancelled) return;
        const p = json.data as Profile;
        const names = splitName(p);
        setEmail(p.email);
        setTitle(p.title || "Mr");
        setFirstName(names.first);
        setLastName(names.last);
        setMobile(pkLocalFromPhone(p.phone));
        setCountry(p.country || "Pakistan");
        setState(p.state || "");
        setCity(p.city || "");
        setPassportNumber(p.passportNumber || "");
        setNicNumber(p.nicNumber || "");
        if (p.dateOfBirth) {
          const d = new Date(p.dateOfBirth);
          setDay(String(d.getUTCDate()));
          setMonth(String(d.getUTCMonth() + 1));
          setYear(String(d.getUTCFullYear()));
        }
      } catch {
        if (!cancelled) router.replace("/auth/sign-in");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          firstName,
          lastName,
          phone: mobile,
          day,
          month,
          year,
          country,
          state,
          city,
          passportNumber,
          nicNumber,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not update profile.");
      }
      setMessage("Profile updated.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[#0a2f6b]">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
        <form
          onSubmit={onSave}
          className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm sm:p-8"
        >
          <h1 className="font-heading text-2xl font-semibold text-[#1a2333] sm:text-3xl">
            Your Account
          </h1>

          <div className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <Field label="Title">
              <Select value={title} onValueChange={(v) => v && setTitle(v)}>
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TITLES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="First & Middle Name">
              <div className="relative">
                <Input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-11 pr-9"
                />
                <FieldCheck show={firstName.trim().length > 0} />
              </div>
            </Field>

            <Field label="Last Name">
              <div className="relative">
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-11 pr-9"
                />
                <FieldCheck show={lastName.trim().length > 0} />
              </div>
            </Field>

            <Field label="Email">
              <div className="relative">
                <Input
                  value={email}
                  disabled
                  className="h-11 bg-[#f8fafc] pr-9"
                />
                <FieldCheck show={email.includes("@")} />
              </div>
            </Field>

            <Field
              label="Mobile Number"
              hint="e.g. 03320234557"
            >
              <div className="flex gap-2">
                <div className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-input bg-[#f8fafc] px-2.5 text-sm text-[#0a2f6b]">
                  <span aria-hidden>🇵🇰</span>
                  PK +92
                </div>
                <div className="relative min-w-0 flex-1">
                  <Input
                    inputMode="numeric"
                    value={mobile}
                    onChange={(e) =>
                      setMobile(e.target.value.replace(/[^\d]/g, "").slice(0, 10))
                    }
                    className="h-11 pr-9"
                    placeholder="3312882767"
                  />
                  <FieldCheck show={mobile.length >= 10} />
                </div>
              </div>
            </Field>

            <Field label="Date of Birth">
              <div className="grid grid-cols-3 gap-2">
                <Select value={day} onValueChange={(v) => v && setDay(v)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={month} onValueChange={(v) => v && setMonth(v)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={year} onValueChange={(v) => v && setYear(v)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Field>

            <Field label="Country">
              <Select
                value={country}
                onValueChange={(v) => v && setCountry(v)}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pakistan">Pakistan</SelectItem>
                  <SelectItem value="United Arab Emirates">
                    United Arab Emirates
                  </SelectItem>
                  <SelectItem value="Saudi Arabia">Saudi Arabia</SelectItem>
                  <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="State">
              <div className="relative">
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="h-11 pr-9"
                  placeholder="Sindh"
                />
                <FieldCheck show={state.trim().length > 0} />
              </div>
            </Field>

            <Field label="City">
              <div className="relative">
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-11 pr-9"
                  placeholder="Karachi"
                />
                <FieldCheck show={city.trim().length > 0} />
              </div>
            </Field>

            <Field label="Passport Number">
              <div className="relative">
                <Input
                  value={passportNumber}
                  onChange={(e) =>
                    setPassportNumber(e.target.value.toUpperCase())
                  }
                  className="h-11 pr-9"
                  placeholder="AB1234567"
                />
                <FieldCheck show={passportNumber.trim().length >= 6} />
              </div>
            </Field>

            <Field label="NIC Number">
              <div className="relative">
                <Input
                  value={nicNumber}
                  onChange={(e) => setNicNumber(e.target.value)}
                  className="h-11 pr-9"
                  placeholder="42101-1234567-1"
                />
                <FieldCheck
                  show={nicNumber.replace(/\D/g, "").length === 13}
                />
              </div>
            </Field>
          </div>

          {error ? (
            <p className="mt-5 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="mt-5 text-sm text-emerald-700" role="status">
              {message}
            </p>
          ) : null}

          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="h-11 min-w-[160px] bg-[#0a2f6b] text-white hover:bg-[#08305f]"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
  );
}

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-[#6b7280]">{label}</Label>
      {children}
      {hint ? <p className="text-xs text-[#9ca3af]">{hint}</p> : null}
    </div>
  );
}
