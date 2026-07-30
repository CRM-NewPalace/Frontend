import { apiFetch } from "@/lib/api";
import type { ContatoTipo, StageId } from "@/lib/crm-types";

export type DocumentacaoFonte =
  | "indicacao"
  | "lead_proprio"
  | "lista"
  | "campanha"
  | "outro";

export type DocumentacaoStatus1 =
  | "aprovado"
  | "analise"
  | "aprovado_restricao";

export type DocumentacaoStatus2 = "vendido" | "bacen" | "andamento";

export const FONTE_LABELS: Record<DocumentacaoFonte, string> = {
  indicacao: "Indicação",
  lead_proprio: "Lead próprio",
  lista: "Lista",
  campanha: "Campanha",
  outro: "Outro",
};

export const STATUS1_LABELS: Record<DocumentacaoStatus1, string> = {
  aprovado: "Aprovado",
  analise: "Análise",
  aprovado_restricao: "Aprovado c/ restrição",
};

export const STATUS2_LABELS: Record<DocumentacaoStatus2, string> = {
  vendido: "Vendido",
  bacen: "Bacen",
  andamento: "Andamento",
};

export interface Documentacao {
  id: string;
  leadId: string;
  tipoContato: ContatoTipo;
  stageSituacao: StageId;
  nome: string;
  construtoraId: string | null;
  empreendimentoId: string | null;
  fonte: DocumentacaoFonte;
  status1: DocumentacaoStatus1;
  status2: DocumentacaoStatus2;
  corretorId: string | null;
  gerenteId: string | null;
  dataAnalise: string | null;
  dataVenda: string | null;
  vgv: number | null;
  obs: string | null;
  createdAt: string;
  updatedAt: string;
  autor: { id: string; name: string };
  construtora: { id: string; nome: string } | null;
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
  fonte: DocumentacaoFonte;
  status1: DocumentacaoStatus1;
  status2: DocumentacaoStatus2;
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
