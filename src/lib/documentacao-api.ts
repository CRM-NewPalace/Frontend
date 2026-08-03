import { apiFetch } from "@/lib/api";
import type { ContatoTipo, StageId } from "@/lib/crm-types";

/** Defaults legados (fallback se o catálogo ainda não carregou). */
export const DEFAULT_DOCUMENTACAO_FONTES = [
  "Indicação",
  "Lead próprio",
  "Lista",
  "Campanha",
  "Outro",
] as const;

/** @deprecated Use labels do catálogo; mantido para compat com import/export. */
export const FONTE_LABELS: Record<string, string> = {
  indicacao: "Indicação",
  lead_proprio: "Lead próprio",
  lista: "Lista",
  campanha: "Campanha",
  outro: "Outro",
  Indicação: "Indicação",
  "Lead próprio": "Lead próprio",
  Lista: "Lista",
  Campanha: "Campanha",
  Outro: "Outro",
};

/** Defaults de Status 1 (crédito/análise). */
export const DEFAULT_STATUS1 = [
  "Aprovado",
  "Análise",
  "Aprovado c/ restrição",
] as const;

/** Defaults de Status 2 (andamento comercial). */
export const DEFAULT_STATUS2 = ["Vendido", "Bacen", "Andamento"] as const;

export interface Documentacao {
  id: string;
  leadId: string;
  tipoContato: ContatoTipo;
  stageSituacao: StageId;
  nome: string;
  construtoraId: string | null;
  empreendimentoId: string | null;
  fonte: string;
  status1: string;
  status2: string;
  corretorId: string | null;
  gerenteId: string | null;
  dataAnalise: string | null;
  dataVenda: string | null;
  vgv: number | null;
  obs: string | null;
  createdAt: string;
  updatedAt: string;
  autor: { id: string; name: string };
  construtora: { id: string; nome: string; cor: string | null } | null;
  empreendimento: { id: string; nome: string; cidade: string | null } | null;
  corretor: { id: string; name: string } | null;
  gerente: { id: string; name: string } | null;
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
  construtoraId?: string | null;
  empreendimentoId?: string | null;
  fonte: string;
  status1: string;
  status2: string;
  corretorId?: string | null;
  gerenteId?: string | null;
  dataAnalise?: string | null;
  dataVenda?: string | null;
  vgv?: number | null;
  obs?: string | null;
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
  return apiFetch<Documentacao[]>(`/documentacao${query ? `?${query}` : ""}`);
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

/** Normaliza valor de fonte (slug legado ou label) para o label exibido. */
export function displayFonte(fonte: string): string {
  return FONTE_LABELS[fonte] ?? fonte;
}
