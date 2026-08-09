import { apiFetch } from "@/lib/api";
import type { TenantPlano } from "@/lib/tenant-modules";

export type PlatformContratoTipo = "assinatura" | "financeiro";
export type PlatformContratoStatus =
  | "proposta"
  | "ativo"
  | "atrasado"
  | "suspenso"
  | "cancelado"
  | "encerrado";

export type PlatformContratoParcelaStatus =
  | "aberto"
  | "pago"
  | "atrasado"
  | "cancelado";

export type PlatformContratoParcela = {
  id: string;
  numero: number;
  valor: number;
  vencimento: string;
  status: PlatformContratoParcelaStatus;
  dataPagamento: string | null;
  formaPagamento: string;
};

export type PlatformContrato = {
  id: string;
  codigo: string;
  titulo: string;
  tipo: PlatformContratoTipo;
  plano: TenantPlano | null;
  valor: number;
  valorAdesao?: number;
  valorMensalidade?: number;
  dataInicio: string;
  vencimento: string | null;
  status: PlatformContratoStatus;
  observacao: string;
  tenantId: string;
  tenantNome: string;
  tenantSlug: string;
  tenantPlano: TenantPlano;
  parcelas: PlatformContratoParcela[];
  qtdParcelas: number;
  valorPago: number;
  valorAberto: number;
  createdAt: string;
  updatedAt: string;
  grupoParcelasId?: string;
};

export type PlatformContratoParcelaInput = {
  numero: number;
  valor: number;
  vencimento: string;
};

export type CreatePlatformContratoInput = {
  tenantId: string;
  titulo: string;
  tipo: PlatformContratoTipo;
  plano?: TenantPlano | null;
  valor: number;
  dataInicio: string;
  vencimento?: string | null;
  status?: PlatformContratoStatus;
  observacao?: string;
  parcelas?: PlatformContratoParcelaInput[];
};

export type UpdatePlatformContratoInput = Partial<CreatePlatformContratoInput>;

export async function fetchPlatformContratos(): Promise<PlatformContrato[]> {
  return apiFetch<PlatformContrato[]>("/platform-contratos");
}

export async function createPlatformContrato(
  input: CreatePlatformContratoInput,
): Promise<PlatformContrato> {
  return apiFetch<PlatformContrato>("/platform-contratos", {
    method: "POST",
    body: input,
  });
}

export type CreatePlatformContratoComTitulosInput = {
  tenantId: string;
  titulo: string;
  tipo: PlatformContratoTipo;
  plano?: TenantPlano | null;
  valorAdesao: number;
  valorMensalidade: number;
  qtdMensalidades: number;
  dataInicio: string;
  vencimento: string;
  status?: PlatformContratoStatus;
  observacao?: string;
  categoria?: string;
  parceiroId?: string;
  parceiroNome?: string;
};

export async function createPlatformContratoComTitulos(
  input: CreatePlatformContratoComTitulosInput,
): Promise<PlatformContrato> {
  return apiFetch<PlatformContrato>("/platform-contratos/com-titulos", {
    method: "POST",
    body: input,
  });
}

export async function updatePlatformContrato(
  id: string,
  input: UpdatePlatformContratoInput,
): Promise<PlatformContrato> {
  return apiFetch<PlatformContrato>(`/platform-contratos/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deletePlatformContrato(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/platform-contratos/${id}`, {
    method: "DELETE",
  });
}

export async function baixarPlatformParcela(
  contratoId: string,
  parcelaId: string,
  input: { dataPagamento: string; formaPagamento?: string },
): Promise<PlatformContrato> {
  return apiFetch<PlatformContrato>(
    `/platform-contratos/${contratoId}/parcelas/${parcelaId}/baixar`,
    { method: "POST", body: input },
  );
}
