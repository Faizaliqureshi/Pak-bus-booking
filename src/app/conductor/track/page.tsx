import { TrackBusClient } from "@/components/tracking/TrackBusClient";

export default function ConductorTrackPage() {
  return (
    <TrackBusClient
      mode="fleet"
      title="Track bus"
      subtitle="Enter a bus number to follow the coach along its corridor."
    />
  );
}
