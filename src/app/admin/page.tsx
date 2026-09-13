import { redirect } from "next/navigation";

/** Legacy /admin entry — unified into Master portal. */
export default function AdminIndexRedirect() {
  redirect("/master");
}
