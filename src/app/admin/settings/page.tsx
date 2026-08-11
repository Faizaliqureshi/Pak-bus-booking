import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-teal-900/60">
          Placeholder operator preferences — wire to real auth later
        </p>
      </div>

      <Card className="border-teal-900/10 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Access control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-teal-900/75">
          <p>
            `/admin/*` currently allows seeded users with role{" "}
            <strong>OPERATOR</strong> or <strong>ADMIN</strong> (demo gate in
            `admin/layout.tsx`).
          </p>
          <p>
            Conductor scanner remains separate at{" "}
            <Link href="/conductor/scan" className="text-teal-800 underline">
              /conductor/scan
            </Link>
            .
          </p>
          <p>
            Replace `getAdminUser()` in `src/lib/admin-auth.ts` with session-based
            auth when you add login.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
