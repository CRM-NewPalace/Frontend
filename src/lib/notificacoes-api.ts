import { apiFetch } from "@/lib/api";

export type NotificacaoTipo = "analise_resultado";

export type Notificacao = {
  id: string;
  tipo: NotificacaoTipo;
  titulo: string;
  corpo: string;
  lida: boolean;
  leadId: string | null;
  analiseId: string | null;
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
