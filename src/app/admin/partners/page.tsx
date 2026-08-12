"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PartnerRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  busCount: number;
};

type CreatedCreds = {
  email: string;
  temporaryPassword: string;
};

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creds, setCreds] = useState<CreatedCreds | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/partners");
      const json = await res.json();
      if (json.success) setPartners(json.data);
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
    setCreds(null);
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactName,
          email,
          phone,
          password: password || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to create partner.");
      }
      setCreds({
        email: json.data.email,
        temporaryPassword: json.data.temporaryPassword,
      });
      setCompanyName("");
      setContactName("");
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

  async function copyCreds() {
    if (!creds) return;
    await navigator.clipboard.writeText(
      `Email: ${creds.email}\nPassword: ${creds.temporaryPassword}\nLogin: /staff/login`,
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-teal-950">
          Partner accounts
        </h1>
        <p className="mt-1 text-sm text-teal-900/65">
          Create operator logins and share credentials so partners can add their
          fleet.
        </p>
      </div>

      <form
        onSubmit={onCreate}
        className="grid gap-4 rounded-2xl border border-teal-900/10 bg-white p-5 shadow-sm sm:grid-cols-2"
      >
        <div className="space-y-1.5">
          <Label>Company / operator name</Label>
          <Input
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="h-11"
            placeholder="Kainat Travels"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Contact person</Label>
          <Input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Login email</Label>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
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
          />
        </div>
        {error ? (
          <p className="text-sm text-red-700 sm:col-span-2">{error}</p>
        ) : null}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={saving} className="h-11 bg-teal-800 text-white">
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Plus className="size-4" />
                Create partner
              </>
            )}
          </Button>
        </div>
      </form>

      {creds ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-semibold text-emerald-900">
            Share with partner (copy now — password shown once)
          </p>
          <p className="mt-2 font-mono text-sm text-emerald-950">
            Email: {creds.email}
            <br />
            Password: {creds.temporaryPassword}
            <br />
            Login URL: /staff/login
          </p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => void copyCreds()}>
            <Copy className="size-4" />
            Copy credentials
          </Button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-teal-900/10 bg-white shadow-sm">
        <div className="border-b border-teal-900/10 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold">Partners</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-teal-50 text-teal-900/70">
                <tr>
                  <th className="px-4 py-3">Operator</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Buses</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {partners.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-teal-900/50">
                      No partners yet.
                    </td>
                  </tr>
                ) : (
                  partners.map((p) => (
                    <tr key={p.id} className="border-t border-teal-900/8">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3">{p.email}</td>
                      <td className="px-4 py-3">{p.busCount}</td>
                      <td className="px-4 py-3">
                        {new Date(p.createdAt).toLocaleDateString("en-PK")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
