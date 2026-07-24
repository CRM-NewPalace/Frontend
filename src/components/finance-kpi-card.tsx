import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type FinanceKpiTone = "teal" | "emerald" | "orange" | "red" | "blue" | "violet" | "rose";

const TONE: Record<FinanceKpiTone, { bar: string; icon: string }> = {
  teal: { bar: "bg-teal-600", icon: "bg-teal-600" },
  emerald: { bar: "bg-emerald-600", icon: "bg-emerald-600" },
  orange: { bar: "bg-orange-500", icon: "bg-orange-500" },
  red: { bar: "bg-red-600", icon: "bg-red-600" },
  blue: { bar: "bg-blue-600", icon: "bg-blue-600" },
  violet: { bar: "bg-violet-600", icon: "bg-violet-600" },
  rose: { bar: "bg-rose-500", icon: "bg-rose-500" },
};

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FinanceKpiCard({
  label,
  value,
  icon: Icon,
  tone,
  href,
  className,
  format = "money",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: FinanceKpiTone;
  href?: string;
  className?: string;
  format?: "money" | "number";
}) {
  const t = TONE[tone];
  const display =
    format === "number"
      ? value.toLocaleString("pt-BR")
      : money(value);

  const len = display.length;
  const valueSize =
    len > 18 ? "text-sm leading-snug"
      : len > 14 ? "text-base leading-snug"
        : "text-xl leading-tight";

  const card = (
    <div
      className={cn(
        "rounded-xl bg-card text-card-foreground shadow-sm border border-border/60 overflow-hidden min-w-0",
        href && "transition-shadow hover:shadow-md",
        className,
      )}
      title={display}
    >
      <div className={cn("h-2 w-full", t.bar)} />
      <div className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div
          className={cn(
            "w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shrink-0 text-white shadow-sm",
            t.icon,
          )}
        >
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="text-[11px] sm:text-xs text-muted-foreground leading-snug truncate">{label}</div>
          <div
            className={cn(
              "font-bold tracking-tight tabular-nums mt-0.5 text-foreground break-all sm:break-words",
              valueSize,
            )}
          >
            {display}
          </div>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block min-w-0">
        {card}
      </Link>
    );
  }

  return card;
}
