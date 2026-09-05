import { apiFetch, apiFetchFile } from "@/lib/api";

export type FuncionarioLancamento = {
  descricao: string;
  valor: number;
};

export type Funcionario = {
  id: string;
  nome: string;
  cargo: string;
  empresa: string;
  status: "ativo" | "inativo";
  salarioBruto: number;
  beneficios: FuncionarioLancamento[];
  descontos: FuncionarioLancamento[];
  observacoes: string;
  salarioLiquido: number;
  updatedAt: string;
  ultimaCompetencia: string | null;
  variacaoLiquido: number | null;
};

export type ContrachequeHistorico = {
  id: string;
  competenciaMes: number;
  competenciaAno: number;
  competenciaLabel: string;
  salarioBruto: number;
  salarioLiquido: number;
  dataPagamento: string;
  variacaoLiquido: number | null;
};

export type FuncionarioInput = {
  nome: string;
  cargo: string;
  empresa?: string;
  status?: "ativo" | "inativo";
  salarioBruto: number;
  beneficios: FuncionarioLancamento[];
  descontos: FuncionarioLancamento[];
  observacoes?: string;
};

export function fetchFuncionarios() {
  return apiFetch<Funcionario[]>("/funcionarios");
}

export function createFuncionario(body: FuncionarioInput) {
  return apiFetch<Funcionario>("/funcionarios", { method: "POST", body });
}

export function updateFuncionario(id: string, body: FuncionarioInput) {
  return apiFetch<Funcionario>(`/funcionarios/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteFuncionario(id: string) {
  return apiFetch<void>(`/funcionarios/${id}`, { method: "DELETE" });
}

export function fetchContracheques(id: string) {
  return apiFetch<ContrachequeHistorico[]>(`/funcionarios/${id}/contracheques`);
}

export async function downloadContracheque(id: string) {
  const { blob, filename } = await apiFetchFile(
    `/funcionarios/${id}/contracheque/pdf`,
    { method: "POST" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "contracheque.pdf";
  link.click();
  URL.revokeObjectURL(url);
}
