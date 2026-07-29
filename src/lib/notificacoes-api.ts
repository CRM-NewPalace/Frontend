import { apiFetch } from "@/lib/api";

export type NotificacaoTipo =
  | "analise_resultado"
  | "agenda_solicitacao"
  | "agenda_resposta"
  | "agenda_lembrete_1d"
  | "agenda_lembrete_2h"
  | "agenda_lembrete_1h";

export type Notificacao = {
  id: string;
  tipo: NotificacaoTipo;
  titulo: string;
  corpo: string;
  lida: boolean;
  leadId: string | null;
  analiseId: string | null;
  agendamentoId: string | null;
  createdAt: string;
};

export async function fetchNotificacoes(): Promise<Notificacao[]> {
  return apiFetch<Notificacao[]>("/notificacoes");
}

export async function markNotificacaoLida(id: string): Promise<Notificacao> {
  return apiFetch<Notificacao>(`/notificacoes/${id}/lida`, { method: "PATCH" });
}

export async function markAllNotificacoesLidas(): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/notificacoes/lidas", { method: "POST" });
}
