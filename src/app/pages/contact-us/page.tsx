import { StaticPage } from "@/components/layout/StaticPage";
import {
  HELPLINE_DISPLAY,
  HELPLINE_TEL,
  helplineWhatsAppHref,
} from "@/lib/helpline";

export default function ContactUsPage() {
  return (
    <StaticPage
      title="Contact Us"
      subtitle="Talk to our travel support team any time."
    >
      <p>
        <strong>Phone:</strong>{" "}
        <a href={`tel:${HELPLINE_TEL}`} className="font-medium text-[#0a2f6b] underline">
          {HELPLINE_DISPLAY}
        </a>
      </p>
      <p>
        <strong>WhatsApp:</strong>{" "}
        <a
          href={helplineWhatsAppHref("Assalam o Alaikum, I need TicketPass support")}
          className="font-medium text-[#0a2f6b] underline"
        >
          {HELPLINE_DISPLAY}
        </a>
      </p>
      <p>
        <strong>Email:</strong> support@ticketpass.pk
      </p>
      <p>
        Support is available 24/7 for booking changes, seat holds, and boarding
        questions. For operator-specific terminal issues, keep your PNR handy.
      </p>
    </StaticPage>
  );
}
