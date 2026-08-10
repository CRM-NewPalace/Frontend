import { apiFetch } from "@/lib/api";
import type { PlatformContratoStatus } from "@/lib/platform-contratos-api";

export type CreatePlatformFornecedorContratoInput = {
  parceiroId: string;
  titulo: string;
  centro: string;
  valorAdesao?: number;
  qtdParcelasAdesao?: number;
  valorMensalidade: number;
  qtdMensalidades: number;
  dataInicio: string;
  vencimento: string;
  observacao?: string;
};

export type PlatformFornecedorContrato = {
  id: string;
  codigo: string;
  titulo: string;
  centro: string;
  status: PlatformContratoStatus;
  valorAdesao: number;
  valorMensalidade: number;
  qtdMensalidades: number;
  dataInicio: string;
  vencimento: string;
};

export function createPlatformFornecedorContratoComTitulos(
  input: CreatePlatformFornecedorContratoInput,
) {
  return apiFetch<PlatformFornecedorContrato>(
    "/platform-fornecedor-contratos/com-titulos",
    { method: "POST", body: input },
  );
}

export function fetchPlatformFornecedorContratos() {
  return apiFetch<PlatformFornecedorContrato[]>(
    "/platform-fornecedor-contratos",
  );
}
