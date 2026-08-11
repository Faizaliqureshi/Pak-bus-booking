import { SearchResultsClient } from "@/components/booking/SearchResultsClient";
import { defaultTravelDate } from "@/lib/booking-utils";

interface SearchPageProps {
  searchParams: Promise<{
    origin?: string;
    destination?: string;
    date?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const origin = params.origin?.trim() || "Karachi";
  const destination = params.destination?.trim() || "Lahore";
  const date = params.date?.trim() || defaultTravelDate();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#e8f5f1,_#f7faf9_45%,_#eef2f0)]">
      <SearchResultsClient
        origin={origin}
        destination={destination}
        date={date}
      />
    </main>
  );
}
