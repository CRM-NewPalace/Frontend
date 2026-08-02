import { apiFetch } from "@/lib/api";

export type Construtora = {
  id: string;
  nome: string;
  contato: string | null;
  endereco: string | null;
  viabilizadorNome: string | null;
  viabilizadorContato: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { empreendimentos: number; documentacoes: number };
};

export type CreateConstrutoraInput = {
  nome: string;
  contato?: string;
  endereco?: string;
  viabilizadorNome?: string;
  viabilizadorContato?: string;
};

export type UpdateConstrutoraInput = {
  nome?: string;
  contato?: string | null;
  endereco?: string | null;
  viabilizadorNome?: string | null;
  viabilizadorContato?: string | null;
};

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
