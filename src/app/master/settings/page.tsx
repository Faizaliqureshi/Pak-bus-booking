import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MasterSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-[#0a2f6b]/60">
          Portal model and access notes
        </p>
      </div>

      <Card className="border-[#0a2f6b]/10 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Portals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[#0a2f6b]/75">
          <p>
            <strong>Master</strong> (`/master`) — platform control and ops
            (MASTER or ADMIN).
          </p>
          <p>
            <strong>Partner</strong> (`/partner/fleet`) — operator fleet
            (OPERATOR).
          </p>
          <p>
            <strong>Conductor</strong> (`/conductor`) — reservations list and
            onboard QR/PNR scan (CONDUCTOR).
          </p>
          <p>
            <strong>Passenger</strong> (
            <Link href="/auth/sign-in" className="underline">
              /auth/sign-in
            </Link>
            ) — booking, tickets, wallet, and profile.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
