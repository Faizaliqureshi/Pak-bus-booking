import { TrackBusClient } from "@/components/tracking/TrackBusClient";

export default function PartnerTrackPage() {
  return (
    <TrackBusClient
      mode="fleet"
      title="Track bus"
      subtitle="Enter one of your fleet bus numbers to see the active departure."
    />
  );
}
