import { apiFetch } from "@/lib/api";

export type Empreendimento = {
  id: string;
  nome: string;
  construtoraId: string | null;
  cidade: string | null;
  endereco: string | null;
  quartos: number | null;
  banheiros: number | null;
  areaM2: number | null;
  externalUrl: string | null;
  imagemUrl: string | null;
  externalKey: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  construtora: { id: string; nome: string; cor: string | null } | null;
};

export type SyncEmpreendimentosResult = {
  ok: boolean;
  source: "bundle" | "fallback";
  detail: string | null;
  total: number;
  created: number;
  updated: number;
};

export type CreateEmpreendimentoInput = {
  nome: string;
  construtoraId: string;
  cidade?: string;
};

export async function fetchEmpreendimentos(params?: {
  construtoraId?: string;
  ativo?: boolean;
}): Promise<Empreendimento[]> {
  const qs = new URLSearchParams();
  if (params?.construtoraId) qs.set("construtoraId", params.construtoraId);
  if (params?.ativo !== undefined) qs.set("ativo", String(params.ativo));
  const query = qs.toString();
  return apiFetch<Empreendimento[]>(
    `/empreendimentos${query ? `?${query}` : ""}`,
  );
}

export async function createEmpreendimento(
  input: CreateEmpreendimentoInput,
): Promise<Empreendimento> {
  return apiFetch<Empreendimento>("/empreendimentos", {
    method: "POST",
    body: input,
  });
}

export async function syncEmpreendimentosFromSite(): Promise<SyncEmpreendimentosResult> {
  return apiFetch<SyncEmpreendimentosResult>("/empreendimentos/sync", {
    method: "POST",
  });
}

export type UpdateEmpreendimentoInput = {
  nome?: string;
  construtoraId?: string | null;
  cidade?: string | null;
  endereco?: string | null;
  quartos?: number | null;
  banheiros?: number | null;
  areaM2?: number | null;
  externalUrl?: string | null;
  ativo?: boolean;
};

export async function updateEmpreendimento(
  id: string,
  input: UpdateEmpreendimentoInput,
): Promise<Empreendimento> {
  return apiFetch<Empreendimento>(`/empreendimentos/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteEmpreendimento(
  id: string,
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/empreendimentos/${id}`, {
    method: "DELETE",
  });
}
