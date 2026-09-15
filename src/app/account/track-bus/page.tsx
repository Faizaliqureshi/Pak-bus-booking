import { redirect } from "next/navigation";
import { TrackBusClient } from "@/components/tracking/TrackBusClient";
import { getSessionUser, staffHomeForRole } from "@/lib/auth";

export default async function PassengerTrackBusPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth/sign-in?next=/account/track-bus");
  }
  if (user.role !== "PASSENGER") {
    const home = staffHomeForRole(user.role);
    if (user.role === "MASTER" || user.role === "ADMIN") {
      redirect("/master/track");
    }
    if (user.role === "OPERATOR") {
      redirect("/partner/track");
    }
    if (user.role === "CONDUCTOR") {
      redirect("/conductor/track");
    }
    redirect(home);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <TrackBusClient
        mode="passenger"
        title="Track bus"
        subtitle="Enter the PNR or booking ID from your e-ticket."
      />
    </main>
  );
}
