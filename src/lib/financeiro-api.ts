import { apiFetch } from "@/lib/api";
import type {
  CentroDespesaResumo,
  ComissaoItem,
  FluxoDia,
  LinhaDemonstrativo,
  MesResumo,
  MovimentoFinanceiro,
  ParceiroFinanceiro,
  TipoParceiro,
  TituloFinanceiro,
} from "@/lib/financeiro-mock";

export type CreateParceiroInput = {
  nome: string;
  documento: string;
  tipo: TipoParceiro;
  email?: string;
  telefone?: string;
  cidade?: string;
  saldoAberto?: number;
  ativo?: boolean;
};

export type UpdateParceiroInput = Partial<CreateParceiroInput>;

export type VisaoGeralResponse = {
  kpis: {
    saldoAtual: number;
    receitasMes: number;
    despesasMes: number;
    aReceber: number;
    aPagar: number;
    resultadoMes: number;
    evolucaoReceitas: number | null;
    evolucaoDespesas: number | null;
    evolucaoResultado: number | null;
  };
  mesesResumo: MesResumo[];
  centros: CentroDespesaResumo[];
};

export type DemonstrativoResponse = {
  meses: string[];
  linhas: LinhaDemonstrativo[];
  mesesResumo: MesResumo[];
};

export async function fetchParceiros(): Promise<ParceiroFinanceiro[]> {
  return apiFetch<ParceiroFinanceiro[]>("/financeiro/parceiros");
}

export async function createParceiro(
  input: CreateParceiroInput,
): Promise<ParceiroFinanceiro> {
  return apiFetch<ParceiroFinanceiro>("/financeiro/parceiros", {
    method: "POST",
    body: input,
  });
}

export async function updateParceiro(
  id: string,
  input: UpdateParceiroInput,
): Promise<ParceiroFinanceiro> {
  return apiFetch<ParceiroFinanceiro>(`/financeiro/parceiros/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteParceiro(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/financeiro/parceiros/${id}`, {
    method: "DELETE",
  });
}

export async function fetchMovimentos(): Promise<MovimentoFinanceiro[]> {
  return apiFetch<MovimentoFinanceiro[]>("/financeiro/movimentos");
}

export async function fetchTitulos(
  tipo?: "receber" | "pagar",
): Promise<TituloFinanceiro[]> {
  const qs = tipo ? `?tipo=${tipo}` : "";
  return apiFetch<TituloFinanceiro[]>(`/financeiro/titulos${qs}`);
}

export async function fetchComissoes(): Promise<ComissaoItem[]> {
  return apiFetch<ComissaoItem[]>("/financeiro/comissoes");
}

export async function fetchVisaoGeral(): Promise<VisaoGeralResponse> {
  return apiFetch<VisaoGeralResponse>("/financeiro/visao-geral");
}

export async function fetchFluxoCaixa(): Promise<FluxoDia[]> {
  return apiFetch<FluxoDia[]>("/financeiro/fluxo-caixa");
}

export async function fetchCentrosDespesa(): Promise<CentroDespesaResumo[]> {
  return apiFetch<CentroDespesaResumo[]>("/financeiro/centros-despesa");
}

export async function fetchDemonstrativo(): Promise<DemonstrativoResponse> {
  return apiFetch<DemonstrativoResponse>("/financeiro/demonstrativo");
}
