import { apiFetch } from "@/lib/api";
import type { AnaliseStatus, ContatoTipo, Lead, StageId } from "@/lib/crm-types";

/** Shape retornado pelo backend (Prisma select). */
export interface ApiLead {
  id: string;
  tipo: ContatoTipo;
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: Lead["interesse"];
  cidade: string;
  bairro: string;
  stage: StageId;
  prioridade: Lead["prioridade"];
  renda: number | null;
  tags: string[];
  corretorId: string | null;
  corretor: { id: string; name: string } | null;
  construtoraId?: string | null;
  construtora?: { id: string; nome: string } | null;
  empreendimentoId?: string | null;
  empreendimento?: { id: string; nome: string; cidade: string | null } | null;
  analise?: {
    id?: string;
    status: AnaliseStatus;
    parecer: string | null;
    analistaId?: string | null;
  } | null;
  perdidoAt?: string | null;
  motivoPerda?: string | null;
  perdidoPorId?: string | null;
  perdidoPor?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedLeads {
  data: ApiLead[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export type CreateLeadInput = {
  /** lead (padrão) ou cliente da carteira pessoal. */
  tipo?: ContatoTipo;
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: Lead["interesse"];
  cidade: string;
  bairro: string;
  stage?: StageId;
  prioridade?: Lead["prioridade"];
  renda?: number | null;
  tags?: string[];
  /** UUID do corretor dono. Omitido = backend atribui ao usuário logado. */
  corretorId?: string;
};

export type UpdateLeadInput = Partial<CreateLeadInput>;

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** Converte a resposta da API para o tipo Lead usado pelas telas. */
export function mapApiLead(api: ApiLead): Lead {
  return {
    id: api.id,
    tipo: api.tipo === "cliente" ? "cliente" : "lead",
    nome: api.nome,
    telefone: api.telefone,
    email: api.email,
    origem: api.origem,
    interesse: api.interesse,
    cidade: api.cidade,
    bairro: api.bairro,
    corretor: api.corretor?.name ?? "—",
    corretorId: api.corretorId,
    construtoraId: api.construtoraId ?? null,
    construtora: api.construtora ?? null,
    empreendimentoId: api.empreendimentoId ?? null,
    empreendimento: api.empreendimento ?? null,
    stage: api.stage,
    prioridade: api.prioridade,
    renda: api.renda ?? null,
    updatedAt: formatUpdatedAt(api.updatedAt),
    tags: api.tags ?? [],
    analise: api.analise ?? null,
  };
}

export type LeadAssignee = { id: string; name: string; role?: string };

/** Usuários ativos para o select de corretor (admin/gerente: equipe; corretor: só ele). */
export async function fetchLeadAssignees(): Promise<LeadAssignee[]> {
  return apiFetch<LeadAssignee[]>("/leads/assignees");
}

export async function fetchLeads(params?: {
  search?: string;
  tipo?: ContatoTipo;
  stage?: string;
  interesse?: string;
  prioridade?: string;
  origem?: string;
  corretorId?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedLeads> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.tipo) qs.set("tipo", params.tipo);
  if (params?.stage) qs.set("stage", params.stage);
  if (params?.interesse) qs.set("interesse", params.interesse);
  if (params?.prioridade) qs.set("prioridade", params.prioridade);
  if (params?.origem) qs.set("origem", params.origem);
  if (params?.corretorId) qs.set("corretorId", params.corretorId);
  qs.set("page", String(params?.page ?? 1));
  qs.set("limit", String(params?.limit ?? 100));
  const query = qs.toString();
  return apiFetch<PaginatedLeads>(`/leads?${query}`);
}

export async function createLead(input: CreateLeadInput): Promise<ApiLead> {
  return apiFetch<ApiLead>("/leads", { method: "POST", body: input });
}

export type ImportLeadInput = {
  nome: string;
  telefone: string;
  email?: string | null;
  origem?: string;
  interesse?: Lead["interesse"];
  cidade?: string;
  bairro?: string;
  prioridade?: Lead["prioridade"];
  renda?: number | null;
  corretorId?: string;
};

export type ImportLeadsResult = {
  ok: boolean;
  total: number;
  created: number;
  failed: number;
  leads: ApiLead[];
  errors: Array<{ index: number; nome: string; message: string }>;
};

export async function importLeads(
  leads: ImportLeadInput[],
): Promise<ImportLeadsResult> {
  return apiFetch<ImportLeadsResult>("/leads/import", {
    method: "POST",
    body: { leads },
  });
}

export type DistribuirResumoEquipes = {
  modo: "equipes";
  disponiveis: number;
  equipes: Array<{
    equipeId: string;
    nome: string;
    gerente: string;
    corretores: number;
  }>;
};

export type DistribuirResumoCorretores = {
  modo: "corretores";
  disponiveis: number;
  equipeId: string;
  equipeNome: string;
  corretores: Array<{ id: string; nome: string }>;
};

export type DistribuirResumo =
  | DistribuirResumoEquipes
  | DistribuirResumoCorretores;

export async function fetchDistribuirResumo(): Promise<DistribuirResumo> {
  return apiFetch<DistribuirResumo>("/leads/distribuir/resumo");
}

export async function distribuirLeadsEquipes(
  alocacoes: Array<{ equipeId: string; quantidade: number }>,
): Promise<{
  ok: boolean;
  total: number;
  alocacoes: Array<{ equipeId: string; nome: string; quantidade: number }>;
}> {
  return apiFetch("/leads/distribuir/equipes", {
    method: "POST",
    body: { modo: "equipes", alocacoes },
  });
}

export async function distribuirLeadsCorretores(
  porCorretor: number,
): Promise<{
  ok: boolean;
  total: number;
  porCorretor: number;
  distribuicao: Array<{
    corretorId: string;
    nome: string;
    quantidade: number;
  }>;
}> {
  return apiFetch("/leads/distribuir/corretores", {
    method: "POST",
    body: { modo: "corretores", porCorretor },
  });
}

export async function updateLeadApi(
  id: string,
  input: UpdateLeadInput,
): Promise<ApiLead> {
  return apiFetch<ApiLead>(`/leads/${id}`, { method: "PATCH", body: input });
}

export async function updateLeadStageApi(
  id: string,
  stage: StageId,
  extra?: { construtoraId?: string; empreendimentoId?: string },
): Promise<ApiLead> {
  return apiFetch<ApiLead>(`/leads/${id}/stage`, {
    method: "PATCH",
    body: {
      stage,
      ...(extra?.construtoraId ? { construtoraId: extra.construtoraId } : {}),
      ...(extra?.empreendimentoId
        ? { empreendimentoId: extra.empreendimentoId }
        : {}),
    },
  });
}

export async function markLeadLostApi(id: string, motivo: string): Promise<ApiLead> {
  return apiFetch<ApiLead>(`/leads/${id}/perder`, {
    method: "POST",
    body: { motivo },
  });
}

export async function fetchLostLeads(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedLeads> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  qs.set("page", String(params?.page ?? 1));
  qs.set("limit", String(params?.limit ?? 100));
  return apiFetch<PaginatedLeads>(`/leads/perdidos?${qs.toString()}`);
}

/** Exclusão definitiva (admin, só leads já perdidos). */
export async function deleteLeadApi(id: string): Promise<void> {
  await apiFetch<void>(`/leads/${id}`, { method: "DELETE" });
}
