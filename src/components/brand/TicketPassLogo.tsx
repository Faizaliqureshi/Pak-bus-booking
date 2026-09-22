import { cn } from "@/lib/utils";

const NAVY = "#0A2F6B";
const YELLOW = "#F5A623";
const TAGLINE = "#5BA3D4";

export type LogoTone = "light" | "dark";

function TicketMark({ color, className }: { color: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      aria-hidden
    >
      <g
        transform="rotate(-28 32 32)"
        stroke={color}
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="11" y="20" width="42" height="24" rx="4.5" />
        <path d="M27 22.2v19.6" strokeDasharray="2.4 2.6" />
      </g>
    </svg>
  );
}

const SIZES = {
  sm: {
    wrap: "gap-1.5",
    mark: "size-7",
    word: "text-lg sm:text-xl",
    tag: "text-[9px]",
    suffix: "text-xs",
  },
  md: {
    wrap: "gap-2",
    mark: "size-9",
    word: "text-xl sm:text-2xl",
    tag: "text-[10px]",
    suffix: "text-sm",
  },
  lg: {
    wrap: "gap-2.5",
    mark: "size-12 sm:size-14",
    word: "text-3xl sm:text-4xl lg:text-5xl",
    tag: "text-xs sm:text-sm",
    suffix: "text-base",
  },
} as const;

export function TicketPassLogo({
  tone = "light",
  size = "md",
  tagline = false,
  suffix,
  className,
}: {
  tone?: LogoTone;
  size?: keyof typeof SIZES;
  tagline?: boolean;
  suffix?: string;
  className?: string;
}) {
  const ink = tone === "dark" ? "#FFFFFF" : NAVY;
  const tag = tone === "dark" ? "rgba(255,255,255,0.72)" : TAGLINE;
  const s = SIZES[size];

  return (
    <span className={cn("inline-flex items-center", s.wrap, className)}>
      <TicketMark color={ink} className={cn("shrink-0", s.mark)} />
      <span className="flex min-w-0 flex-col leading-none">
        <span className={cn("font-heading font-bold tracking-tight", s.word)}>
          <span style={{ color: ink }}>Ticket</span>
          <span style={{ color: YELLOW }}>Pass</span>
          {suffix ? (
            <span
              className={cn("ml-1.5 font-semibold", s.suffix)}
              style={{ color: ink }}
            >
              {suffix}
            </span>
          ) : null}
        </span>
        {tagline ? (
          <span
            className={cn("mt-1 font-medium tracking-wide", s.tag)}
            style={{ color: tag }}
          >
            Smartest Access Solutions
          </span>
        ) : null}
      </span>
    </span>
  );
}
