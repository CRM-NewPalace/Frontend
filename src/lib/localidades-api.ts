import { apiFetch } from "@/lib/api";

export type Localidade = {
  id: string;
  nome: string;
  createdAt: string;
  updatedAt: string;
  _count?: { construtoras: number };
};

export async function fetchLocalidades(): Promise<Localidade[]> {
  return apiFetch<Localidade[]>("/localidades");
}

export async function createLocalidade(nome: string): Promise<Localidade> {
  return apiFetch<Localidade>("/localidades", {
    method: "POST",
    body: { nome },
  });
}

export async function updateLocalidade(
  id: string,
  nome: string,
): Promise<Localidade> {
  return apiFetch<Localidade>(`/localidades/${id}`, {
    method: "PATCH",
    body: { nome },
  });
}

export async function deleteLocalidade(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/localidades/${id}`, {
    method: "DELETE",
  });
}
