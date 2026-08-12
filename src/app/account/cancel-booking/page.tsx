import { StaticPage } from "@/components/layout/StaticPage";

export default function CancelBookingPage() {
  return (
    <StaticPage
      title="Cancel Booking"
      subtitle="Enter your PNR to request a cancellation."
    >
      <p>
        Non-refundable tickets are marked on the trip card before payment. For
        refundable bookings, share your PNR with support at{" "}
        <a href="tel:03123137349" className="font-medium text-[#0a2f6b] underline">
          0312 3137349
        </a>{" "}
        or use the contact form.
      </p>
      <p>
        Full self-serve cancellation will appear here once payment refunds are
        wired to JazzCash / EasyPaisa.
      </p>
    </StaticPage>
  );
}
