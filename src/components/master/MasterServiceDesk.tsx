"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MasterCatalogEditor } from "@/components/master/MasterCatalogEditor";
import { formatRs } from "@/lib/booking-utils";
import { cn } from "@/lib/utils";
import type { ServiceKind } from "@/lib/service-desk";

type Inquiry = {
  id: string;
  country: string | null;
  name: string;
  phone: string;
  notes: string | null;
  status: string;
  createdAt: string;
  invoiceId: string | null;
  invoiceRef: string | null;
  invoiceStatus: string | null;
  invoiceAmount: number | null;
};

type Order = {
  id: string;
  inquiryId?: string | null;
  reference: string;
  country: string;
  productLabel: string;
  customerName: string;
  customerPhone: string;
  amountPkr: number;
  paymentStatus: string;
  paymentMethod: string | null;
  paidAt: string | null;
  createdAt: string;
};

type Finance = {
  paidRevenue: number;
  paidBookings: number;
  pendingValue: number;
  pendingBookings: number;
  queries: number;
  openQueries: number;
};

const TABS = [
  { id: "queries", label: "Queries" },
  { id: "bookings", label: "Paid bookings" },
  { id: "finance", label: "Finance" },
  { id: "catalog", label: "Catalog" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function invoiceUrl(id: string) {
  return `/api/master/services/orders/${id}/invoice`;
}

export function MasterServiceDesk({
  kind,
  title,
  subtitle,
}: {
  kind: ServiceKind;
  title: string;
  subtitle: string;
}) {
  const [tab, setTab] = useState<TabId>("queries");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finance, setFinance] = useState<Finance | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/master/services?kind=${kind}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not load desk.");
      }
      setFinance(json.data.finance);
      setInquiries(json.data.inquiries);
      setOrders(json.data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-[#0a2f6b] sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-[#0a2f6b]/60">{subtitle}</p>
      </div>

      {finance ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Open queries" value={String(finance.openQueries)} />
          <Stat label="Paid files" value={String(finance.paidBookings)} />
          <Stat label="Paid revenue" value={formatRs(finance.paidRevenue)} />
          <Stat label="Unpaid invoices" value={formatRs(finance.pendingValue)} />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-[#0a2f6b]/10 pb-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
              tab === item.id
                ? "bg-[#0a2f6b] text-white"
                : "bg-white text-[#0a2f6b] hover:bg-[#eef4fb]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "catalog" ? (
        <MasterCatalogEditor kind={kind} />
      ) : loading ? (
        <div className="flex h-40 items-center justify-center text-[#0a2f6b]">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : tab === "queries" ? (
        <QueriesTab kind={kind} inquiries={inquiries} onChanged={() => void load()} />
      ) : tab === "bookings" ? (
        <BookingsTab
          kind={kind}
          orders={orders.filter((o) => o.paymentStatus === "PAID")}
          onChanged={() => void load()}
        />
      ) : (
        <FinanceTab finance={finance} orders={orders} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#0a2f6b]/10 bg-white px-4 py-3">
      <p className="text-xs text-[#64748b]">{label}</p>
      <p className="mt-1 font-heading text-lg font-semibold text-[#0a2f6b]">
        {value}
      </p>
    </div>
  );
}

function QueriesTab({
  kind,
  inquiries,
  onChanged,
}: {
  kind: ServiceKind;
  inquiries: Inquiry[];
  onChanged: () => void;
}) {
  async function setStatus(id: string, status: string) {
    await fetch(`/api/master/services/inquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onChanged();
  }

  if (inquiries.length === 0) {
    return <p className="text-sm text-[#64748b]">No queries yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#0a2f6b]/10 bg-white">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-[#0a2f6b] text-xs text-white uppercase">
          <tr>
            <th className="px-3 py-2 font-medium">When</th>
            <th className="px-3 py-2 font-medium">Customer</th>
            <th className="px-3 py-2 font-medium">Country / product</th>
            <th className="px-3 py-2 font-medium">Notes</th>
            <th className="px-3 py-2 font-medium">Invoice</th>
            <th className="px-3 py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {inquiries.map((row) => (
            <tr key={row.id} className="border-t border-[#eef2f7] align-top">
              <td className="px-3 py-2 text-[#64748b]">
                {new Date(row.createdAt).toLocaleString("en-PK")}
              </td>
              <td className="px-3 py-2">
                <p className="font-medium text-[#1a2333]">{row.name}</p>
                <p className="font-mono text-xs text-[#64748b]">{row.phone}</p>
              </td>
              <td className="px-3 py-2">{row.country ?? "—"}</td>
              <td className="px-3 py-2 text-[#64748b]">{row.notes ?? "—"}</td>
              <td className="px-3 py-2">
                {row.invoiceId ? (
                  <div>
                    <p className="font-mono text-xs">{row.invoiceRef}</p>
                    <p
                      className={
                        row.invoiceStatus === "PAID"
                          ? "text-xs font-semibold text-emerald-700"
                          : "text-xs font-semibold text-amber-700"
                      }
                    >
                      {row.invoiceStatus === "PAID" ? "PAID" : "UNPAID"}
                      {row.invoiceAmount != null ? ` · ${formatRs(row.invoiceAmount)}` : ""}
                    </p>
                  </div>
                ) : (
                  <span className="text-[#64748b]">No invoice</span>
                )}
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-2 text-xs"
                    onClick={() => void setStatus(row.id, "CONTACTED")}
                  >
                    Contacted
                  </Button>
                  {row.invoiceId ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 px-2 text-xs"
                      onClick={() => window.open(invoiceUrl(row.invoiceId!), "_blank")}
                    >
                      {row.invoiceStatus === "PAID"
                        ? "Download paid invoice"
                        : "Download invoice"}
                    </Button>
                  ) : null}
                  {row.invoiceStatus === "PAID" ? null : (
                    <InvoiceActions kind={kind} inquiry={row} onDone={onChanged} />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InvoiceActions({
  kind,
  inquiry,
  onDone,
}: {
  kind: ServiceKind;
  inquiry: Inquiry;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(!inquiry.invoiceId);
  const [amount, setAmount] = useState(
    inquiry.invoiceAmount != null ? String(inquiry.invoiceAmount) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/master/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          inquiryId: inquiry.id,
          country: inquiry.country || kind,
          productLabel: inquiry.country || kind,
          customerName: inquiry.name,
          customerPhone: inquiry.phone,
          amountPkr: Number(amount),
          markPaid: false,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not generate invoice.");
      }
      window.open(invoiceUrl(json.data.id), "_blank");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate invoice.");
    } finally {
      setSaving(false);
    }
  }

  async function recordPaid() {
    if (!inquiry.invoiceId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/master/services/orders/${inquiry.invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markPaid: true,
          paymentMethod: "DESK",
          amountPkr: Number(amount) || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not record paid.");
      }
      window.open(invoiceUrl(inquiry.invoiceId), "_blank");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record paid.");
    } finally {
      setSaving(false);
    }
  }

  if (!open && inquiry.invoiceId) {
    return (
      <Button
        type="button"
        className="h-8 bg-[#0a2f6b] px-2 text-xs text-white hover:bg-[#08305f]"
        onClick={() => setOpen(true)}
      >
        Record paid
      </Button>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Input
          className="h-8 w-28"
          placeholder="PKR"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {inquiry.invoiceId ? (
          <Button
            type="button"
            disabled={saving}
            className="h-8 bg-[#0a2f6b] px-2 text-xs text-white"
            onClick={() => void recordPaid()}
          >
            Record paid
          </Button>
        ) : (
          <Button
            type="button"
            disabled={saving}
            className="h-8 bg-[#0a2f6b] px-2 text-xs text-white"
            onClick={() => void generate()}
          >
            Generate invoice
          </Button>
        )}
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

function BookingsTab({
  kind,
  orders,
  onChanged,
}: {
  kind: ServiceKind;
  orders: Order[];
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function record(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/master/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          country,
          productLabel: country,
          customerName: name,
          customerPhone: phone,
          amountPkr: Number(amount),
          markPaid: true,
          paymentMethod: "DESK",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not record.");
      }
      setName("");
      setPhone("");
      setCountry("");
      setAmount("");
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => void record(e)}
        className="grid gap-3 rounded-xl border border-[#0a2f6b]/10 bg-white p-4 sm:grid-cols-5"
      >
        <div className="space-y-1">
          <Label>Customer</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Mobile</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Country / product</Label>
          <Input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label>Amount PKR</Label>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="flex items-end">
          <Button
            type="submit"
            disabled={saving}
            className="h-10 w-full bg-[#0a2f6b] text-white"
          >
            Record paid
          </Button>
        </div>
      </form>

      {orders.length === 0 ? (
        <p className="text-sm text-[#64748b]">No paid bookings yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#0a2f6b]/10 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#0a2f6b] text-xs text-white uppercase">
              <tr>
                <th className="px-3 py-2 font-medium">Ref</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Paid</th>
                <th className="px-3 py-2 font-medium">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((row) => (
                <tr key={row.id} className="border-t border-[#eef2f7]">
                  <td className="px-3 py-2 font-mono text-xs">{row.reference}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{row.customerName}</p>
                    <p className="font-mono text-xs text-[#64748b]">
                      {row.customerPhone}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    {row.country}
                    {row.productLabel !== row.country
                      ? ` · ${row.productLabel}`
                      : ""}
                  </td>
                  <td className="px-3 py-2 font-semibold">
                    {formatRs(row.amountPkr)}
                  </td>
                  <td className="px-3 py-2 text-[#64748b]">
                    {row.paidAt
                      ? new Date(row.paidAt).toLocaleString("en-PK")
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 px-2 text-xs"
                      onClick={() => window.open(invoiceUrl(row.id), "_blank")}
                    >
                      Download paid invoice
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FinanceTab({
  finance,
  orders,
}: {
  finance: Finance | null;
  orders: Order[];
}) {
  const paid = orders.filter((o) => o.paymentStatus === "PAID");
  const unpaid = orders.filter((o) => o.paymentStatus === "PENDING");
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#0a2f6b]/65">
        These totals are for this service only. Bus ticket revenue stays on
        Control centre / Ops.
      </p>
      {finance ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Paid revenue" value={formatRs(finance.paidRevenue)} />
          <Stat label="Paid files" value={String(finance.paidBookings)} />
          <Stat
            label="Unpaid invoices"
            value={`${finance.pendingBookings} · ${formatRs(finance.pendingValue)}`}
          />
        </div>
      ) : null}
      {unpaid.length > 0 ? (
        <ul className="divide-y divide-[#eef2f7] rounded-xl border border-amber-200 bg-amber-50">
          {unpaid.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <span>
                {row.reference} · UNPAID · {row.customerName} · {row.country}
              </span>
              <span className="font-semibold">{formatRs(row.amountPkr)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {paid.length === 0 ? (
        <p className="text-sm text-[#64748b]">No paid finance rows yet.</p>
      ) : (
        <ul className="divide-y divide-[#eef2f7] rounded-xl border border-[#0a2f6b]/10 bg-white">
          {paid.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <span>
                {row.reference} · PAID · {row.customerName} · {row.country}
              </span>
              <span className="font-semibold">{formatRs(row.amountPkr)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
