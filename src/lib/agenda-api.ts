import { ApiError, apiFetch } from "@/lib/api";
import type { Role } from "@/lib/auth";
import type { ContatoTipo, StageId } from "@/lib/crm-types";

export const AGENDAMENTO_TIPOS = [
  "visita",
  "ligacao",
  "reuniao",
  "tarefa",
  "outro",
  "bloqueio",
] as const;

export type AgendamentoTipo = (typeof AGENDAMENTO_TIPOS)[number];

export const AGENDAMENTO_STATUS = [
  "agendado",
  "concluido",
  "cancelado",
] as const;

export type AgendamentoStatus = (typeof AGENDAMENTO_STATUS)[number];

export const AGENDAMENTO_ESCOPOS = ["pessoal", "com_gerente"] as const;
export type AgendamentoEscopo = (typeof AGENDAMENTO_ESCOPOS)[number];

export const AGENDAMENTO_ALVOS = [
  "nenhum",
  "todos",
  "equipe",
  "gerente",
  "gerentes",
] as const;
export type AgendamentoAlvo = (typeof AGENDAMENTO_ALVOS)[number];

export const AGENDAMENTO_SOLICITACAO = [
  "nenhuma",
  "pendente",
  "aprovada",
  "recusada",
] as const;
export type AgendamentoSolicitacaoStatus =
  (typeof AGENDAMENTO_SOLICITACAO)[number];

export const AGENDAMENTO_RECURRENCE_FREQ = [
  "unica",
  "semanal",
  "mensal",
] as const;
export type AgendamentoRecurrenceFreq =
  (typeof AGENDAMENTO_RECURRENCE_FREQ)[number];

export const AGENDAMENTO_TIPO_LABEL: Record<AgendamentoTipo, string> = {
  visita: "Visita",
  ligacao: "Ligação",
  reuniao: "Reunião",
  tarefa: "Tarefa",
  outro: "Outro",
  bloqueio: "Bloqueio",
};

export const AGENDAMENTO_STATUS_LABEL: Record<AgendamentoStatus, string> = {
  agendado: "Agendado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const AGENDAMENTO_ESCOPO_LABEL: Record<AgendamentoEscopo, string> = {
  pessoal: "Tarefa pessoal",
  com_gerente: "Com o gerente",
};

export const AGENDAMENTO_ALVO_LABEL: Record<AgendamentoAlvo, string> = {
  nenhum: "Só eu (tarefa pessoal)",
  todos: "Todas as equipes",
  equipe: "Uma equipe",
  gerente: "Um gerente",
  gerentes: "Todos os gerentes",
};

export const AGENDAMENTO_RECURRENCE_LABEL: Record<
  AgendamentoRecurrenceFreq,
  string
> = {
  unica: "Único",
  semanal: "Semanal",
  mensal: "Mensal",
};

export const WEEKDAY_OPTIONS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
] as const;

/** Origem visual no calendário: quem criou o compromisso. */
export type AgendamentoOrigem =
  "admin" | "gerente" | "corretor" | "aniversario" | "bloqueio";

export const AGENDAMENTO_ORIGEM_LABEL: Record<AgendamentoOrigem, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  corretor: "Corretor (lead/cliente)",
  aniversario: "Aniversário",
  bloqueio: "Bloqueado",
};

/** Bolinha do autor na linha do horário (a cor do evento vem do tipo). */
export const AGENDAMENTO_ORIGEM_DOT: Record<AgendamentoOrigem, string> = {
  admin: "bg-indigo-500",
  gerente: "bg-teal-500",
  corretor: "bg-amber-500",
  aniversario: "bg-rose-500",
  bloqueio: "bg-slate-500",
};

/**
 * Chave visual do evento: o tipo de atividade, mais o aniversário (evento
 * virtual, sem tipo). Define a cor do bloco no calendário.
 */
export type AgendamentoVisual = AgendamentoTipo | "aniversario";

export const AGENDAMENTO_VISUAL_LABEL: Record<AgendamentoVisual, string> = {
  ...AGENDAMENTO_TIPO_LABEL,
  aniversario: "Aniversário",
};

/** Hachura do bloqueio: reforça o tipo mesmo em blocos pequenos. */
const BLOQUEIO_HATCH =
  "bg-[repeating-linear-gradient(135deg,transparent,transparent_4px,rgba(15,23,42,0.25)_4px,rgba(15,23,42,0.25)_8px)]";

/** Blocos sólidos (calendário semana/mês). */
export const AGENDAMENTO_TIPO_BLOCK: Record<AgendamentoVisual, string> = {
  visita: "bg-sky-500 border-sky-600 text-white",
  ligacao: "bg-emerald-500 border-emerald-600 text-white",
  reuniao: "bg-violet-500 border-violet-600 text-white",
  tarefa: "bg-amber-500 border-amber-600 text-white",
  outro: "bg-zinc-500 border-zinc-600 text-white",
  bloqueio: `bg-slate-400/80 border-slate-600 text-white border-dashed ${BLOQUEIO_HATCH}`,
  aniversario: "bg-rose-500 border-rose-600 text-white",
};

/** Badges e ícones suaves. */
export const AGENDAMENTO_TIPO_SOFT: Record<AgendamentoVisual, string> = {
  visita: "bg-sky-500/12 text-sky-800 dark:text-sky-200 border-sky-500/25",
  ligacao:
    "bg-emerald-500/12 text-emerald-800 dark:text-emerald-200 border-emerald-500/25",
  reuniao:
    "bg-violet-500/12 text-violet-800 dark:text-violet-200 border-violet-500/25",
  tarefa:
    "bg-amber-500/12 text-amber-800 dark:text-amber-200 border-amber-500/25",
  outro: "bg-zinc-500/12 text-zinc-800 dark:text-zinc-200 border-zinc-500/25",
  bloqueio:
    "bg-slate-500/10 text-slate-800 dark:text-slate-200 border-slate-500/35 border-dashed",
  aniversario:
    "bg-rose-500/12 text-rose-800 dark:text-rose-200 border-rose-500/25",
};

/** Cards da visão dia / tabela: fundo tintado + faixa à esquerda. */
export const AGENDAMENTO_TIPO_CARD: Record<AgendamentoVisual, string> = {
  visita: "bg-sky-500/10 border-sky-500/20 border-l-sky-500 text-foreground",
  ligacao:
    "bg-emerald-500/10 border-emerald-500/20 border-l-emerald-500 text-foreground",
  reuniao:
    "bg-violet-500/10 border-violet-500/20 border-l-violet-500 text-foreground",
  tarefa:
    "bg-amber-500/10 border-amber-500/20 border-l-amber-500 text-foreground",
  outro: "bg-zinc-500/10 border-zinc-500/20 border-l-zinc-500 text-foreground",
  bloqueio:
    "bg-slate-500/8 border-slate-500/30 border-l-slate-500 border-dashed text-foreground",
  aniversario:
    "bg-rose-500/10 border-rose-500/20 border-l-rose-500 text-foreground",
};

/** Bolinha da legenda e dos seletores de tipo. */
export const AGENDAMENTO_TIPO_DOT: Record<AgendamentoVisual, string> = {
  visita: "bg-sky-500",
  ligacao: "bg-emerald-500",
  reuniao: "bg-violet-500",
  tarefa: "bg-amber-500",
  outro: "bg-zinc-500",
  bloqueio: "bg-slate-400 ring-1 ring-slate-600",
  aniversario: "bg-rose-500",
};

export function isAgendamentoAniversario(item: {
  id: string;
  isAniversario?: boolean;
}) {
  return Boolean(item.isAniversario) || item.id.startsWith("aniversario:");
}

export function isAgendamentoBloqueio(item: { tipo: AgendamentoTipo }) {
  return item.tipo === "bloqueio";
}

/** Título principal no card do calendário. */
export function getAgendamentoCardTitle(item: {
  tipo: AgendamentoTipo;
  titulo: string;
  autor: { name: string };
}) {
  if (isAgendamentoBloqueio(item)) {
    return `Bloqueado · ${item.autor.name}`;
  }
  return item.titulo;
}

/** Linha secundária: quem atribuiu / título do bloqueio / lead. */
export function getAgendamentoCardSubtitle(item: {
  tipo: AgendamentoTipo;
  titulo: string;
  autor: { name: string };
  atribuidoParaId?: string | null;
  lead?: { nome: string } | null;
}) {
  if (isAgendamentoBloqueio(item)) {
    return item.titulo?.trim() || null;
  }
  if (item.atribuidoParaId) {
    const base = `De ${item.autor.name}`;
    return item.lead?.nome ? `${base} · ${item.lead.nome}` : base;
  }
  return item.lead?.nome ?? null;
}

/** Cor do evento: aniversário tem tom próprio; o resto segue o tipo. */
export function getAgendamentoVisual(item: {
  id: string;
  isAniversario?: boolean;
  tipo?: AgendamentoTipo;
}): AgendamentoVisual {
  if (isAgendamentoAniversario(item)) return "aniversario";
  return item.tipo ?? "outro";
}

export function getAgendamentoOrigem(item: {
  id: string;
  isAniversario?: boolean;
  tipo?: AgendamentoTipo;
  autor: { role: Role };
}): AgendamentoOrigem {
  if (isAgendamentoAniversario(item)) return "aniversario";
  if (item.tipo === "bloqueio") return "bloqueio";
  if (item.autor.role === "admin") return "admin";
  if (item.autor.role === "gerente") return "gerente";
  return "corretor";
}

export interface Agendamento {
  id: string;
  leadId: string | null;
  atribuidoParaId: string | null;
  titulo: string;
  tipo: AgendamentoTipo;
  status: AgendamentoStatus;
  escopo: AgendamentoEscopo;
  solicitacaoStatus: AgendamentoSolicitacaoStatus;
  alvoTipo: AgendamentoAlvo;
  alvoEquipeId: string | null;
  alvoGerenteId: string | null;
  seriesId: string | null;
  recurrenceFreq: AgendamentoRecurrenceFreq;
  recurrenceDays: number[];
  recurrenceUntil: string | null;
  startsAt: string;
  endsAt: string | null;
  local: string | null;
  observacoes: string | null;
  funilStage: string | null;
  motivoRecusa: string | null;
  aprovadoAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Evento virtual (aniversário de corretor) — somente leitura. */
  isAniversario?: boolean;
  autor: { id: string; name: string; role: Role };
  atribuidoPara: { id: string; name: string; role: Role } | null;
  aprovadoPor: { id: string; name: string } | null;
  alvoEquipe: { id: string; name: string } | null;
  alvoGerente: { id: string; name: string } | null;
  lead: {
    id: string;
    tipo: ContatoTipo;
    nome: string;
    telefone: string;
    stage: StageId;
    corretorId: string | null;
    corretor: { id: string; name: string } | null;
  } | null;
}

export type CreateAgendamentoInput = {
  leadId?: string | null;
  atribuidoParaId?: string | null;
  titulo: string;
  tipo: AgendamentoTipo;
  escopo: AgendamentoEscopo;
  alvoTipo?: AgendamentoAlvo;
  alvoEquipeId?: string | null;
  alvoGerenteId?: string | null;
  startsAt: string;
  endsAt?: string | null;
  local?: string | null;
  observacoes?: string | null;
  funilStage?: string | null;
  recurrenceFreq?: AgendamentoRecurrenceFreq;
  recurrenceDays?: number[];
  recurrenceUntil?: string | null;
};

export type UpdateAgendamentoInput = Partial<
  Omit<
    CreateAgendamentoInput,
    | "leadId"
    | "atribuidoParaId"
    | "recurrenceFreq"
    | "recurrenceDays"
    | "recurrenceUntil"
  >
> & {
  status?: AgendamentoStatus;
};

export type FetchAgendamentosParams = {
  corretorId?: string;
  equipeId?: string;
  tipo?: AgendamentoTipo;
  status?: AgendamentoStatus;
  from?: string;
  to?: string;
};

export async function fetchAgendamentos(
  params: FetchAgendamentosParams = {},
): Promise<Agendamento[]> {
  const qs = new URLSearchParams();
  if (params.corretorId) qs.set("corretorId", params.corretorId);
  if (params.equipeId) qs.set("equipeId", params.equipeId);
  if (params.tipo) qs.set("tipo", params.tipo);
  if (params.status) qs.set("status", params.status);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const query = qs.toString();
  return apiFetch<Agendamento[]>(`/agenda${query ? `?${query}` : ""}`);
}

export async function fetchSolicitacoesAgenda(): Promise<Agendamento[]> {
  return apiFetch<Agendamento[]>("/agenda/solicitacoes");
}

export async function fetchSolicitacoesAgendaCount(): Promise<{
  count: number;
}> {
  return apiFetch<{ count: number }>("/agenda/solicitacoes/count");
}

export async function createAgendamento(
  input: CreateAgendamentoInput,
): Promise<Agendamento> {
  try {
    return await apiFetch<Agendamento>("/agenda", {
      method: "POST",
      body: input,
    });
  } catch (err) {
    if (
      input.funilStage &&
      err instanceof ApiError &&
      err.status === 400 &&
      /funilStage/i.test(err.message)
    ) {
      const { funilStage: _funilStage, ...rest } = input;
      return apiFetch<Agendamento>("/agenda", {
        method: "POST",
        body: rest,
      });
    }
    throw err;
  }
}

export async function updateAgendamento(
  id: string,
  input: UpdateAgendamentoInput,
): Promise<Agendamento> {
  return apiFetch<Agendamento>(`/agenda/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function aprovarAgendamento(id: string): Promise<Agendamento> {
  return apiFetch<Agendamento>(`/agenda/${id}/aprovar`, { method: "POST" });
}

export async function recusarAgendamento(
  id: string,
  motivo?: string,
): Promise<Agendamento> {
  return apiFetch<Agendamento>(`/agenda/${id}/recusar`, {
    method: "POST",
    body: { motivo },
  });
}

export async function deleteAgendamento(
  id: string,
  opts?: { series?: "one" | "all" },
): Promise<void> {
  const qs = opts?.series === "all" ? "?series=all" : "";
  await apiFetch<{ ok: boolean }>(`/agenda/${id}${qs}`, {
    method: "DELETE",
  });
}

export type AgendaUrgencia = "nenhuma" | "dia" | "duas_horas" | "uma_hora";

export type AgendaProximo = {
  id: string;
  titulo: string;
  startsAt: string;
  local: string | null;
  leadNome: string | null;
  leadTipo: ContatoTipo | null;
  corretorNome: string | null;
  gerenteNome: string | null;
  equipeNome: string | null;
  publicoLabel: string | null;
  autorNome: string;
  autorRole: Role;
  nivel: "dia" | "duas_horas" | "uma_hora";
  msRestante: number;
};

export type AgendaLembretesResponse = {
  urgencia: AgendaUrgencia;
  proximosCount: number;
  solicitacoesCount: number;
  proximos: AgendaProximo[];
  novasNotificacoes: Array<{
    id: string;
    tipo: string;
    titulo: string;
    corpo: string;
  }>;
};

export async function fetchAgendaLembretes(): Promise<AgendaLembretesResponse> {
  return apiFetch<AgendaLembretesResponse>("/agenda/lembretes");
}
