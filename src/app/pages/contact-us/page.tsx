import { StaticPage } from "@/components/layout/StaticPage";

export default function ContactUsPage() {
  return (
    <StaticPage
      title="Contact Us"
      subtitle="Talk to our travel support team any time."
    >
      <p>
        <strong>Phone:</strong>{" "}
        <a href="tel:03123137349" className="font-medium text-[#0a2f6b] underline">
          0312 3137349
        </a>
      </p>
      <p>
        <strong>WhatsApp:</strong>{" "}
        <a href="https://wa.me/923123137349" className="font-medium text-[#0a2f6b] underline">
          0312 3137349
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
