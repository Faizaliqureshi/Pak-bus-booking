import { TrackBusClient } from "@/components/tracking/TrackBusClient";

export default function MasterTrackPage() {
  return (
    <TrackBusClient
      mode="fleet"
      title="Track bus"
      subtitle="Look up a coach by bus number to see its live corridor position."
    />
  );
}
