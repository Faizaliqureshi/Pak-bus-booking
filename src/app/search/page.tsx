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
    <main className="min-h-screen bg-[#f3f6fb]">
      <SearchResultsClient
        origin={origin}
        destination={destination}
        date={date}
      />
    </main>
  );
}
