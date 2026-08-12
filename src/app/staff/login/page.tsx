"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/staff-signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Sign in failed.");
      }
      router.push(json.data.redirectTo as string);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a2f6b] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <p className="font-heading text-2xl font-bold text-[#0a2f6b]">
          Safar<span className="text-[#f5a623]">PK</span> Staff
        </p>
        <h1 className="mt-2 font-heading text-xl font-semibold text-[#1a2333]">
          Master / Admin / Partner login
        </h1>
        <p className="mt-1 text-sm text-[#0a2f6b]/60">
          Customers should use the public{" "}
          <Link href="/auth/sign-in" className="underline">
            Sign In
          </Link>{" "}
          page.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full bg-[#0a2f6b] text-white hover:bg-[#08305f]"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <div className="mt-6 rounded-xl bg-[#f3f6fb] p-3 text-xs text-[#0a2f6b]/70">
          <p className="font-semibold">Demo master</p>
          <p>master@safarpk.pk / password123</p>
        </div>
      </div>
    </main>
  );
}
