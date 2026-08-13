import { StaticPage } from "@/components/layout/StaticPage";

export default function FaqsPage() {
  return (
    <StaticPage title="FAQs" subtitle="Common questions about booking on TicketPass.">
      <div className="space-y-5">
        <Faq
          q="How long is my seat held?"
          a="Selected seats are locked for 10 minutes while you complete passenger details and payment."
        />
        <Faq
          q="Can I book more than one seat?"
          a="Yes — you can book up to 4 seats at a time on a single trip."
        />
        <Faq
          q="What do the seat colours mean?"
          a="Blue seats are reserved for male passengers, pink for female. White seats with a border are available. Selected seats show a checkmark."
        />
        <Faq
          q="How do I board?"
          a="Show your e-ticket QR and PNR at the terminal. Conductors can scan the ticket on departure."
        />
      </div>
    </StaticPage>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <h2 className="font-heading text-base font-semibold text-[#0a2f6b]">{q}</h2>
      <p className="mt-1">{a}</p>
    </div>
  );
}
