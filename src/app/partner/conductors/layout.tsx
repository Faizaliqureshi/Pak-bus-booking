import type { ReactNode } from "react";
import PartnerPortalLayout from "@/components/partner/PartnerPortalLayout";

export default function Layout({ children }: { children: ReactNode }) {
  return <PartnerPortalLayout>{children}</PartnerPortalLayout>;
}
