"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type KeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

export default function PartnerApiPage() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [savedWebhookUrl, setSavedWebhookUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [keysRes, hookRes] = await Promise.all([
        fetch("/api/partner/api-keys"),
        fetch("/api/partner/webhook"),
      ]);
      const keysJson = await keysRes.json();
      const hookJson = await hookRes.json();
      if (keysJson.success) setKeys(keysJson.data);
      if (hookJson.success && hookJson.data?.url) {
        setWebhookUrl(hookJson.data.url);
        setSavedWebhookUrl(hookJson.data.url);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function mintKey() {
    setBusy(true);
    setError(null);
    setMessage(null);
    setRevealedKey(null);
    try {
      const res = await fetch("/api/partner/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Live key" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not create key.");
      }
      setRevealedKey(json.data.apiKey);
      setMessage(json.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeKey(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/partner/api-keys/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not revoke key.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveWebhook(rotateSecret: boolean) {
    setBusy(true);
    setError(null);
    setMessage(null);
    setRevealedSecret(null);
    try {
      const res = await fetch("/api/partner/webhook", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl, rotateSecret }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not save webhook.");
      }
      setSavedWebhookUrl(json.data.url);
      if (json.data.secret) setRevealedSecret(json.data.secret);
      setMessage(json.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
    setMessage("Copied to clipboard.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Partner API</h1>
        <p className="mt-1 text-sm text-[#0a2f6b]/65">
          Connect your own booking system. Create coaches, publish live
          routes, and push seats with an API key. TicketPass POSTs paid
          bookings to your webhook.
        </p>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      {revealedKey ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-medium text-amber-950">New API key (shown once)</p>
          <code className="mt-2 block break-all text-amber-950">
            {revealedKey}
          </code>
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-9"
            onClick={() => void copyText(revealedKey)}
          >
            <Copy className="size-4" />
            Copy key
          </Button>
        </div>
      ) : null}

      {revealedSecret ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-medium text-amber-950">
            Webhook HMAC secret (shown once)
          </p>
          <code className="mt-2 block break-all text-amber-950">
            {revealedSecret}
          </code>
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-9"
            onClick={() => void copyText(revealedSecret)}
          >
            <Copy className="size-4" />
            Copy secret
          </Button>
        </div>
      ) : null}

      <section className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">Live API keys</h2>
            <p className="text-xs text-[#0a2f6b]/55">
              Header: <code>Authorization: Bearer tp_live_…</code>
            </p>
          </div>
          <Button
            type="button"
            disabled={busy}
            onClick={() => void mintKey()}
            className="h-10 bg-[#0a2f6b] text-white hover:bg-[#08305f]"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <KeyRound className="size-4" />
                Generate key
              </>
            )}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[#0a2f6b]/70">
                <tr>
                  <th className="py-2 pr-4">Prefix</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Last used</th>
                  <th className="py-2"> </th>
                </tr>
              </thead>
              <tbody>
                {keys.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-[#0a2f6b]/50">
                      No keys yet. Generate one to connect your GDS.
                    </td>
                  </tr>
                ) : (
                  keys.map((k) => (
                    <tr key={k.id} className="border-t border-[#0a2f6b]/8">
                      <td className="py-3 pr-4 font-mono">{k.keyPrefix}…</td>
                      <td className="py-3 pr-4">
                        {k.isActive ? "Active" : "Revoked"}
                      </td>
                      <td className="py-3 pr-4 text-[#0a2f6b]/65">
                        {k.lastUsedAt
                          ? new Date(k.lastUsedAt).toLocaleString("en-PK")
                          : "Never"}
                      </td>
                      <td className="py-3 text-right">
                        {k.isActive ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 text-red-700"
                            disabled={busy}
                            onClick={() => void revokeKey(k.id)}
                          >
                            <Trash2 className="size-4" />
                            Revoke
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm">
        <h2 className="font-heading text-lg font-semibold">
          Create a bus and go live
        </h2>
        <p className="mt-1 text-xs text-[#0a2f6b]/55">
          Auth header: <code>Authorization: Bearer tp_live_…</code>. A live
          departure is searchable on TicketPass the same minute it is posted.
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[#0a2f6b]/80">
          <li>
            <code>POST /api/v1/partner/buses</code> —{" "}
            <code>
              {`{ "busNumber": "DAEWOO-901", "layoutType": "2x2", "totalSeats": 40, "externalId": "veh-901" }`}
            </code>
          </li>
          <li>
            <code>POST /api/v1/partner/live</code> — one call creates the
            coach if needed, the corridor, and a bookable departure.
          </li>
        </ol>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-[#0a2f6b] p-4 text-[11px] leading-relaxed text-white">
          {`POST /api/v1/partner/live
{
  "bus": { "busNumber": "DAEWOO-901", "layoutType": "2x2", "totalSeats": 40 },
  "route": {
    "name": "Karachi to Lahore Express",
    "originCity": "Karachi",
    "destinationCity": "Lahore",
    "distanceKm": 1200,
    "baseFare": 4500
  },
  "trip": {
    "departureTime": "2026-09-20T10:00:00.000Z",
    "arrivalTime": "2026-09-21T04:00:00.000Z",
    "basePrice": 4500
  }
}`}
        </pre>
        <p className="mt-3 text-xs text-[#0a2f6b]/55">
          You can also publish from the portal:{" "}
          <a href="/partner/routes" className="font-medium underline">
            Live routes
          </a>
          .
        </p>
      </section>

      <section className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm">
        <h2 className="font-heading text-lg font-semibold">Booking webhook</h2>
        <p className="mt-1 text-xs text-[#0a2f6b]/55">
          TicketPass POSTs <code>booking.paid</code> with header{" "}
          <code>x-ticketpass-signature</code> (HMAC-SHA256 of the raw JSON).
        </p>
        <div className="mt-4 space-y-2">
          <Label>HTTPS callback URL</Label>
          <Input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://gds.example.com/hooks/ticketpass"
            className="h-11"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={busy}
            onClick={() => void saveWebhook(false)}
            className="h-10 bg-[#0a2f6b] text-white hover:bg-[#08305f]"
          >
            Save webhook
          </Button>
          {savedWebhookUrl ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="h-10"
              onClick={() => void saveWebhook(true)}
            >
              Rotate secret
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
