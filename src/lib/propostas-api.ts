import { apiFetch } from "@/lib/api";

export type PropostaStatus =
  | "rascunho"
  | "enviada"
  | "negociacao"
  | "aceita"
  | "recusada"
  | "expirada";

export const PROPOSTA_STATUS_LABEL: Record<PropostaStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  negociacao: "Em negociação",
  aceita: "Aceita",
  recusada: "Recusada",
  expirada: "Expirada",
};

export function propostaStatusClass(status: PropostaStatus) {
  switch (status) {
    case "aceita":
      return "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "enviada":
      return "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300";
    case "negociacao":
      return "border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-300";
    case "rascunho":
      return "border-transparent bg-muted text-muted-foreground";
    case "recusada":
      return "border-transparent bg-destructive/15 text-destructive";
    case "expirada":
      return "border-transparent bg-orange-500/15 text-orange-800 dark:text-orange-300";
    default:
      return "border-transparent bg-secondary text-secondary-foreground";
  }
}

export type Proposta = {
  id: string;
  codigo: string;
  leadId: string | null;
  clienteNome: string;
  clienteTelefone: string | null;
  construtoraId: string | null;
  empreendimentoId: string | null;
  unidade: string | null;
  corretorId: string | null;
  autorId: string;
  valor: number;
  entrada: number | null;
  financiamento: number | null;
  status: PropostaStatus;
  validade: string | null;
  enviadaEm: string | null;
  observacao: string | null;
  createdAt: string;
  updatedAt: string;
  autor: { id: string; name: string };
  corretor: { id: string; name: string } | null;
  construtora: { id: string; nome: string; cor: string | null } | null;
  empreendimento: { id: string; nome: string; cidade: string | null } | null;
  lead: {
    id: string;
    tipo: string;
    nome: string;
    telefone: string | null;
    corretorId: string | null;
    equipe: { id: string; name: string } | null;
  } | null;
};

export type CreatePropostaInput = {
  leadId?: string | null;
  clienteNome: string;
  clienteTelefone?: string | null;
  construtoraId?: string | null;
  empreendimentoId?: string | null;
  unidade?: string | null;
  corretorId?: string | null;
  valor: number;
  entrada?: number | null;
  financiamento?: number | null;
  status?: PropostaStatus;
  validade?: string | null;
  observacao?: string | null;
};

export type UpdatePropostaInput = Partial<CreatePropostaInput>;

export async function fetchPropostas(params?: {
  corretorId?: string;
  status?: PropostaStatus;
}): Promise<Proposta[]> {
  const qs = new URLSearchParams();
  if (params?.corretorId) qs.set("corretorId", params.corretorId);
  if (params?.status) qs.set("status", params.status);
  const query = qs.toString();
  return apiFetch<Proposta[]>(`/propostas${query ? `?${query}` : ""}`);
}

export async function fetchProposta(id: string): Promise<Proposta> {
  return apiFetch<Proposta>(`/propostas/${id}`);
}

export async function createProposta(
  input: CreatePropostaInput,
): Promise<Proposta> {
  return apiFetch<Proposta>("/propostas", { method: "POST", body: input });
}

export async function updateProposta(
  id: string,
  input: UpdatePropostaInput,
): Promise<Proposta> {
  return apiFetch<Proposta>(`/propostas/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteProposta(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/propostas/${id}`, { method: "DELETE" });
}

export function formatPropostaDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const day = iso.slice(0, 10);
  return new Date(day + "T12:00:00").toLocaleDateString("pt-BR");
}
