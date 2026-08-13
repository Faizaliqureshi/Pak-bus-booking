import { StaticPage } from "@/components/layout/StaticPage";

export default function PrivacyPage() {
  return (
    <StaticPage title="Privacy Policy">
      <p>
        We collect booking details (name, phone, email, CNIC when required) to
        issue tickets, send confirmations, and support boarding.
      </p>
      <p>
        Payment data is processed through the selected method provider. Seat
        holds use short-lived Redis locks and are not shared as marketing data.
      </p>
      <p>
        Contact support@ticketpass.pk to request correction of personal booking
        information associated with your PNR.
      </p>
    </StaticPage>
  );
}
