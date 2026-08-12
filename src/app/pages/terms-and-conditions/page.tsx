import { StaticPage } from "@/components/layout/StaticPage";

export default function TermsPage() {
  return (
    <StaticPage title="Terms & Conditions">
      <p>
        By booking through SafarPK you agree to provide accurate passenger
        details, complete payment within the seat-hold window, and follow the
        operator&apos;s boarding rules at the terminal.
      </p>
      <p>
        Fares, schedules, and amenities are published by operators and may change
        due to traffic, weather, or operational decisions. Non-refundable fares
        are marked clearly on the trip card before you confirm.
      </p>
      <p>
        SafarPK acts as a booking platform. Carriage is provided by the listed
        bus operator under their own terms of carriage.
      </p>
    </StaticPage>
  );
}
