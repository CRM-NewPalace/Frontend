import { cn } from "@/lib/utils";

export const FLOW_BAR_GRADIENTS = {
  sky: "linear-gradient(90deg, #0284c7 0%, #38bdf8 30%, #7dd3fc 50%, #0ea5e9 70%, #0284c7 100%)",
  emerald:
    "linear-gradient(90deg, #059669 0%, #34d399 30%, #6ee7b7 50%, #10b981 70%, #059669 100%)",
  rose: "linear-gradient(90deg, #e11d48 0%, #fb7185 30%, #fda4af 50%, #f43f5e 70%, #e11d48 100%)",
  amber:
    "linear-gradient(90deg, #d97706 0%, #fbbf24 30%, #fde68a 50%, #f59e0b 70%, #d97706 100%)",
  orange:
    "linear-gradient(90deg, #ea580c 0%, #fb923c 30%, #fdba74 50%, #f97316 70%, #ea580c 100%)",
  primary:
    "linear-gradient(90deg, #0e6f8a 0%, #079ed4 30%, #5bc4e8 50%, #079ed4 70%, #0e6f8a 100%)",
  navy: "linear-gradient(90deg, #053647 0%, #04648a 30%, #079ed4 50%, #057aa8 70%, #053647 100%)",
  slate:
    "linear-gradient(90deg, #475569 0%, #94a3b8 30%, #cbd5e1 50%, #64748b 70%, #475569 100%)",
} as const;

export type FlowBarTone = keyof typeof FLOW_BAR_GRADIENTS;

/** Trilho arredondado com preenchimento em fluxo (mesmo efeito da Taxa de conversão). */
export function FlowTrack({
  percent,
  tone = "primary",
  className,
}: {
  percent: number;
  tone?: FlowBarTone;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0));
  return (
    <div
      className={cn("h-2.5 overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className="funil-bar-flow h-full rounded-full transition-[width] duration-500"
        style={{
          width: `${pct}%`,
          backgroundImage: FLOW_BAR_GRADIENTS[tone],
        }}
      />
    </div>
  );
}

export function FlowBar({
  label,
  value,
  max,
  tone = "primary",
  className,
}: {
  label: string;
  value: number;
  max: number;
  tone?: FlowBarTone;
  className?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <FlowTrack percent={pct} tone={tone} />
    </div>
  );
}
