import Link from "next/link";
import { StaticPage } from "@/components/layout/StaticPage";

export default function UmrahPackagesPage() {
  return (
    <StaticPage
      title="Umrah Packages"
      subtitle="Pilgrimage packages coming soon on Ticketpass."
    >
      <p>
        Browse curated Umrah packages with flights, hotels, and ground
        transport. This section mirrors the marketplace layout passengers expect
        from leading Pakistani travel sites.
      </p>
      <p>
        Meanwhile, book your intercity bus to the airport on{" "}
        <Link href="/" className="font-medium text-[#0a2f6b] underline">
          Ticketpass Buses
        </Link>
        .
      </p>
    </StaticPage>
  );
}
