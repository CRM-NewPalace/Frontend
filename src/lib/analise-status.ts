import { STATUS_CHIP_CLASS } from "@/lib/catalog-colors";
import type { AnaliseStatus } from "@/lib/crm-types";

export const ANALISE_STATUS_LABEL: Record<AnaliseStatus, string> = {
  pendente: "Pendente",
  em_analise: "Em análise",
  aprovado: "Análise aprovada",
  reprovado: "Análise reprovada",
};

/** No comercial só interessa o parecer fechado (aprovado/reprovado). */
export function shouldShowAnaliseStatus(status: AnaliseStatus): boolean {
  return status === "aprovado" || status === "reprovado";
}

export function analiseBadgeClass(status: AnaliseStatus): string {
  const size = STATUS_CHIP_CLASS;
  if (status === "aprovado")
    return `${size} border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`;
  if (status === "reprovado")
    return `${size} border-destructive/40 bg-destructive/10 text-destructive`;
  if (status === "em_analise")
    return `${size} border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300`;
  return `${size} border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300`;
}
