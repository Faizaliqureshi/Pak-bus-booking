"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AdminRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  partnersCreated: number;
};

type CreatedCreds = {
  email: string;
  temporaryPassword: string;
};

export default function MasterHomePage() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creds, setCreds] = useState<CreatedCreds | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/master/admins");
      const json = await res.json();
      if (json.success) setAdmins(json.data);
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
      const res = await fetch("/api/master/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          password: password || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to create admin.");
      }
      setCreds({
        email: json.data.email,
        temporaryPassword: json.data.temporaryPassword,
      });
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

  async function copyCreds() {
    if (!creds) return;
    await navigator.clipboard.writeText(
      `Email: ${creds.email}\nPassword: ${creds.temporaryPassword}\nLogin: /staff/login`,
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Create Admins</h1>
        <p className="mt-1 text-sm text-[#0a2f6b]/65">
          Masters create admin accounts. Admins then create partner (operator)
          logins and share credentials.
        </p>
      </div>

      <form
        onSubmit={onCreate}
        className="grid gap-4 rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-6"
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
        {error ? <p className="text-sm text-red-700 sm:col-span-2">{error}</p> : null}
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
                Create admin
              </>
            )}
          </Button>
        </div>
      </form>

      {creds ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-semibold text-emerald-900">
            Share these credentials with the admin (shown once)
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

      <div className="rounded-2xl border border-[#0a2f6b]/10 bg-white shadow-sm">
        <div className="border-b border-[#0a2f6b]/10 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold">Admins</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f3f6fb] text-[#0a2f6b]/70">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Partners</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[#0a2f6b]/50">
                      No admins yet.
                    </td>
                  </tr>
                ) : (
                  admins.map((a) => (
                    <tr key={a.id} className="border-t border-[#0a2f6b]/8">
                      <td className="px-4 py-3 font-medium">{a.name}</td>
                      <td className="px-4 py-3">{a.email}</td>
                      <td className="px-4 py-3">{a.partnersCreated}</td>
                      <td className="px-4 py-3">
                        {new Date(a.createdAt).toLocaleDateString("en-PK")}
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
