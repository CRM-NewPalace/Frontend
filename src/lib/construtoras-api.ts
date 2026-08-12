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
  driveFolderUrl: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { empreendimentos: number; documentacoes: number };
};

export type CreateConstrutoraInput = {
  nome: string;
  cor?: string | null;
  contato?: string;
  endereco?: string;
  viabilizadorNome?: string;
  viabilizadorContato?: string;
  driveFolderUrl?: string | null;
};

export type UpdateConstrutoraInput = {
  nome?: string;
  cor?: string | null;
  contato?: string | null;
  endereco?: string | null;
  viabilizadorNome?: string | null;
  viabilizadorContato?: string | null;
  driveFolderUrl?: string | null;
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

export async function fetchConstrutoras(): Promise<Construtora[]> {
  return apiFetch<Construtora[]>("/construtoras");
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
