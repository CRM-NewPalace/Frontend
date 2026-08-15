import { apiFetch } from "@/lib/api";
import type { CSSProperties } from "react";

export type Construtora = {
  id: string;
  nome: string;
  cor: string | null;
  contato: string | null;
  endereco: string | null;
  viabilizadorNome: string | null;
  viabilizadorContato: string | null;
  cca: string | null;
  driveFolderUrl: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  localidades?: Array<{ id: string; nome: string }>;
  _count?: { empreendimentos: number; documentacoes: number };
  vendas?: number;
  vgv?: number;
};

export type ConstrutoraVenda = {
  id: string;
  corretorId: string | null;
  corretor: string;
  creci: string | null;
  gerente: string | null;
  construtora?: string | null;
  empreendimento: string | null;
  vgv: number;
  cliente: string;
  clienteCpf: string | null;
  dataVenda: string | null;
};

export type ConstrutoraVendas = {
  construtora: { id: string; nome: string; cor: string | null };
  totais: { vendas: number; vgv: number; corretores: number };
  items: ConstrutoraVenda[];
};

export type CreateConstrutoraInput = {
  nome: string;
  cor?: string | null;
  contato?: string;
  endereco?: string;
  viabilizadorNome?: string;
  viabilizadorContato?: string;
  cca?: string | null;
  driveFolderUrl?: string | null;
  localidadeIds?: string[];
};

export type UpdateConstrutoraInput = {
  nome?: string;
  cor?: string | null;
  contato?: string | null;
  endereco?: string | null;
  viabilizadorNome?: string | null;
  viabilizadorContato?: string | null;
  cca?: string | null;
  driveFolderUrl?: string | null;
  localidadeIds?: string[];
};

export const CONSTRUTORA_CORES_PRESET = [
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#ef4444",
  "#a855f7",
  "#f97316",
  "#06b6d4",
  "#64748b",
] as const;

export function construtoraBadgeStyle(
  cor: string | null | undefined,
): CSSProperties | undefined {
  if (!cor || !/^#[0-9A-Fa-f]{6}$/.test(cor)) return undefined;
  const r = Number.parseInt(cor.slice(1, 3), 16);
  const g = Number.parseInt(cor.slice(3, 5), 16);
  const b = Number.parseInt(cor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return {
    backgroundColor: cor,
    color: luminance > 0.62 ? "#111827" : "#ffffff",
  };
}

export async function fetchConstrutoras(params?: {
  sort?: string;
  localidadeId?: string;
  comDrive?: boolean;
  search?: string;
}): Promise<Construtora[]> {
  const qs = new URLSearchParams();
  if (params?.sort) qs.set("sort", params.sort);
  if (params?.localidadeId) qs.set("localidadeId", params.localidadeId);
  if (params?.comDrive) qs.set("comDrive", "true");
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString();
  return apiFetch<Construtora[]>(`/construtoras${query ? `?${query}` : ""}`);
}

export async function createConstrutora(
  input: CreateConstrutoraInput,
): Promise<Construtora> {
  return apiFetch<Construtora>("/construtoras", {
    method: "POST",
    body: input,
  });
}

export async function updateConstrutora(
  id: string,
  input: UpdateConstrutoraInput,
): Promise<Construtora> {
  return apiFetch<Construtora>(`/construtoras/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteConstrutora(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/construtoras/${id}`, {
    method: "DELETE",
  });
}

export const CONSTRUTORA_MAX_IMAGES = 1;

export async function uploadConstrutoraLogo(
  id: string,
  file: File,
): Promise<Construtora> {
  const data = new FormData();
  data.append("file", file);
  return apiFetch<Construtora>(`/construtoras/${id}/logo`, {
    method: "POST",
    body: data,
  });
}

export async function deleteConstrutoraLogo(id: string): Promise<Construtora> {
  return apiFetch<Construtora>(`/construtoras/${id}/logo`, {
    method: "DELETE",
  });
}

export async function fetchConstrutoraVendas(
  id: string,
  params?: { mes?: number; ano?: number },
): Promise<ConstrutoraVendas> {
  const qs = new URLSearchParams();
  if (params?.mes) qs.set("mes", String(params.mes));
  if (params?.ano) qs.set("ano", String(params.ano));
  const query = qs.toString();
  return apiFetch<ConstrutoraVendas>(
    `/construtoras/${id}/vendas${query ? `?${query}` : ""}`,
  );
}
