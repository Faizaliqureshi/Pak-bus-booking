import { StaticPage } from "@/components/layout/StaticPage";

export default function AboutUsPage() {
  return (
    <StaticPage
      title="About Us"
      subtitle="SafarPK makes intercity bus travel across Pakistan simpler to search, select, and board."
    >
      <p>
        SafarPK is built for Pakistani corridors — Karachi to Lahore, Multan,
        Islamabad, and beyond. We combine live seat maps, timed holds, and clear
        operator information so you know exactly what you are booking.
      </p>
      <p>
        Our goal is marketplace-grade clarity: transparent fares, female-friendly
        seat cues, and tickets you can show at the terminal without friction.
      </p>
    </StaticPage>
  );
}
