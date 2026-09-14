export interface TripSearchResult {
  id: string;
  departureTime: string;
  arrivalTime: string;
  durationMs: number;
  basePrice: number;
  bus: {
    id: string;
    busNumber: string;
    layoutType: string;
    totalSeats: number;
  };
  operator: { id: string; name: string };
  route: {
    id: string;
    name: string;
    originCity: string;
    destinationCity: string;
    distanceKm: number;
  };
  boardingStop: { id: string; name: string; order: number } | null;
  dropStop: { id: string; name: string; order: number } | null;
}
