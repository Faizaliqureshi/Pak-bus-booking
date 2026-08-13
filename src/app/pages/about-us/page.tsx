import { StaticPage } from "@/components/layout/StaticPage";

const WHY_CHOOSE = [
  {
    title: "Seamless Bookings",
    body: "Fast, simple, and intuitive booking in just a few taps.",
  },
  {
    title: "Real-Time Seat Selection",
    body: "Pick your preferred seats with instant confirmation.",
  },
  {
    title: "Transparent & Secure",
    body: "Trusted payment options with no hidden surprises.",
  },
  {
    title: "Built for the Future",
    body: "A single platform evolving to meet all your local and international travel needs.",
  },
] as const;

export default function AboutUsPage() {
  return (
    <StaticPage title="About Us" subtitle="One App for Every Journey.">
      <p>
        TicketPass is Pakistan’s next-generation travel and booking platform,
        designed to simplify the way you move. Whether you are commuting between
        cities, planning a family vacation, or preparing for international
        travel, TicketPass connects you to your destination with ease, speed,
        and complete peace of mind.
      </p>
      <p>
        Starting with seamless, real-time bus ticket bookings, TicketPass is
        building an all-in-one digital travel ecosystem. From instant seat
        selection to automated booking confirmations, we take the hassle out of
        travel planning so you can focus on the journey ahead.
      </p>
      <p>
        As we grow, TicketPass will bring your entire travel experience under
        one roof—expanding to include flight bookings, train reservations,
        curated tour packages, and visa assistance.
      </p>

      <div className="pt-2">
        <h2 className="font-heading text-lg font-semibold text-[#0a2f6b]">
          Why Choose TicketPass?
        </h2>
        <ul className="mt-4 space-y-4">
          {WHY_CHOOSE.map((item) => (
            <li key={item.title}>
              <p className="font-semibold text-[#0a2f6b]">{item.title}</p>
              <p className="mt-1 text-[#0a2f6b]/75">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>

      <p className="pt-2">
        Wherever you&apos;re headed, TicketPass is your trusted companion.
      </p>
      <p className="font-heading text-base font-semibold text-[#0a2f6b]">
        Chalo, TicketPass ke saath!
      </p>
    </StaticPage>
  );
}
