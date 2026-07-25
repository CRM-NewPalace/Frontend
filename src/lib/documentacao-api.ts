import { apiFetch } from "@/lib/api";
import type { ContatoTipo, Lead, StageId } from "@/lib/crm-types";

export interface Documentacao {
  id: string;
  leadId: string;
  tipoContato: ContatoTipo;
  stageSituacao: StageId;
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: Lead["interesse"];
  cidade: string;
  bairro: string;
  prioridade: Lead["prioridade"];
  renda: number | null;
  tags: string[];
  temFgts: boolean;
  valorFgts: number | null;
  temEntrada: boolean;
  valorEntrada: number | null;
  temDependente: boolean;
  createdAt: string;
  updatedAt: string;
  autor: { id: string; name: string };
  lead: {
    id: string;
    tipo: ContatoTipo;
    nome: string;
    stage: StageId;
    corretorId: string | null;
    corretor: { id: string; name: string } | null;
  };
}

export type CreateDocumentacaoInput = {
  leadId: string;
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: Lead["interesse"];
  cidade: string;
  bairro: string;
  prioridade: Lead["prioridade"];
  renda?: number | null;
  tags?: string[];
  temFgts: boolean;
  valorFgts?: number | null;
  temEntrada: boolean;
  valorEntrada?: number | null;
  temDependente: boolean;
};

export type UpdateDocumentacaoInput = Partial<
  Omit<CreateDocumentacaoInput, "leadId">
>;

export async function fetchDocumentacoes(
  corretorId?: string,
): Promise<Documentacao[]> {
  const qs = new URLSearchParams();
  if (corretorId) qs.set("corretorId", corretorId);
  const query = qs.toString();
  return apiFetch<Documentacao[]>(
    `/documentacao${query ? `?${query}` : ""}`,
  );
}

export async function createDocumentacao(
  input: CreateDocumentacaoInput,
): Promise<Documentacao> {
  return apiFetch<Documentacao>("/documentacao", {
    method: "POST",
    body: input,
  });
}

export async function updateDocumentacao(
  id: string,
  input: UpdateDocumentacaoInput,
): Promise<Documentacao> {
  return apiFetch<Documentacao>(`/documentacao/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteDocumentacao(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/documentacao/${id}`, {
    method: "DELETE",
  });
}
