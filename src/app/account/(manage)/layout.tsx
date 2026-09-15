import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AccountPortalLayout } from "@/components/account/AccountPortalLayout";
import { getSessionUser, staffHomeForRole } from "@/lib/auth";

export default async function ManageBookingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth/sign-in?next=/account/bookings");
  }
  if (user.role !== "PASSENGER") {
    redirect(staffHomeForRole(user.role));
  }

  return (
    <AccountPortalLayout name={user.name} email={user.email}>
      {children}
    </AccountPortalLayout>
  );
}
