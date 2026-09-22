import { StaticPage } from "@/components/layout/StaticPage";

export default function CancellationRefundPolicyPage() {
  return (
    <StaticPage
      title="Cancellation & Refund Policy"
      subtitle="How TicketPass handles cancellations, operator rules, and refund timelines."
    >
      <p>
        Cancellations are subject to the operating carrier’s fare rules. Where
        TicketPass can process a refund, amounts are returned to the original
        payment method or TicketPass Wallet after operator confirmation.
      </p>
      <p>
        Seat holds that expire before payment are released automatically and do
        not create a chargeable booking. For paid tickets, open Manage My Booking
        or contact support@ticketpass.pk / helpline 03312882767.
      </p>
      <p>
        Partial cancellations on multi-seat bookings may recalculate the remaining
        fare according to the operator tariff at the time of change.
      </p>
    </StaticPage>
  );
}
