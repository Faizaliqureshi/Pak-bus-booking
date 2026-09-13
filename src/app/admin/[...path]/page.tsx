import { redirect } from "next/navigation";

const MAP: Record<string, string> = {
  dashboard: "/master/dashboard",
  partners: "/master/partners",
  routes: "/master/routes",
  buses: "/master/buses",
  manifest: "/master/manifest",
  settings: "/master/settings",
};

export default async function AdminCatchAllRedirect({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  const first = path?.[0] ?? "";
  redirect(MAP[first] ?? "/master");
}
