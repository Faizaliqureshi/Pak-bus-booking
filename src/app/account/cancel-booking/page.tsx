import { redirect } from "next/navigation";

export default function CancelBookingRedirect() {
  redirect("/account/bookings");
}
