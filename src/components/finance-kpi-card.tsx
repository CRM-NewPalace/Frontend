import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type FinanceKpiTone =
  | "teal"
  | "emerald"
  | "orange"
  | "red"
  | "blue"
  | "violet"
  | "rose";

const TONE: Record<FinanceKpiTone, { bar: string; icon: string }> = {
  teal: { bar: "bg-teal-600", icon: "bg-teal-600" },
  emerald: { bar: "bg-cyan-600", icon: "bg-cyan-600" },
  orange: { bar: "bg-orange-500", icon: "bg-orange-500" },
  red: { bar: "bg-red-600", icon: "bg-red-600" },
  blue: { bar: "bg-blue-600", icon: "bg-blue-600" },
  violet: { bar: "bg-violet-600", icon: "bg-violet-600" },
  rose: { bar: "bg-rose-500", icon: "bg-rose-500" },
};

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function EvolucaoBadge({
  value,
  className,
  invert = false,
}: {
  value: number | null | undefined;
  className?: string;
  /** Se true, alta é ruim (ex.: leads perdidos). */
  invert?: boolean;
}) {
  if (value == null) {
    return (
      <span className={cn("text-[11px] text-muted-foreground", className)}>
        vs mês ant. —
      </span>
    );
  }
  const up = value > 0;
  const down = value < 0;
  const good = invert ? down : up;
  const bad = invert ? up : down;
  const Icon = up || value === 0 ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums",
        good && "text-emerald-600 dark:text-emerald-400",
        bad && "text-rose-600 dark:text-rose-400",
        value === 0 && "text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {value > 0 ? "+" : ""}
      {value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
    </span>
  );
}

export function FinanceKpiCard({
  label,
  value,
  icon: Icon,
  tone,
  href,
  className,
  format = "money",
  evolucaoPct,
  invertEvolucao = false,
  suffix,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: FinanceKpiTone;
  href?: string;
  className?: string;
  format?: "money" | "number" | "percent";
  evolucaoPct?: number | null;
  invertEvolucao?: boolean;
  suffix?: string;
}) {
  const t = TONE[tone];
  const display =
    format === "number"
      ? value.toLocaleString("pt-BR")
      : format === "percent"
        ? `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
        : money(value);

  const len = display.length;
  const valueSize =
    len > 18
      ? "text-sm leading-snug"
      : len > 14
        ? "text-base leading-snug"
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
          <div className="text-[11px] sm:text-xs text-muted-foreground leading-snug truncate">
            {label}
          </div>
          <div
            className={cn(
              "font-bold tracking-tight tabular-nums mt-0.5 text-foreground break-all sm:break-words",
              valueSize,
            )}
          >
            {display}
            {suffix ? (
              <span className="text-xs font-medium text-muted-foreground">
                {" "}
                {suffix}
              </span>
            ) : null}
          </div>
          {evolucaoPct !== undefined ? (
            <EvolucaoBadge
              value={evolucaoPct}
              invert={invertEvolucao}
              className="mt-1"
            />
          ) : null}
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
