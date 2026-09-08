import Link from "next/link";
import { Gift, Sparkles, Wallet } from "lucide-react";
import {
  BackToBuses,
  PlaceholderShell,
} from "@/components/layout/PlaceholderMarketing";

export default function SastaRewardsInfoPage() {
  return (
    <PlaceholderShell
      eyebrow="Sasta Rewards"
      title="Earn Pass Cash on every journey"
      subtitle="TicketPass Rewards (Sasta Rewards) lets you collect points on eligible bus bookings and redeem them on future trips."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <RewardCard
          icon={<Gift className="size-5" />}
          title="Earn"
          text="Get Pass Cash after completed trips on participating operators."
        />
        <RewardCard
          icon={<Wallet className="size-5" />}
          title="Redeem"
          text="Apply balance at checkout within redemption limits."
        />
        <RewardCard
          icon={<Sparkles className="size-5" />}
          title="Track"
          text="View history, expiry, and offers in your rewards dashboard."
        />
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/air/sasta-rewards"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[#FF5A1F] px-5 text-sm font-semibold text-white hover:bg-[#e84e16]"
        >
          Open rewards dashboard
        </Link>
        <Link
          href="/auth/sign-in?next=/air/sasta-rewards"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-[#0a2f6b]/15 bg-white px-5 text-sm font-semibold text-[#0a2f6b]"
        >
          Sign in to view balance
        </Link>
      </div>
      <BackToBuses />
    </PlaceholderShell>
  );
}

function RewardCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-5 shadow-sm">
      <div className="inline-flex size-10 items-center justify-center rounded-xl bg-[#fff4ef] text-[#FF5A1F]">
        {icon}
      </div>
      <h2 className="mt-3 font-heading text-lg font-semibold text-[#0a2f6b]">
        {title}
      </h2>
      <p className="mt-1 text-sm text-[#0a2f6b]/65">{text}</p>
    </article>
  );
}
