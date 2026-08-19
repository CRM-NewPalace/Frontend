import {
  AGENDAMENTO_TIPO_DOT,
  AGENDAMENTO_TIPO_LABEL,
  type AgendamentoTipo,
} from "@/lib/agenda-api";
import { cn } from "@/lib/utils";

/** Bolinha na cor do tipo — a mesma do bloco no calendário. */
export function AgendamentoTipoDot({
  tipo,
  className,
}: {
  tipo: AgendamentoTipo;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "size-2.5 shrink-0 rounded-full",
        AGENDAMENTO_TIPO_DOT[tipo],
        className,
      )}
      aria-hidden
    />
  );
}

/** Item de select: cor + rótulo do tipo de atividade. */
export function AgendamentoTipoOption({ tipo }: { tipo: AgendamentoTipo }) {
  return (
    <span className="flex items-center gap-2">
      <AgendamentoTipoDot tipo={tipo} />
      {AGENDAMENTO_TIPO_LABEL[tipo]}
    </span>
  );
}
