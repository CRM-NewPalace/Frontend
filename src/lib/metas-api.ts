import { apiFetch } from "@/lib/api";

export const META_TIPOS = ["vendas", "documentacoes", "vgv"] as const;
export type MetaTipo = (typeof META_TIPOS)[number];

export const META_PERIODOS = ["diaria", "semanal", "mensal"] as const;
export type MetaPeriodo = (typeof META_PERIODOS)[number];

export const META_TIPO_LABEL: Record<MetaTipo, string> = {
  vendas: "Vendas",
  documentacoes: "Documentações",
  vgv: "VGV",
};

export const META_PERIODO_LABEL: Record<MetaPeriodo, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  mensal: "Mensal",
};

export type Meta = {
  id: string;
  origem: "pessoal" | "gerente";
  tipo: MetaTipo;
  periodo: MetaPeriodo;
  valor: number;
  inicio: string;
  fim: string;
  atual: number;
  percentual: number;
  corretorId: string;
  criadorId: string;
  corretor: {
    id: string;
    name: string;
    equipeId: string | null;
    equipe: { id: string; name: string } | null;
  };
  criador: { id: string; name: string };
};

export type CreateMetaInput = {
  corretorId?: string;
  tipo: MetaTipo;
  periodo: MetaPeriodo;
  valor: number;
};

export function fetchMetas() {
  return apiFetch<Meta[]>("/metas");
}

export function createMeta(input: CreateMetaInput) {
  return apiFetch<Meta>("/metas", { method: "POST", body: input });
}

export function updateMeta(id: string, valor: number) {
  return apiFetch<Meta>(`/metas/${id}`, {
    method: "PATCH",
    body: { valor },
  });
}

export function deleteMeta(id: string) {
  return apiFetch<{ ok: true }>(`/metas/${id}`, { method: "DELETE" });
}
