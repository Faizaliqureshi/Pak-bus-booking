export type TrackPhase = "SCHEDULED" | "EN_ROUTE" | "ARRIVED";

export type TrackStop = {
  id: string;
  name: string;
  cityHint: string;
  order: number;
  distanceFromOrigin: number;
  lat: number;
  lng: number;
};

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  karachi: { lat: 24.86, lng: 67.0 },
  hyderabad: { lat: 25.4, lng: 68.36 },
  sukkur: { lat: 27.7, lng: 68.86 },
  multan: { lat: 30.16, lng: 71.47 },
  lahore: { lat: 31.52, lng: 74.36 },
  faisalabad: { lat: 31.42, lng: 73.08 },
  islamabad: { lat: 33.68, lng: 73.05 },
  rawalpindi: { lat: 33.6, lng: 73.05 },
  peshawar: { lat: 34.01, lng: 71.52 },
  quetta: { lat: 30.18, lng: 67.01 },
  abbottabad: { lat: 34.17, lng: 73.22 },
  swat: { lat: 34.77, lng: 72.36 },
  mingora: { lat: 34.77, lng: 72.36 },
  "saidu sharif": { lat: 34.75, lng: 72.36 },
};

function coordsForLabel(label: string): { lat: number; lng: number } {
  const lower = label.toLowerCase();
  for (const [name, coords] of Object.entries(CITY_COORDS)) {
    if (lower.includes(name)) return coords;
  }
  return { lat: 30.4, lng: 70.0 };
}

export function buildTrackStops(
  stops: {
    id: string;
    stationName: string;
    stopOrder: number;
    distanceFromOrigin: number;
  }[],
  originCity: string,
  destinationCity: string,
): TrackStop[] {
  if (stops.length === 0) {
    return [
      {
        id: "origin",
        name: `${originCity} Terminal`,
        cityHint: originCity,
        order: 1,
        distanceFromOrigin: 0,
        ...coordsForLabel(originCity),
      },
      {
        id: "dest",
        name: `${destinationCity} Terminal`,
        cityHint: destinationCity,
        order: 2,
        distanceFromOrigin: 1,
        ...coordsForLabel(destinationCity),
      },
    ];
  }

  return stops.map((s) => ({
    id: s.id,
    name: s.stationName,
    cityHint: s.stationName,
    order: s.stopOrder,
    distanceFromOrigin: s.distanceFromOrigin,
    ...coordsForLabel(s.stationName),
  }));
}

export function computeJourneyProgress(
  departureTime: Date,
  arrivalTime: Date,
  now: Date = new Date(),
): { progress: number; phase: TrackPhase } {
  const start = departureTime.getTime();
  const end = arrivalTime.getTime();
  const t = now.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { progress: 0, phase: "SCHEDULED" };
  }
  if (t < start) return { progress: 0, phase: "SCHEDULED" };
  if (t >= end) return { progress: 1, phase: "ARRIVED" };
  return { progress: (t - start) / (end - start), phase: "EN_ROUTE" };
}

export function locateAlongStops(
  stops: TrackStop[],
  progress: number,
): { lastStop: TrackStop; nextStop: TrackStop | null } {
  if (stops.length === 0) {
    throw new Error("No stops");
  }
  const first = stops[0]!;
  const last = stops[stops.length - 1]!;
  const span = Math.max(last.distanceFromOrigin - first.distanceFromOrigin, 1);
  const travelled = first.distanceFromOrigin + span * progress;

  let lastStop = first;
  for (const stop of stops) {
    if (stop.distanceFromOrigin <= travelled + 0.0001) lastStop = stop;
  }
  const idx = stops.findIndex((s) => s.id === lastStop.id);
  const nextStop = idx >= 0 && idx < stops.length - 1 ? stops[idx + 1]! : null;
  return { lastStop, nextStop };
}

export function interpolatePosition(
  stops: TrackStop[],
  progress: number,
): { lat: number; lng: number } {
  if (stops.length === 1) {
    return { lat: stops[0]!.lat, lng: stops[0]!.lng };
  }
  const first = stops[0]!;
  const last = stops[stops.length - 1]!;
  const span = Math.max(last.distanceFromOrigin - first.distanceFromOrigin, 1);
  const travelled = first.distanceFromOrigin + span * progress;

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]!;
    const b = stops[i + 1]!;
    if (travelled <= b.distanceFromOrigin || i === stops.length - 2) {
      const seg = Math.max(b.distanceFromOrigin - a.distanceFromOrigin, 0.0001);
      const t = Math.min(
        1,
        Math.max(0, (travelled - a.distanceFromOrigin) / seg),
      );
      return {
        lat: a.lat + (b.lat - a.lat) * t,
        lng: a.lng + (b.lng - a.lng) * t,
      };
    }
  }
  return { lat: last.lat, lng: last.lng };
}

export function etaIso(arrivalTime: Date, phase: TrackPhase): string | null {
  if (phase === "ARRIVED") return null;
  return arrivalTime.toISOString();
}
