import { redirect } from "next/navigation";

interface PassengersPageProps {
  searchParams: Promise<{
    tripId?: string;
    seats?: string;
    boardingStopId?: string;
    dropStopId?: string;
  }>;
}

/** Legacy route — seat map now creates a booking and sends users to /checkout/[bookingId]. */
export default async function PassengersPage({
  searchParams,
}: PassengersPageProps) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (params.tripId) qs.set("origin", "Karachi");
  redirect(qs.toString() ? `/search?${qs}` : "/search");
}
