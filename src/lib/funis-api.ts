import { apiFetch } from "@/lib/api";

export type FunilEtapaPapel = "inicial" | "analise" | "venda" | "perdido";

export type FunilEtapa = {
  id: string;
  funilId: string;
  label: string;
  slug: string;
  color: string;
  sortOrder: number;
  active: boolean;
  papel: FunilEtapaPapel | null;
  createdAt: string;
  updatedAt: string;
};

export type Funil = {
  id: string;
  tenantId: string;
  name: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  etapas: FunilEtapa[];
};

export type CreateFunilInput = {
  name: string;
  usarPadrao?: boolean;
  etapas?: Array<{
    label: string;
    color?: string;
    sortOrder?: number;
    papel?: FunilEtapaPapel | null;
  }>;
  ativar?: boolean;
};

export type CreateFunilEtapaInput = {
  label: string;
  color?: string;
  sortOrder?: number;
  papel?: FunilEtapaPapel | null;
};

export type UpdateFunilEtapaInput = {
  label?: string;
  color?: string;
  active?: boolean;
  papel?: FunilEtapaPapel | null;
};

export async function fetchFunis(): Promise<Funil[]> {
  return apiFetch<Funil[]>("/funis");
}

export async function fetchFunilAtivo(): Promise<Funil> {
  return apiFetch<Funil>("/funis/ativo");
}

export async function createFunil(input: CreateFunilInput): Promise<Funil> {
  return apiFetch<Funil>("/funis", { method: "POST", body: input });
}

export async function updateFunil(
  id: string,
  input: { name: string },
): Promise<Funil> {
  return apiFetch<Funil>(`/funis/${id}`, { method: "PATCH", body: input });
}

export async function ativarFunil(id: string): Promise<Funil> {
  return apiFetch<Funil>(`/funis/${id}/ativar`, { method: "POST" });
}

export async function deleteFunil(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/funis/${id}`, { method: "DELETE" });
}

export async function addFunilEtapa(
  funilId: string,
  input: CreateFunilEtapaInput,
): Promise<Funil> {
  return apiFetch<Funil>(`/funis/${funilId}/etapas`, {
    method: "POST",
    body: input,
  });
}

export async function updateFunilEtapa(
  funilId: string,
  etapaId: string,
  input: UpdateFunilEtapaInput,
): Promise<Funil> {
  return apiFetch<Funil>(`/funis/${funilId}/etapas/${etapaId}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteFunilEtapa(
  funilId: string,
  etapaId: string,
): Promise<Funil> {
  return apiFetch<Funil>(`/funis/${funilId}/etapas/${etapaId}`, {
    method: "DELETE",
  });
}

export async function installFunilEtapasPadrao(
  funilId: string,
): Promise<Funil> {
  return apiFetch<Funil>(`/funis/${funilId}/etapas-padrao`, { method: "POST" });
}
