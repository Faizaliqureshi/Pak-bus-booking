import { StaticPage } from "@/components/layout/StaticPage";

export default function ContactUsPage() {
  return (
    <StaticPage
      title="Contact Us"
      subtitle="Talk to our travel support team any time."
    >
      <p>
        <strong>Phone:</strong> (021) 111 172 782
      </p>
      <p>
        <strong>WhatsApp:</strong> +92 304 777 2782
      </p>
      <p>
        <strong>Email:</strong> support@safarpk.pk
      </p>
      <p>
        Support is available 24/7 for booking changes, seat holds, and boarding
        questions. For operator-specific terminal issues, keep your PNR handy.
      </p>
    </StaticPage>
  );
}
