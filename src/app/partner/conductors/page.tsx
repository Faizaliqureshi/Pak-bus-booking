"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ConductorRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
};

export default function PartnerConductorsPage() {
  const [rows, setRows] = useState<ConductorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(
    null,
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partner/conductors");
      const json = await res.json();
      if (json.success) setRows(json.data);
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
    setError(null);
    setMessage(null);
    setCreds(null);
    try {
      const res = await fetch("/api/partner/conductors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          password: password || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not create conductor.");
      }
      setCreds({
        email: json.data.email,
        password: json.data.temporaryPassword,
      });
      setMessage(json.message);
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setSaving(false);
    }
  }

  async function onReset(id: string) {
    if (resetPassword.trim().length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/partner/conductors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not reset password.");
      }
      setMessage(`Password updated for ${json.data.email}.`);
      setResetId(null);
      setResetPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Conductors</h1>
        <p className="mt-1 text-sm text-[#0a2f6b]/65">
          Conductors work only under your partner account. They can list your
          trips, scan your tickets, and track your fleet.
        </p>
      </div>

      <form
        onSubmit={onCreate}
        className="grid gap-4 rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm sm:grid-cols-2"
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Full name</Label>
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
        {error ? (
          <p className="text-sm text-red-700 sm:col-span-2">{error}</p>
        ) : null}
        {message ? (
          <p className="text-sm text-emerald-800 sm:col-span-2">{message}</p>
        ) : null}
        <div className="sm:col-span-2">
          <Button
            type="submit"
            disabled={saving}
            className="h-11 bg-[#0a2f6b] text-white hover:bg-[#08305f]"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create conductor
          </Button>
        </div>
      </form>

      {creds ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-semibold text-emerald-900">
            Share these conductor credentials (shown once)
          </p>
          <p className="mt-2 font-mono text-sm text-emerald-950">
            Email: {creds.email}
            <br />
            Password: {creds.password}
            <br />
            Login: /staff/login
          </p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[#0a2f6b]/10 bg-white">
        {loading ? (
          <p className="flex items-center gap-2 p-6 text-sm text-[#0a2f6b]/60">
            <Loader2 className="size-4 animate-spin" /> Loading conductors…
          </p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-[#0a2f6b]/60">
            No conductors yet. Create one to scan tickets on your coaches.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f3f6fb] text-xs uppercase tracking-wide text-[#0a2f6b]/60">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Password</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[#0a2f6b]/8">
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3">{row.phone || "—"}</td>
                  <td className="px-4 py-3">
                    {resetId === row.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          type="password"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          className="h-9 w-40"
                          placeholder="New password"
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={saving}
                          onClick={() => void onReset(row.id)}
                          className="bg-[#0a2f6b] text-white"
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setResetId(null);
                            setResetPassword("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="text-xs font-semibold underline"
                        onClick={() => {
                          setResetId(row.id);
                          setResetPassword("");
                          setError(null);
                        }}
                      >
                        Reset password
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
