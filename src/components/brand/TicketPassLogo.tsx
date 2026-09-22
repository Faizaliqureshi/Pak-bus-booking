import Image from "next/image";
import { cn } from "@/lib/utils";

export type LogoTone = "light" | "dark";

const LOGOS = {
  light: {
    src: "/brand/ticketpass-logo-light.png",
    width: 1024,
    height: 236,
  },
  dark: {
    src: "/brand/ticketpass-logo-dark.png",
    width: 1024,
    height: 236,
  },
} as const;

const SIZES = {
  sm: "h-8 w-auto",
  md: "h-10 w-auto",
  lg: "h-14 w-auto",
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
  /** Official artwork already includes the tagline. */
  tagline?: boolean;
  suffix?: string;
  className?: string;
}) {
  const logo = LOGOS[tone];
  const label = suffix ? `TicketPass ${suffix}` : "TicketPass";

  return (
    <span
      className={cn(
        "inline-flex h-auto w-auto shrink-0 items-center self-start",
        className,
      )}
    >
      <Image
        src={logo.src}
        alt={label}
        width={logo.width}
        height={logo.height}
        priority={size !== "md"}
        className={cn(
          "block max-w-none shrink-0 object-contain object-left",
          SIZES[size],
        )}
      />
      {suffix ? (
        <span
          className={cn(
            "ml-1.5 font-heading font-semibold tracking-tight",
            tone === "dark" ? "text-white" : "text-[#0A2F6B]",
            size === "sm" ? "text-xs" : "text-sm",
          )}
        >
          {suffix}
        </span>
      ) : null}
      {tagline ? <span className="sr-only">Smartest Access Solutions</span> : null}
    </span>
  );
}
