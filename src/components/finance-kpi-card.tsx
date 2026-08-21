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
  | "rose"
  /** Escala progressiva de azul (claro → escuro). */
  | "blue-1"
  | "blue-2"
  | "blue-3"
  | "blue-4"
  | "blue-5"
  | "blue-6";

const TONE: Record<FinanceKpiTone, { bar: string; icon: string }> = {
  teal: { bar: "bg-teal-600", icon: "bg-teal-600" },
  emerald: { bar: "bg-cyan-600", icon: "bg-cyan-600" },
  orange: { bar: "bg-orange-500", icon: "bg-orange-500" },
  red: { bar: "bg-red-600", icon: "bg-red-600" },
  blue: { bar: "bg-blue-600", icon: "bg-blue-600" },
  violet: { bar: "bg-violet-600", icon: "bg-violet-600" },
  rose: { bar: "bg-rose-500", icon: "bg-rose-500" },
  "blue-1": { bar: "bg-[var(--kpi-seq-1,#5BC4E8)]", icon: "bg-[var(--kpi-seq-1,#5BC4E8)]" },
  "blue-2": { bar: "bg-[var(--kpi-seq-2,#079ED4)]", icon: "bg-[var(--kpi-seq-2,#079ED4)]" },
  "blue-3": { bar: "bg-[var(--kpi-seq-3,#0689BD)]", icon: "bg-[var(--kpi-seq-3,#0689BD)]" },
  "blue-4": { bar: "bg-[var(--kpi-seq-4,#057AA8)]", icon: "bg-[var(--kpi-seq-4,#057AA8)]" },
  "blue-5": { bar: "bg-[var(--kpi-seq-5,#04648A)]", icon: "bg-[var(--kpi-seq-5,#04648A)]" },
  "blue-6": { bar: "bg-[var(--kpi-seq-6,#034E6E)]", icon: "bg-[var(--kpi-seq-6,#034E6E)]" },
};

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function EvolucaoBadge({
  value,
  previous,
  className,
  invert = false,
}: {
  value: number | null | undefined;
  /** Valor absoluto do mês anterior (para contexto). */
  previous?: number;
  className?: string;
  /** Se true, alta é ruim (ex.: leads perdidos). */
  invert?: boolean;
}) {
  if (value == null) {
    return (
      <span
        className={cn(
          "inline-flex max-w-full flex-wrap items-center gap-0.5 text-[11px] text-muted-foreground leading-snug",
          className,
        )}
      >
        vs mês ant. 0
        {previous != null
          ? ` · ant. ${previous.toLocaleString("pt-BR")}`
          : ""}
      </span>
    );
  }
  const up = value > 0;
  const down = value < 0;
  const good = invert ? down : up;
  const bad = invert ? up : down;
  const Icon = up || value === 0 ? TrendingUp : TrendingDown;
  const prevLabel =
    previous != null ? ` · ant. ${previous.toLocaleString("pt-BR")}` : "";
  return (
    <span
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-0.5 text-[11px] font-semibold tabular-nums leading-snug",
        good && "text-emerald-600 dark:text-emerald-400",
        bad && "text-rose-600 dark:text-rose-400",
        value === 0 && "text-muted-foreground",
        className,
      )}
      title="Variação em relação ao mês calendário anterior (não é perda dos leads atuais)"
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="min-w-0 wrap-break-word">
        vs mês ant. {value > 0 ? "+" : ""}
        {value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
        {prevLabel}
      </span>
    </span>
  );
}

export function FinanceKpiCard({
  label,
  value,
  icon: Icon,
  tone,
  href,
  onClick,
  active = false,
  className,
  format = "money",
  evolucaoPct,
  valorMesAnterior,
  invertEvolucao = false,
  suffix,
  compact = false,
  showBar = true,
  valueLabel,
  search,
  detail,
  blurValue = false,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: FinanceKpiTone;
  href?: string;
  search?: Record<string, string | undefined>;
  onClick?: () => void;
  active?: boolean;
  className?: string;
  format?: "money" | "number" | "percent";
  evolucaoPct?: number | null;
  valorMesAnterior?: number;
  invertEvolucao?: boolean;
  suffix?: string;
  compact?: boolean;
  showBar?: boolean;
  /** Substitui o valor formatado (ex.: "1h 20min"). */
  valueLabel?: string;
  detail?: string;
  /** Borra o valor para privacidade (olhar por cima). */
  blurValue?: boolean;
}) {
  const t = TONE[tone];
  const display =
    valueLabel ??
    (format === "number"
      ? value.toLocaleString("pt-BR")
      : format === "percent"
        ? `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
        : money(value));

  const len = display.length;
  const valueSize = compact
    ? len > 14
      ? "text-sm leading-snug"
      : "text-base leading-tight"
    : len > 18
      ? "text-sm leading-snug"
      : len > 14
        ? "text-base leading-snug"
        : "text-xl leading-tight";

  const interactive = Boolean(href || onClick);

  const card = (
    <div
      className={cn(
        "h-full rounded-xl bg-card text-card-foreground shadow-sm border border-border/60 overflow-hidden min-w-0 flex flex-col",
        interactive && "transition-shadow hover:shadow-md",
        active && "border-primary/50 ring-2 ring-primary/25 shadow-md",
        className,
      )}
      title={blurValue ? undefined : display}
    >
      {showBar ? (
        <div
          className={cn("w-full shrink-0", compact ? "h-1" : "h-1.5", t.bar)}
        />
      ) : null}
      <div
        className={cn(
          "flex flex-1 items-center min-w-0",
          compact
            ? "gap-2 p-2.5 min-h-0"
            : "gap-2.5 sm:gap-3 p-3 sm:p-4 min-h-21 sm:min-h-23",
        )}
      >
        <div
          className={cn(
            "rounded-md flex items-center justify-center shrink-0 text-white shadow-sm",
            compact ? "w-8 h-8" : "w-8 h-8 sm:w-12 sm:h-12 sm:rounded-lg",
            t.icon,
          )}
        >
          <Icon className={cn(compact ? "w-4 h-4" : "w-4 h-4 sm:w-5 sm:h-5")} />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden flex flex-col justify-center">
          <div className="text-[11px] sm:text-xs text-muted-foreground leading-snug truncate">
            {label}
          </div>
          <div
            className={cn(
              "font-bold tracking-tight tabular-nums mt-0.5 text-foreground break-all sm:wrap-break-word",
              valueSize,
              blurValue && "select-none blur-[8px]",
            )}
          >
            {display}
            {suffix ? (
              <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                {suffix}
              </span>
            ) : null}
          </div>
          {evolucaoPct !== undefined ? (
            <EvolucaoBadge
              value={evolucaoPct}
              previous={valorMesAnterior}
              invert={invertEvolucao}
              className={cn("mt-1", blurValue && "select-none blur-[8px]")}
            />
          ) : compact ? null : (
            <span className="mt-1 block h-4.5" aria-hidden />
          )}
          {detail ? (
            <p
              className={cn(
                "mt-1 text-[11px] leading-snug text-muted-foreground",
                blurValue && "select-none blur-[8px]",
              )}
            >
              {detail}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        to={href}
        {...(search ? { search: search as never } : {})}
        className="block h-full min-w-0"
      >
        {card}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block h-full min-w-0 w-full text-left cursor-pointer"
        aria-pressed={active}
      >
        {card}
      </button>
    );
  }

  return card;
}
