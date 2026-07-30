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
  externalKey: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  construtora: { id: string; nome: string } | null;
};

export type SyncEmpreendimentosResult = {
  ok: boolean;
  source: "bundle" | "fallback";
  detail: string | null;
  total: number;
  created: number;
  updated: number;
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

export async function syncEmpreendimentosFromSite(): Promise<SyncEmpreendimentosResult> {
  return apiFetch<SyncEmpreendimentosResult>("/empreendimentos/sync", {
    method: "POST",
  });
}
