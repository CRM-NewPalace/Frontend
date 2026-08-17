export type PrazoUnidade = "minutos" | "horas" | "dias";

export type MonitoramentoFiltro =
  | "todos"
  | "sem_movimentacao"
  | "proximo_vencimento"
  | "em_atraso"
  | "dentro_prazo";

export type MonitoramentoVisual = "none" | "laranja" | "vermelho";

export type MonitoramentoNivel =
  | "normal"
  | "proximo"
  | "atrasado"
  | "sem_movimentacao";

export type MotivoSemMovimentacao =
  | "sem_status"
  | "sem_triagem"
  | "sem_atividade"
  | "sem_tarefa";

export type ProblemaMonitoramento = {
  tipo: "prazo_ultrapassado" | "sem_movimentacao" | "prazo_proximo";
  titulo: string;
  detalhe: string;
  motivos?: MotivoSemMovimentacao[];
};

export type LeadMonitoramento = {
  nivel: MonitoramentoNivel;
  visual: MonitoramentoVisual;
  problemas: ProblemaMonitoramento[];
  stageEnteredAt: string | null;
  prazoDueAt: string | null;
  prazoConfigurado: { valor: number; unidade: PrazoUnidade } | null;
  prazoAdiado: boolean;
  lastMovementAt: string | null;
  lastStageChangeAt: string | null;
  lastTriagemAt: string | null;
  lastTarefaAt: string | null;
  lastAtividadeAt: string | null;
  permanenciaMs: number;
  permanenciaLabel: string;
  tempoRestanteMs: number | null;
  tempoRestanteLabel: string | null;
  tempoAtrasoMs: number | null;
  tempoAtrasoLabel: string | null;
  tempoSemMovimentacaoMs: number;
  tempoSemMovimentacaoLabel: string;
  inatividadeThresholdMs: number;
  podeAdiar: boolean;
};

export type LeadPrazoAdiamento = {
  id: string;
  autorNome: string;
  prazoAnteriorLabel: string;
  prazoNovoLabel: string;
  motivo: string | null;
  createdAt: string;
};

export type CorretorMonitoramentoLead = {
  id: string;
  nome: string;
  stage: string;
  problemas: ProblemaMonitoramento[];
};

export type CorretorMonitoramento = {
  id: string;
  name: string;
  totalAtrasos: number;
  semMovimentacao: number;
  foraDoPrazo: number;
  leads: CorretorMonitoramentoLead[];
};

export const MOTIVO_SEM_MOVIMENTACAO_LABEL: Record<
  MotivoSemMovimentacao,
  string
> = {
  sem_status: "Sem alteração de status",
  sem_triagem: "Sem atualização na triagem",
  sem_atividade: "Sem atividade",
  sem_tarefa: "Sem tarefa",
};

export const MONITORAMENTO_FILTRO_OPTIONS: Array<{
  value: MonitoramentoFiltro;
  label: string;
}> = [
  { value: "todos", label: "Todos" },
  { value: "sem_movimentacao", label: "Sem movimentação" },
  { value: "proximo_vencimento", label: "Próximos do vencimento" },
  { value: "em_atraso", label: "Em atraso" },
  { value: "dentro_prazo", label: "Dentro do prazo" },
];

export const PRAZO_UNIDADE_OPTIONS: Array<{
  value: PrazoUnidade;
  label: string;
}> = [
  { value: "minutos", label: "Minutos" },
  { value: "horas", label: "Horas" },
  { value: "dias", label: "Dias" },
];

export function formatPrazoUnidade(valor: number, unidade: PrazoUnidade): string {
  if (unidade === "minutos") return `${valor}min`;
  if (unidade === "horas") return `${valor}h`;
  return valor === 1 ? "1 dia" : `${valor} dias`;
}

export function formatDateTimePt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
