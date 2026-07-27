import { apiFetch } from "@/lib/api";
import type { ContatoTipo, StageId } from "@/lib/crm-types";

export const AGENDAMENTO_TIPOS = [
  "visita",
  "ligacao",
  "reuniao",
  "outro",
] as const;

export type AgendamentoTipo = (typeof AGENDAMENTO_TIPOS)[number];

export const AGENDAMENTO_STATUS = [
  "agendado",
  "concluido",
  "cancelado",
] as const;

export type AgendamentoStatus = (typeof AGENDAMENTO_STATUS)[number];

export const AGENDAMENTO_TIPO_LABEL: Record<AgendamentoTipo, string> = {
  visita: "Visita",
  ligacao: "Ligação",
  reuniao: "Reunião",
  outro: "Outro",
};

export const AGENDAMENTO_STATUS_LABEL: Record<AgendamentoStatus, string> = {
  agendado: "Agendado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export interface Agendamento {
  id: string;
  leadId: string;
  titulo: string;
  tipo: AgendamentoTipo;
  status: AgendamentoStatus;
  startsAt: string;
  endsAt: string | null;
  local: string | null;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
  autor: { id: string; name: string };
  lead: {
    id: string;
    tipo: ContatoTipo;
    nome: string;
    telefone: string;
    stage: StageId;
    corretorId: string | null;
    corretor: { id: string; name: string } | null;
  };
}

export type CreateAgendamentoInput = {
  leadId: string;
  titulo: string;
  tipo: AgendamentoTipo;
  startsAt: string;
  endsAt?: string | null;
  local?: string | null;
  observacoes?: string | null;
};

export type UpdateAgendamentoInput = Partial<
  Omit<CreateAgendamentoInput, "leadId">
> & {
  status?: AgendamentoStatus;
};

export type FetchAgendamentosParams = {
  corretorId?: string;
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
  if (params.tipo) qs.set("tipo", params.tipo);
  if (params.status) qs.set("status", params.status);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const query = qs.toString();
  return apiFetch<Agendamento[]>(`/agenda${query ? `?${query}` : ""}`);
}

export async function createAgendamento(
  input: CreateAgendamentoInput,
): Promise<Agendamento> {
  return apiFetch<Agendamento>("/agenda", {
    method: "POST",
    body: input,
  });
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

export async function deleteAgendamento(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/agenda/${id}`, {
    method: "DELETE",
  });
}
