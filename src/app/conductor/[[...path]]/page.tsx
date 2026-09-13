import { redirect } from "next/navigation";

/** Conductor portal removed — staff use Master or Partner. */
export default function ConductorRedirect() {
  redirect("/staff/login");
}
