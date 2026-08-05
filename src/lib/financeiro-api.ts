import { apiFetch } from "@/lib/api";
import type {
  CentroDespesaResumo,
  ComissaoItem,
  DespesaLancamento,
  DespesaTipo,
  FluxoBucket,
  FluxoGranularidade,
  FluxoItem,
  LinhaDemonstrativo,
  MesResumo,
  MovimentoFinanceiro,
  NaturezaDespesa,
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

export type CreateMovimentoInput = {
  data: string;
  descricao: string;
  parceiroId?: string;
  parceiroNome?: string;
  categoria: string;
  centro?: string;
  tipo: "entrada" | "saida";
  valor: number;
  status?: "aberto" | "pago" | "atrasado" | "cancelado";
  formaPagamento?: string;
};

export type UpdateMovimentoInput = Omit<
  Partial<CreateMovimentoInput>,
  "parceiroId" | "parceiroNome"
> & {
  parceiroId?: string | null;
  parceiroNome?: string | null;
};

export async function createMovimento(
  input: CreateMovimentoInput,
): Promise<MovimentoFinanceiro> {
  return apiFetch<MovimentoFinanceiro>("/financeiro/movimentos", {
    method: "POST",
    body: input,
  });
}

export async function updateMovimento(
  id: string,
  input: UpdateMovimentoInput,
): Promise<MovimentoFinanceiro> {
  return apiFetch<MovimentoFinanceiro>(`/financeiro/movimentos/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteMovimento(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/financeiro/movimentos/${id}`, {
    method: "DELETE",
  });
}

export async function fetchTitulos(
  tipo?: "receber" | "pagar",
  grupoParcelasId?: string,
): Promise<TituloFinanceiro[]> {
  const params = new URLSearchParams();
  if (tipo) params.set("tipo", tipo);
  if (grupoParcelasId) params.set("grupoParcelasId", grupoParcelasId);
  const qs = params.toString();
  return apiFetch<TituloFinanceiro[]>(
    `/financeiro/titulos${qs ? `?${qs}` : ""}`,
  );
}

export type CreateTituloInput = {
  tipo: "receber" | "pagar";
  descricao: string;
  parceiroId?: string;
  parceiroNome?: string;
  categoria?: string;
  centro?: string;
  vencimento: string;
  valor: number;
  status?: "aberto" | "pago" | "atrasado" | "cancelado";
  parcela?: string;
};

export type CreateTitulosParceladoInput = {
  tipo: "receber" | "pagar";
  descricao: string;
  parceiroId?: string;
  parceiroNome?: string;
  categoria?: string;
  centro?: string;
  parcelas: { vencimento: string; valor: number }[];
};

export type UpdateTituloInput = Omit<
  Partial<CreateTituloInput>,
  "parceiroId" | "parceiroNome"
> & {
  parceiroId?: string | null;
  parceiroNome?: string | null;
};

export async function createTitulo(
  input: CreateTituloInput,
): Promise<TituloFinanceiro> {
  return apiFetch<TituloFinanceiro>("/financeiro/titulos", {
    method: "POST",
    body: input,
  });
}

export async function createTitulosParcelado(
  input: CreateTitulosParceladoInput,
): Promise<TituloFinanceiro[]> {
  return apiFetch<TituloFinanceiro[]>("/financeiro/titulos/parcelado", {
    method: "POST",
    body: input,
  });
}

export async function updateTitulo(
  id: string,
  input: UpdateTituloInput,
): Promise<TituloFinanceiro> {
  return apiFetch<TituloFinanceiro>(`/financeiro/titulos/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function baixarTitulo(
  id: string,
  input: { dataPagamento: string; formaPagamento?: string },
): Promise<TituloFinanceiro> {
  return apiFetch<TituloFinanceiro>(`/financeiro/titulos/${id}/baixar`, {
    method: "POST",
    body: input,
  });
}

export async function deleteTitulo(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/financeiro/titulos/${id}`, {
    method: "DELETE",
  });
}

export async function fetchComissoes(): Promise<ComissaoItem[]> {
  return apiFetch<ComissaoItem[]>("/financeiro/comissoes");
}

export async function fetchVisaoGeral(): Promise<VisaoGeralResponse> {
  return apiFetch<VisaoGeralResponse>("/financeiro/visao-geral");
}

export async function fetchFluxoCaixa(params?: {
  from?: string;
  to?: string;
  granularidade?: FluxoGranularidade;
}): Promise<FluxoBucket[]> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.granularidade) qs.set("granularidade", params.granularidade);
  const query = qs.toString();
  return apiFetch<FluxoBucket[]>(
    `/financeiro/fluxo-caixa${query ? `?${query}` : ""}`,
  );
}

export async function fetchFluxoCaixaItens(params: {
  from: string;
  to?: string;
}): Promise<FluxoItem[]> {
  const qs = new URLSearchParams({ from: params.from });
  if (params.to) qs.set("to", params.to);
  return apiFetch<FluxoItem[]>(`/financeiro/fluxo-caixa/itens?${qs}`);
}

export async function fetchCentrosDespesa(): Promise<CentroDespesaResumo[]> {
  return apiFetch<CentroDespesaResumo[]>("/financeiro/centros-despesa");
}

export async function fetchDemonstrativo(): Promise<DemonstrativoResponse> {
  return apiFetch<DemonstrativoResponse>("/financeiro/demonstrativo");
}

export type CreateDespesaTipoInput = {
  nome: string;
  natureza: NaturezaDespesa;
  orcadoMensal?: number;
  ativo?: boolean;
};

export type UpdateDespesaTipoInput = Partial<CreateDespesaTipoInput>;

export type CreateDespesaInput = {
  tipoId: string;
  descricao: string;
  valor: number;
  data: string;
  observacao?: string;
  ativo?: boolean;
};

export type UpdateDespesaInput = Partial<CreateDespesaInput>;

export async function fetchDespesaTipos(
  natureza?: NaturezaDespesa,
): Promise<DespesaTipo[]> {
  const qs = natureza ? `?natureza=${natureza}` : "";
  return apiFetch<DespesaTipo[]>(`/financeiro/despesa-tipos${qs}`);
}

export async function createDespesaTipo(
  input: CreateDespesaTipoInput,
): Promise<DespesaTipo> {
  return apiFetch<DespesaTipo>("/financeiro/despesa-tipos", {
    method: "POST",
    body: input,
  });
}

export async function updateDespesaTipo(
  id: string,
  input: UpdateDespesaTipoInput,
): Promise<DespesaTipo> {
  return apiFetch<DespesaTipo>(`/financeiro/despesa-tipos/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteDespesaTipo(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/financeiro/despesa-tipos/${id}`, {
    method: "DELETE",
  });
}

export async function fetchDespesas(
  natureza?: NaturezaDespesa,
): Promise<DespesaLancamento[]> {
  const qs = natureza ? `?natureza=${natureza}` : "";
  return apiFetch<DespesaLancamento[]>(`/financeiro/despesas${qs}`);
}

export async function createDespesa(
  input: CreateDespesaInput,
): Promise<DespesaLancamento> {
  return apiFetch<DespesaLancamento>("/financeiro/despesas", {
    method: "POST",
    body: input,
  });
}

export async function updateDespesa(
  id: string,
  input: UpdateDespesaInput,
): Promise<DespesaLancamento> {
  return apiFetch<DespesaLancamento>(`/financeiro/despesas/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteDespesa(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/financeiro/despesas/${id}`, {
    method: "DELETE",
  });
}
