import {
  AlarmClockOff,
  Hourglass,
  Timer,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  formatDateTimePt,
  formatPrazoUnidade,
  MOTIVO_SEM_MOVIMENTACAO_LABEL,
  type LeadMonitoramento,
  type ProblemaMonitoramento,
} from "@/lib/lead-monitoramento";
import { cn } from "@/lib/utils";

const PROBLEMA_ICON: Record<ProblemaMonitoramento["tipo"], LucideIcon> = {
  prazo_ultrapassado: AlarmClockOff,
  tarefa_atrasada: TriangleAlert,
  sem_movimentacao: Timer,
  prazo_proximo: Hourglass,
};

export function monitoramentoCardClass(
  mon?: LeadMonitoramento | null,
): string {
  if (mon?.visual === "vermelho") {
    return "border-2 border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.25)]";
  }
  if (mon?.visual === "laranja") {
    return "border-2 border-orange-400 shadow-[0_0_0_1px_rgba(251,146,60,0.25)]";
  }
  return "";
}

export function OperacaoFunilAlerta({
  monitoramento,
}: {
  monitoramento?: LeadMonitoramento | null;
}) {
  const mon = monitoramento;
  if (!mon || mon.visual === "none" || mon.problemas.length === 0) return null;

  const isRed = mon.visual === "vermelho";
  const summary =
    mon.problemas[0]?.detalhe ??
    (isRed ? "Precisa de atenção" : "Prazo próximo do vencimento");
  const timeLabel = isRed
    ? (mon.tempoAtrasoLabel ?? mon.tempoSemMovimentacaoLabel)
    : (mon.tempoRestanteLabel ?? mon.permanenciaLabel);

  return (
    <div
      className={cn(
        "flex h-7 w-full items-center gap-1.5 rounded-md border px-1.5 text-left text-[10px] font-medium",
        isRed
          ? "border-red-500/25 bg-gradient-to-r from-red-500/15 via-rose-500/10 to-red-500/15 text-red-700 dark:text-red-300"
          : "border-orange-400/30 bg-gradient-to-r from-orange-400/18 via-amber-400/10 to-orange-400/18 text-orange-800 dark:text-orange-300",
      )}
    >
      <TriangleAlert className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">{summary}</span>
      {timeLabel ? (
        <span className="ml-auto shrink-0 tabular-nums">{timeLabel}</span>
      ) : null}
    </div>
  );
}

export function OperacaoMonitoramentoCard({
  monitoramento,
  inatividadeFallback,
}: {
  monitoramento?: LeadMonitoramento | null;
  inatividadeFallback?: string;
}) {
  const mon = monitoramento;
  if (!mon || mon.problemas.length === 0) return null;

  const isRed = mon.visual === "vermelho";
  const tempo = isRed
    ? (mon.tempoAtrasoLabel ?? mon.tempoSemMovimentacaoLabel)
    : (mon.tempoRestanteLabel ?? mon.permanenciaLabel);

  const fatos = [
    { label: "Entrada na etapa", value: formatDateTimePt(mon.stageEnteredAt) },
    {
      label: "Última movimentação",
      value: formatDateTimePt(mon.lastMovementAt),
    },
    {
      label: "Prazo da etapa",
      value: mon.prazoConfigurado
        ? formatPrazoUnidade(
            mon.prazoConfigurado.valor,
            mon.prazoConfigurado.unidade,
          ) + (mon.prazoAdiado ? " · adiado" : "")
        : "Sem prazo",
    },
    {
      label: "Alerta de inatividade",
      value: mon.inatividadeConfig
        ? formatPrazoUnidade(
            mon.inatividadeConfig.valor,
            mon.inatividadeConfig.unidade,
          )
        : (inatividadeFallback ?? "—"),
    },
  ];

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border",
        isRed ? "border-rose-500/30" : "border-orange-400/30",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2.5 px-3.5 py-2.5",
          isRed
            ? "bg-gradient-to-r from-rose-500/15 via-rose-500/8 to-transparent"
            : "bg-gradient-to-r from-orange-400/18 via-amber-400/10 to-transparent",
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            isRed
              ? "bg-rose-500/15 text-rose-600 dark:text-rose-300"
              : "bg-orange-500/15 text-orange-600 dark:text-orange-300",
          )}
        >
          <TriangleAlert className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {isRed ? "Precisa de atenção agora" : "Prazo próximo do vencimento"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {mon.problemas.map((problema) => problema.titulo).join(" · ")}
          </p>
        </div>
        {tempo ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
              isRed
                ? "bg-rose-500/15 text-rose-600 dark:text-rose-300"
                : "bg-orange-500/15 text-orange-600 dark:text-orange-300",
            )}
          >
            {tempo}
          </span>
        ) : null}
      </div>
      <div className="space-y-2.5 bg-card p-3">
        <div className="space-y-2">
          {mon.problemas.map((problema) => {
            const Icon = PROBLEMA_ICON[problema.tipo];
            return (
              <div
                key={problema.tipo}
                className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5"
              >
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{problema.titulo}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {problema.detalhe}
                  </p>
                  {problema.motivos && problema.motivos.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {problema.motivos.map((motivo) => (
                        <span
                          key={motivo}
                          className="rounded-full bg-background px-2 py-0.5 text-[10px] text-muted-foreground ring-1 ring-border/70"
                        >
                          {MOTIVO_SEM_MOVIMENTACAO_LABEL[motivo]}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
          {fatos.map((fato) => (
            <div key={fato.label} className="min-w-0">
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {fato.label}
              </dt>
              <dd className="truncate text-xs font-medium tabular-nums">
                {fato.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
