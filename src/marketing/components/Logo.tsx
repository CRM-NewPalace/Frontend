import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg";

interface LogoProps {
  className?: string;
  size?: LogoSize;
  tone?: "default" | "light";
}

const sizeStyles: Record<
  LogoSize,
  {
    icon: string;
    zone: string;
    connection: string;
    gap: string;
    textOffset: string;
  }
> = {
  sm: {
    icon: "h-8 w-8",
    zone: "text-lg leading-none",
    connection: "text-base leading-none",
    gap: "gap-2.5",
    textOffset: "-mt-0.5",
  },
  md: {
    icon: "h-10 w-10",
    zone: "text-xl leading-none",
    connection: "text-lg leading-none",
    gap: "gap-3",
    textOffset: "-mt-1",
  },
  lg: {
    icon: "h-14 w-14",
    zone: "text-3xl leading-none",
    connection: "text-2xl leading-none",
    gap: "gap-4",
    textOffset: "-mt-1.5",
  },
};

export function Logo({ className, size = "md", tone = "default" }: LogoProps) {
  const styles = sizeStyles[size];

  return (
    <div
      className={cn("inline-flex items-center", styles.gap, className)}
      aria-label="Zone Connection"
    >
      <img
        src="/LozoZone.png"
        alt=""
        className={cn("shrink-0 object-contain", styles.icon)}
        aria-hidden
      />
      <div className="flex flex-col">
        <span
          className={cn(
            "font-semibold",
            tone === "light" ? "text-white" : "text-brand-dark",
            styles.zone,
          )}
        >
          Zone
        </span>
        <span
          className={cn(
            "font-semibold text-brand-accent",
            styles.connection,
            styles.textOffset,
          )}
        >
          Connection
        </span>
      </div>
    </div>
  );
}
