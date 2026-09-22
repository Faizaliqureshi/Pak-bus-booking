"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  BusFront,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { busTypeLabel, formatPkr } from "@/lib/booking-utils";
import { cn } from "@/lib/utils";

type OverviewData = {
  summary: {
    totalStaff: number;
    admins: number;
    partners: number;
    conductors: number;
    fleetBuses: number;
    fleetSeats: number;
    bookingsPaid: number;
    bookingsPending: number;
    bookingsFailed: number;
    bookingsRefunded: number;
    bookingsTotal: number;
  };
  finance: {
    paidRevenue: number;
    paidBookings: number;
    pendingValue: number;
    pendingBookings: number;
    walletAccounts: number;
    walletBalancesTotal: number;
  };
  admins: Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    createdAt: string;
    partnersCount: number;
    partners: Array<{ id: string; name: string; email: string }>;
  }>;
  partners: Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    createdAt: string;
    createdBy: { id: string; name: string; email: string; role: string } | null;
    busCount: number;
    conductorsCount: number;
    buses: Array<{
      id: string;
      busNumber: string;
      layoutType: string;
      totalSeats: number;
      tripsCount: number;
    }>;
    conductors: Array<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
    }>;
  }>;
  conductors: Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    createdAt: string;
    createdBy: { id: string; name: string; email: string; role: string } | null;
  }>;
  fleet: Array<{
    id: string;
    busNumber: string;
    layoutType: string;
    totalSeats: number;
    tripsCount: number;
    createdAt: string;
    operator: { id: string; name: string; email: string };
  }>;
  recentBookings: Array<{
    id: string;
    pnr: string;
    totalPrice: number;
    paymentStatus: string;
    paymentMethod: string | null;
    createdAt: string;
    passenger: { name: string; email: string };
    operatorName: string;
    busNumber: string;
    route: string;
    departureTime: string;
  }>;
};

type StaffRole = "ADMIN" | "PARTNER";

type CreatedCreds = {
  roleLabel: string;
  email: string;
  temporaryPassword: string;
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "create", label: "Create staff" },
  { id: "staff", label: "Staff directory" },
  { id: "fleet", label: "Fleet" },
  { id: "bookings", label: "Bookings" },
  { id: "finance", label: "Finance" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function MasterHomePage() {
  const [tab, setTab] = useState<TabId>("overview");
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [role, setRole] = useState<StaffRole>("ADMIN");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [creds, setCreds] = useState<CreatedCreds | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/master/overview");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load overview.");
      }
      setData(json.data as OverviewData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setCreds(null);
    try {
      const res = await fetch("/api/master/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          name,
          email,
          phone,
          password: password || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to create account.");
      }
      setCreds({
        roleLabel: json.data.roleLabel,
        email: json.data.email,
        temporaryPassword: json.data.temporaryPassword,
      });
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      await load();
      setTab("staff");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setSaving(false);
    }
  }

  async function copyCreds() {
    if (!creds) return;
    await navigator.clipboard.writeText(
      `${creds.roleLabel}\nEmail: ${creds.email}\nPassword: ${creds.temporaryPassword}\nLogin: /staff/login`,
    );
  }

  if (loading && !data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-[#0a2f6b]" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        {error}
        <Button className="mt-4" variant="outline" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const { summary, finance } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">
            Master control centre
          </h1>
          <p className="mt-1 text-sm text-[#0a2f6b]/65">
            Unified platform portal — staff, fleet, routes, bookings, and
            finance. Partners use /partner/fleet; passengers use Sign In.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void load()}
          className="h-10"
        >
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-[#0a2f6b]/10 pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-t-lg px-3 py-2 text-sm font-medium transition",
              tab === t.id
                ? "bg-white text-[#0a2f6b] shadow-sm ring-1 ring-[#0a2f6b]/10"
                : "text-[#0a2f6b]/60 hover:text-[#0a2f6b]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              icon={<Users className="size-4" />}
              label="Total staff"
              value={String(summary.totalStaff)}
              hint={`${summary.admins} platform staff · ${summary.partners} partners`}
            />
            <Kpi
              icon={<BusFront className="size-4" />}
              label="Registered fleet"
              value={String(summary.fleetBuses)}
              hint={`${summary.fleetSeats} seats across all coaches`}
            />
            <Kpi
              icon={<Wallet className="size-4" />}
              label="Paid revenue"
              value={formatPkr(finance.paidRevenue)}
              hint={`${finance.paidBookings} paid bookings`}
            />
            <Kpi
              label="Bookings"
              value={String(summary.bookingsTotal)}
              hint={`${summary.bookingsPaid} paid · ${summary.bookingsPending} pending`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Platform staff">
              {data.admins.length === 0 ? (
                <Empty>No platform staff yet.</Empty>
              ) : (
                <ul className="divide-y divide-[#0a2f6b]/8">
                  {data.admins.map((a) => (
                    <li key={a.id} className="px-4 py-3 text-sm">
                      <p className="font-semibold">{a.name}</p>
                      <p className="text-[#0a2f6b]/60">{a.email}</p>
                      <p className="mt-1 text-xs text-[#0a2f6b]/50">
                        {a.partnersCount} partner
                        {a.partnersCount === 1 ? "" : "s"} created
                        {a.partners.length
                          ? `: ${a.partners.map((p) => p.name).join(", ")}`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Partners">
              {data.partners.length === 0 ? (
                <Empty>No partners yet.</Empty>
              ) : (
                <ul className="divide-y divide-[#0a2f6b]/8">
                  {data.partners.map((p) => (
                    <li key={p.id} className="px-4 py-3 text-sm">
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-[#0a2f6b]/60">{p.email}</p>
                      <p className="mt-1 text-xs text-[#0a2f6b]/50">
                        Fleet: {p.busCount} bus
                        {p.busCount === 1 ? "" : "es"}
                        {p.buses.length
                          ? ` (${p.buses.map((b) => b.busNumber).join(", ")})`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      ) : null}

      {tab === "create" ? (
        <div className="space-y-4">
          <form
            onSubmit={onCreate}
            className="grid gap-4 rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-6"
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Account type</Label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["ADMIN", "Platform staff"],
                    ["PARTNER", "Partner"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition",
                      role === value
                        ? "bg-[#0a2f6b] text-white"
                        : "bg-[#f3f6fb] text-[#0a2f6b] hover:bg-[#e8eef8]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#0a2f6b]/55">
                Platform staff use Master. Partners manage fleet and create
                their own conductors.
              </p>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>
                {role === "PARTNER" ? "Company / operator name" : "Full name"}
              </Label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone (optional)</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Password (optional — auto-generated if blank)</Label>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                placeholder="Leave blank to auto-generate"
              />
            </div>
            {formError ? (
              <p className="text-sm text-red-700 sm:col-span-2">{formError}</p>
            ) : null}
            <div className="sm:col-span-2">
              <Button
                type="submit"
                disabled={saving}
                className="h-11 bg-[#0a2f6b] text-white hover:bg-[#08305f]"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="size-4" />
                    Create {role === "ADMIN" ? "platform staff" : "partner"}
                  </>
                )}
              </Button>
            </div>
          </form>

          {creds ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="font-semibold text-emerald-900">
                Share these {creds.roleLabel} credentials (shown once)
              </p>
              <p className="mt-2 font-mono text-sm text-emerald-950">
                Email: {creds.email}
                <br />
                Password: {creds.temporaryPassword}
                <br />
                Login: /staff/login
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => void copyCreds()}
              >
                <Copy className="size-4" />
                Copy
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "staff" ? (
        <div className="space-y-4">
          <StaffTable
            title={`Platform staff (${data.admins.length})`}
            rows={data.admins.map((a) => ({
              id: a.id,
              name: a.name,
              email: a.email,
              phone: a.phone,
              meta: `${a.partnersCount} partners`,
              createdAt: a.createdAt,
            }))}
          />
          <StaffTable
            title={`Partners (${data.partners.length})`}
            rows={data.partners.map((p) => ({
              id: p.id,
              name: p.name,
              email: p.email,
              phone: p.phone,
              meta: `${p.busCount} buses · via ${p.createdBy?.name ?? "—"}`,
              createdAt: p.createdAt,
            }))}
          />
        </div>
      ) : null}

      {tab === "fleet" ? (
        <Panel title={`Registered fleet (${data.fleet.length})`}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f3f6fb] text-[#0a2f6b]/70">
                <tr>
                  <th className="px-4 py-3">Bus</th>
                  <th className="px-4 py-3">Partner</th>
                  <th className="px-4 py-3">Layout</th>
                  <th className="px-4 py-3">Seats</th>
                  <th className="px-4 py-3">Trips</th>
                </tr>
              </thead>
              <tbody>
                {data.fleet.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-[#0a2f6b]/50"
                    >
                      No buses registered.
                    </td>
                  </tr>
                ) : (
                  data.fleet.map((b) => (
                    <tr key={b.id} className="border-t border-[#0a2f6b]/8">
                      <td className="px-4 py-3 font-medium">{b.busNumber}</td>
                      <td className="px-4 py-3">{b.operator.name}</td>
                      <td className="px-4 py-3">{busTypeLabel(b.layoutType)}</td>
                      <td className="px-4 py-3">{b.totalSeats}</td>
                      <td className="px-4 py-3">{b.tripsCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {tab === "bookings" ? (
        <Panel title={`Recent bookings (${data.recentBookings.length})`}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f3f6fb] text-[#0a2f6b]/70">
                <tr>
                  <th className="px-4 py-3">PNR</th>
                  <th className="px-4 py-3">Passenger</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Operator</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.recentBookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-[#0a2f6b]/50"
                    >
                      No bookings yet.
                    </td>
                  </tr>
                ) : (
                  data.recentBookings.map((b) => (
                    <tr key={b.id} className="border-t border-[#0a2f6b]/8">
                      <td className="px-4 py-3 font-mono text-xs">{b.pnr}</td>
                      <td className="px-4 py-3">{b.passenger.name}</td>
                      <td className="px-4 py-3">{b.route}</td>
                      <td className="px-4 py-3">
                        {b.operatorName}
                        <span className="block text-xs text-[#0a2f6b]/50">
                          {b.busNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={b.paymentStatus} />
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatPkr(b.totalPrice)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="border-t border-[#0a2f6b]/8 px-4 py-3 text-xs text-[#0a2f6b]/55">
            Totals — Paid: {summary.bookingsPaid} · Pending:{" "}
            {summary.bookingsPending} · Failed: {summary.bookingsFailed} ·
            Refunded: {summary.bookingsRefunded}
          </p>
        </Panel>
      ) : null}

      {tab === "finance" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Kpi
            label="Collected revenue"
            value={formatPkr(finance.paidRevenue)}
            hint={`${finance.paidBookings} settled bookings`}
          />
          <Kpi
            label="Pending checkout value"
            value={formatPkr(finance.pendingValue)}
            hint={`${finance.pendingBookings} open holds / unpaid drafts`}
          />
          <Kpi
            label="Passenger wallets"
            value={formatPkr(finance.walletBalancesTotal)}
            hint={`${finance.walletAccounts} wallet accounts`}
          />
          <PartnerPayoutForm partners={data.partners} />
          <Panel title="Accounts summary" className="sm:col-span-2 lg:col-span-3">
            <dl className="grid gap-3 px-4 py-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[#0a2f6b]/55">Staff payroll accounts</dt>
                <dd className="font-semibold">
                  {summary.totalStaff} active staff logins
                </dd>
              </div>
              <div>
                <dt className="text-[#0a2f6b]/55">Partner commercial accounts</dt>
                <dd className="font-semibold">
                  {summary.partners} operators with fleet access
                </dd>
              </div>
              <div>
                <dt className="text-[#0a2f6b]/55">Booking ledger</dt>
                <dd className="font-semibold">
                  {summary.bookingsTotal} records · {formatPkr(finance.paidRevenue)}{" "}
                  realised
                </dd>
              </div>
              <div>
                <dt className="text-[#0a2f6b]/55">Refunds / failures</dt>
                <dd className="font-semibold">
                  {summary.bookingsRefunded} refunded · {summary.bookingsFailed}{" "}
                  failed
                </dd>
              </div>
            </dl>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[#0a2f6b]/55 uppercase">
        {icon}
        {label}
      </div>
      <p className="mt-2 font-heading text-2xl font-semibold text-[#0a2f6b]">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[#0a2f6b]/55">{hint}</p> : null}
    </div>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[#0a2f6b]/10 bg-white shadow-sm",
        className,
      )}
    >
      <div className="border-b border-[#0a2f6b]/10 px-4 py-3">
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 py-8 text-center text-sm text-[#0a2f6b]/50">{children}</p>
  );
}

function StaffTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    meta: string;
    createdAt: string;
  }>;
}) {
  return (
    <Panel title={title}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f3f6fb] text-[#0a2f6b]/70">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-[#0a2f6b]/50"
                >
                  None yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-[#0a2f6b]/8">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">
                    {r.email}
                    {r.phone ? (
                      <span className="block text-xs text-[#0a2f6b]/50">
                        {r.phone}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-[#0a2f6b]/70">{r.meta}</td>
                  <td className="px-4 py-3">
                    {new Date(r.createdAt).toLocaleDateString("en-PK")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function PartnerPayoutForm({
  partners,
}: {
  partners: OverviewData["partners"];
}) {
  const [operatorId, setOperatorId] = useState(partners[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/master/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorId,
          amount: Number(amount),
          note: note || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not record payout.");
      }
      setMessage(`Cleared ${json.data.reference} to partner.`);
      setAmount("");
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-4 shadow-sm sm:col-span-2 lg:col-span-3"
    >
      <p className="text-sm font-semibold text-[#0a2f6b]">
        Record partner payout
      </p>
      <p className="mt-1 text-xs text-[#0a2f6b]/55">
        Cleared transfers appear as received income on the partner Finance desk.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <select
          value={operatorId}
          onChange={(e) => setOperatorId(e.target.value)}
          className="h-10 rounded-md border border-[#d7dee8] bg-white px-3 text-sm"
        >
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Input
          type="number"
          min={1}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount PKR"
          className="h-10"
        />
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="h-10"
        />
        <Button
          type="submit"
          disabled={saving || !operatorId}
          className="h-10 bg-[#0a2f6b] text-white hover:bg-[#08305f]"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : "Mark cleared"}
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}
    </form>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "PAID"
      ? "bg-emerald-50 text-emerald-800"
      : status === "PENDING"
        ? "bg-amber-50 text-amber-900"
        : status === "REFUNDED"
          ? "bg-sky-50 text-sky-900"
          : "bg-red-50 text-red-800";
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", tone)}>
      {status}
    </span>
  );
}
