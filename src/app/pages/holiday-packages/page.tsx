import Link from "next/link";
import { StaticPage } from "@/components/layout/StaticPage";

export default function HolidayPackagesPage() {
  return (
    <StaticPage
      title="Holiday Packages"
      subtitle="Domestic getaways and international holiday bundles."
    >
      <p>
        Holiday packages will feature hotels, transfers, and optional bus
        add-ons for popular routes across Pakistan.
      </p>
      <p>
        Need a coach today?{" "}
        <Link href="/search" className="font-medium text-[#0a2f6b] underline">
          Search buses
        </Link>
        .
      </p>
    </StaticPage>
  );
}
