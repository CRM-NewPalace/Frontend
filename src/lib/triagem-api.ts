import { apiFetch } from "@/lib/api";
import type { ContatoTipo, StageId } from "@/lib/crm-types";

export type TriagemOrigem = "funil" | "manual";

export interface TriagemContact {
  id: string;
  tipo: ContatoTipo;
  nome: string;
  telefone: string;
  email: string;
  stage: StageId;
  prioridade: string;
  interesse: string;
  cidade: string;
  bairro: string;
  corretorId: string | null;
  corretor: { id: string; name: string } | null;
  updatedAt: string;
}

export interface TriagemEvent {
  id: string;
  leadId: string;
  texto: string;
  stageAnterior: string | null;
  stageNovo: string | null;
  origem: TriagemOrigem;
  createdAt: string;
  autor: { id: string; name: string };
}

export interface TriagemLeadsResponse {
  leads: TriagemContact[];
  clientes: TriagemContact[];
}

export interface TriagemHistoryResponse {
  lead: {
    id: string;
    tipo: ContatoTipo;
    nome: string;
    stage: StageId;
    corretorId: string | null;
    corretor: { id: string; name: string } | null;
  };
  events: TriagemEvent[];
}

export type CreateTriagemInput = {
  leadId: string;
  texto: string;
  origem: TriagemOrigem;
  stage?: string;
};

/** Contatos da tela: corretor = leads+clientes; gestor = leads do corretorId. */
export async function fetchTriagemLeads(
  corretorId?: string,
): Promise<TriagemLeadsResponse> {
  const qs = new URLSearchParams();
  if (corretorId) qs.set("corretorId", corretorId);
  const query = qs.toString();
  return apiFetch<TriagemLeadsResponse>(
    `/triagem/leads${query ? `?${query}` : ""}`,
  );
}

export async function fetchTriagemHistory(
  leadId: string,
): Promise<TriagemHistoryResponse> {
  return apiFetch<TriagemHistoryResponse>(`/triagem/${leadId}`);
}

export async function createTriagemEvent(
  input: CreateTriagemInput,
): Promise<TriagemEvent> {
  return apiFetch<TriagemEvent>("/triagem", {
    method: "POST",
    body: input,
  });
}
