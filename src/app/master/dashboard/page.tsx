"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  Armchair,
  BusFront,
  Loader2,
  Plus,
  Ticket,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRs, formatTime } from "@/lib/booking-utils";

type Stats = {
  revenueToday: number;
  occupancyRate: number;
  ticketsSoldToday: number;
  activeTripsToday: number;
};

type RecentBooking = {
  id: string;
  pnr: string;
  passengerName: string;
  route: string;
  totalPrice: number;
  paymentStatus: string;
  createdAt: string;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [bookings, setBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [statsRes, bookingsRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/bookings/recent"),
        ]);
        const statsJson = await statsRes.json();
        const bookingsJson = await bookingsRes.json();
        if (!cancelled) {
          if (statsJson.success) setStats(statsJson.data);
          if (bookingsJson.success) setBookings(bookingsJson.data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center gap-2 text-teal-900/60">
        <Loader2 className="size-5 animate-spin" /> Loading dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Overview</h1>
          <p className="mt-1 text-sm text-teal-900/60">
            Today’s PKR revenue, occupancy, and booking activity
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            className="bg-teal-800 text-white hover:bg-teal-700"
            render={<Link href="/master/routes" />}
          >
            <Plus className="size-4" /> Add route / trip
          </Button>
          <Button variant="outline" render={<Link href="/master/buses" />}>
            Register bus
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Wallet className="size-4" />}
          label="Revenue today"
          value={formatRs(stats?.revenueToday ?? 0)}
        />
        <StatCard
          icon={<Activity className="size-4" />}
          label="Seat occupancy"
          value={`${stats?.occupancyRate ?? 0}%`}
        />
        <StatCard
          icon={<Ticket className="size-4" />}
          label="Tickets sold today"
          value={String(stats?.ticketsSoldToday ?? 0)}
        />
        <StatCard
          icon={<BusFront className="size-4" />}
          label="Trips today"
          value={String(stats?.activeTripsToday ?? 0)}
        />
      </div>

      <Card className="border-teal-900/10 shadow-sm">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="font-heading text-xl">Recent bookings</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/master/manifest" />}
          >
            <Armchair className="size-4" /> Manifests
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-teal-900/10 text-xs tracking-wide text-teal-900/55 uppercase">
              <tr>
                <th className="px-2 py-2 font-medium">PNR</th>
                <th className="px-2 py-2 font-medium">Passenger</th>
                <th className="px-2 py-2 font-medium">Route</th>
                <th className="px-2 py-2 font-medium">Fare</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-8 text-center text-teal-900/50">
                    No bookings yet
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="border-b border-teal-900/5">
                    <td className="px-2 py-3 font-mono font-medium">
                      <Link
                        href={`/ticket/${b.pnr}`}
                        className="text-teal-800 hover:underline"
                      >
                        {b.pnr}
                      </Link>
                    </td>
                    <td className="px-2 py-3">{b.passengerName}</td>
                    <td className="px-2 py-3">{b.route}</td>
                    <td className="px-2 py-3">{formatRs(b.totalPrice)}</td>
                    <td className="px-2 py-3">
                      <Badge
                        variant="secondary"
                        className={
                          b.paymentStatus === "PAID"
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-amber-100 text-amber-900"
                        }
                      >
                        {b.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-2 py-3 text-teal-900/60">
                      {formatTime(b.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-teal-900/10 shadow-sm">
      <CardContent className="p-5">
        <div className="mb-3 inline-flex size-9 items-center justify-center rounded-xl bg-teal-900 text-teal-50">
          {icon}
        </div>
        <p className="text-xs tracking-wide text-teal-900/55 uppercase">
          {label}
        </p>
        <p className="mt-1 font-heading text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
