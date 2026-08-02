/** Dados demonstrativos do módulo Financeiro (sem API). */

export type PeriodoFiltro = "mes" | "trimestre" | "ano" | "tudo";
export type StatusTitulo = "aberto" | "pago" | "atrasado" | "cancelado";
export type TipoParceiro = "cliente" | "fornecedor" | "ambos";
export type TipoMovimento = "entrada" | "saida";

export function brl(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function brlCompact(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");
}

export const PERIODO_OPTIONS: { value: PeriodoFiltro; label: string }[] = [
  { value: "mes", label: "Mês atual" },
  { value: "trimestre", label: "Trimestre" },
  { value: "ano", label: "Ano" },
  { value: "tudo", label: "Todo o período" },
];

export const STATUS_OPTIONS: { value: StatusTitulo | "todos"; label: string }[] =
  [
    { value: "todos", label: "Todos os status" },
    { value: "aberto", label: "Aberto" },
    { value: "pago", label: "Pago" },
    { value: "atrasado", label: "Atrasado" },
    { value: "cancelado", label: "Cancelado" },
  ];

export const CENTROS_DESPESA = [
  "Comercial",
  "Marketing",
  "Administrativo",
  "TI",
  "Operações",
  "RH",
] as const;

export const CATEGORIAS_ENTRADA = [
  "Comissão de venda",
  "Taxa de corretagem",
  "Consultoria",
  "Outras receitas",
] as const;

export const CATEGORIAS_SAIDA = [
  "Aluguel",
  "Folha de pagamento",
  "Marketing digital",
  "Software / SaaS",
  "Impostos",
  "Comissão corretor",
  "Despesas gerais",
  "Energia / utilidades",
] as const;

export interface ParceiroFinanceiro {
  id: string;
  nome: string;
  documento: string;
  tipo: TipoParceiro;
  email: string;
  telefone: string;
  cidade: string;
  saldoAberto: number;
  ativo: boolean;
}

export interface MovimentoFinanceiro {
  id: string;
  data: string;
  descricao: string;
  parceiro: string;
  categoria: string;
  centro: string;
  tipo: TipoMovimento;
  valor: number;
  status: StatusTitulo;
  formaPagamento: string;
}

export interface TituloFinanceiro {
  id: string;
  descricao: string;
  parceiro: string;
  categoria: string;
  centro: string;
  vencimento: string;
  valor: number;
  status: StatusTitulo;
  parcela: string;
}

export interface ComissaoItem {
  id: string;
  corretor: string;
  equipe: string;
  empreendimento: string;
  cliente: string;
  dataVenda: string;
  vgv: number;
  percentual: number;
  valor: number;
  status: "pendente" | "liberada" | "paga";
}

export interface FluxoDia {
  dia: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

export interface MesResumo {
  mes: string;
  receitas: number;
  despesas: number;
}

export interface CentroDespesaResumo {
  centro: string;
  orcado: number;
  realizado: number;
  percentual: number;
}

export interface LinhaDemonstrativo {
  id: string;
  grupo: "receita" | "custo" | "despesa" | "resultado";
  label: string;
  valores: Record<string, number>;
  destaque?: boolean;
}

export const MOCK_PARCEIROS: ParceiroFinanceiro[] = [
  {
    id: "p1",
    nome: "Construtora Horizonte Ltda",
    documento: "12.345.678/0001-90",
    tipo: "cliente",
    email: "financeiro@horizonte.com.br",
    telefone: "(11) 3456-7890",
    cidade: "São Paulo",
    saldoAberto: 186500,
    ativo: true,
  },
  {
    id: "p2",
    nome: "MRV Engenharia",
    documento: "08.343.492/0001-20",
    tipo: "cliente",
    email: "parceiros@mrv.com.br",
    telefone: "(31) 4000-1000",
    cidade: "Belo Horizonte",
    saldoAberto: 92400,
    ativo: true,
  },
  {
    id: "p3",
    nome: "Cyrela Brazil Realty",
    documento: "73.178.600/0001-18",
    tipo: "cliente",
    email: "comissoes@cyrela.com.br",
    telefone: "(11) 3500-2000",
    cidade: "São Paulo",
    saldoAberto: 241800,
    ativo: true,
  },
  {
    id: "p4",
    nome: "Google Ads Brasil",
    documento: "06.990.590/0001-23",
    tipo: "fornecedor",
    email: "billing@google.com",
    telefone: "(11) 3003-3000",
    cidade: "São Paulo",
    saldoAberto: -12800,
    ativo: true,
  },
  {
    id: "p5",
    nome: "Meta Platforms",
    documento: "33.000.167/0001-01",
    tipo: "fornecedor",
    email: "ads@meta.com",
    telefone: "(11) 3003-4000",
    cidade: "São Paulo",
    saldoAberto: -9450,
    ativo: true,
  },
  {
    id: "p6",
    nome: "Escritório Plaza Coworking",
    documento: "45.678.901/0001-55",
    tipo: "fornecedor",
    email: "financeiro@plazacowork.com.br",
    telefone: "(11) 3090-1122",
    cidade: "São Paulo",
    saldoAberto: -8500,
    ativo: true,
  },
  {
    id: "p7",
    nome: "Ana Paula Mendes",
    documento: "123.456.789-00",
    tipo: "cliente",
    email: "ana.mendes@email.com",
    telefone: "(11) 99876-5432",
    cidade: "Campinas",
    saldoAberto: 4500,
    ativo: true,
  },
  {
    id: "p8",
    nome: "Contabilidade Silva & Associados",
    documento: "22.111.333/0001-44",
    tipo: "fornecedor",
    email: "contato@silvaassoc.com.br",
    telefone: "(11) 3123-4567",
    cidade: "São Paulo",
    saldoAberto: -3200,
    ativo: true,
  },
  {
    id: "p9",
    nome: "Tecnisa S.A.",
    documento: "08.065.557/0001-12",
    tipo: "ambos",
    email: "parcerias@tecnisa.com.br",
    telefone: "(11) 3708-0000",
    cidade: "São Paulo",
    saldoAberto: 67800,
    ativo: false,
  },
  {
    id: "p10",
    nome: "Carlos Eduardo Lima",
    documento: "987.654.321-11",
    tipo: "cliente",
    email: "carlos.lima@email.com",
    telefone: "(19) 98765-4321",
    cidade: "Campinas",
    saldoAberto: 0,
    ativo: true,
  },
];

export const MOCK_MOVIMENTOS: MovimentoFinanceiro[] = [
  {
    id: "m1",
    data: "2026-07-28",
    descricao: "Comissão venda apto 1204 — Residencial Aurora",
    parceiro: "Construtora Horizonte Ltda",
    categoria: "Comissão de venda",
    centro: "Comercial",
    tipo: "entrada",
    valor: 42500,
    status: "pago",
    formaPagamento: "PIX",
  },
  {
    id: "m2",
    data: "2026-07-27",
    descricao: "Google Ads — campanha julho",
    parceiro: "Google Ads Brasil",
    categoria: "Marketing digital",
    centro: "Marketing",
    tipo: "saida",
    valor: 6800,
    status: "pago",
    formaPagamento: "Cartão",
  },
  {
    id: "m3",
    data: "2026-07-26",
    descricao: "Comissão venda casa — Loteamento Verde Vale",
    parceiro: "MRV Engenharia",
    categoria: "Comissão de venda",
    centro: "Comercial",
    tipo: "entrada",
    valor: 31200,
    status: "pago",
    formaPagamento: "TED",
  },
  {
    id: "m4",
    data: "2026-07-25",
    descricao: "Aluguel escritório Plaza — julho",
    parceiro: "Escritório Plaza Coworking",
    categoria: "Aluguel",
    centro: "Administrativo",
    tipo: "saida",
    valor: 8500,
    status: "pago",
    formaPagamento: "Boleto",
  },
  {
    id: "m5",
    data: "2026-07-24",
    descricao: "Folha de pagamento — julho",
    parceiro: "Folha interna",
    categoria: "Folha de pagamento",
    centro: "RH",
    tipo: "saida",
    valor: 68400,
    status: "pago",
    formaPagamento: "TED",
  },
  {
    id: "m6",
    data: "2026-07-22",
    descricao: "Comissão Cyrela — Torre B unidade 802",
    parceiro: "Cyrela Brazil Realty",
    categoria: "Comissão de venda",
    centro: "Comercial",
    tipo: "entrada",
    valor: 58900,
    status: "pago",
    formaPagamento: "PIX",
  },
  {
    id: "m7",
    data: "2026-07-20",
    descricao: "Meta Ads — leads julho",
    parceiro: "Meta Platforms",
    categoria: "Marketing digital",
    centro: "Marketing",
    tipo: "saida",
    valor: 9450,
    status: "pago",
    formaPagamento: "Cartão",
  },
  {
    id: "m8",
    data: "2026-07-18",
    descricao: "Assinatura CRM + telefonia",
    parceiro: "Fornecedores TI",
    categoria: "Software / SaaS",
    centro: "TI",
    tipo: "saida",
    valor: 1890,
    status: "pago",
    formaPagamento: "Cartão",
  },
  {
    id: "m9",
    data: "2026-07-15",
    descricao: "Repasse comissão — Juliana Costa",
    parceiro: "Juliana Costa",
    categoria: "Comissão corretor",
    centro: "Comercial",
    tipo: "saida",
    valor: 12750,
    status: "pago",
    formaPagamento: "PIX",
  },
  {
    id: "m10",
    data: "2026-07-12",
    descricao: "Taxa corretagem — Ana Paula Mendes",
    parceiro: "Ana Paula Mendes",
    categoria: "Taxa de corretagem",
    centro: "Comercial",
    tipo: "entrada",
    valor: 4500,
    status: "aberto",
    formaPagamento: "Boleto",
  },
  {
    id: "m11",
    data: "2026-07-10",
    descricao: "Honorários contábeis — julho",
    parceiro: "Contabilidade Silva & Associados",
    categoria: "Despesas gerais",
    centro: "Administrativo",
    tipo: "saida",
    valor: 3200,
    status: "atrasado",
    formaPagamento: "Boleto",
  },
  {
    id: "m12",
    data: "2026-07-08",
    descricao: "Comissão Tecnisa — Parque das Flores",
    parceiro: "Tecnisa S.A.",
    categoria: "Comissão de venda",
    centro: "Comercial",
    tipo: "entrada",
    valor: 27800,
    status: "pago",
    formaPagamento: "TED",
  },
  {
    id: "m13",
    data: "2026-07-05",
    descricao: "Energia e internet — julho",
    parceiro: "Utilidades",
    categoria: "Energia / utilidades",
    centro: "Operações",
    tipo: "saida",
    valor: 2140,
    status: "pago",
    formaPagamento: "Débito automático",
  },
  {
    id: "m14",
    data: "2026-07-03",
    descricao: "ISS / impostos sobre comissões",
    parceiro: "Receita Federal / Pref.",
    categoria: "Impostos",
    centro: "Administrativo",
    tipo: "saida",
    valor: 15600,
    status: "pago",
    formaPagamento: "TED",
  },
  {
    id: "m15",
    data: "2026-06-28",
    descricao: "Comissão venda — Residencial Aurora 905",
    parceiro: "Construtora Horizonte Ltda",
    categoria: "Comissão de venda",
    centro: "Comercial",
    tipo: "entrada",
    valor: 39800,
    status: "pago",
    formaPagamento: "PIX",
  },
];

export const MOCK_A_RECEBER: TituloFinanceiro[] = [
  {
    id: "cr1",
    descricao: "Comissão Cyrela — Torre C 1501",
    parceiro: "Cyrela Brazil Realty",
    categoria: "Comissão de venda",
    centro: "Comercial",
    vencimento: "2026-08-05",
    valor: 67200,
    status: "aberto",
    parcela: "1/1",
  },
  {
    id: "cr2",
    descricao: "Comissão Horizonte — Aurora 304",
    parceiro: "Construtora Horizonte Ltda",
    categoria: "Comissão de venda",
    centro: "Comercial",
    vencimento: "2026-08-10",
    valor: 38500,
    status: "aberto",
    parcela: "1/1",
  },
  {
    id: "cr3",
    descricao: "Comissão MRV — Verde Vale lote 42",
    parceiro: "MRV Engenharia",
    categoria: "Comissão de venda",
    centro: "Comercial",
    vencimento: "2026-07-20",
    valor: 22100,
    status: "atrasado",
    parcela: "1/1",
  },
  {
    id: "cr4",
    descricao: "Taxa corretagem — Carlos Eduardo",
    parceiro: "Carlos Eduardo Lima",
    categoria: "Taxa de corretagem",
    centro: "Comercial",
    vencimento: "2026-08-15",
    valor: 6800,
    status: "aberto",
    parcela: "1/2",
  },
  {
    id: "cr5",
    descricao: "Consultoria pré-lançamento Tecnisa",
    parceiro: "Tecnisa S.A.",
    categoria: "Consultoria",
    centro: "Comercial",
    vencimento: "2026-07-30",
    valor: 15000,
    status: "atrasado",
    parcela: "2/3",
  },
  {
    id: "cr6",
    descricao: "Comissão Horizonte — Aurora 1204 (saldo)",
    parceiro: "Construtora Horizonte Ltda",
    categoria: "Comissão de venda",
    centro: "Comercial",
    vencimento: "2026-07-15",
    valor: 42500,
    status: "pago",
    parcela: "1/1",
  },
  {
    id: "cr7",
    descricao: "Comissão Cyrela — Torre B 802",
    parceiro: "Cyrela Brazil Realty",
    categoria: "Comissão de venda",
    centro: "Comercial",
    vencimento: "2026-07-22",
    valor: 58900,
    status: "pago",
    parcela: "1/1",
  },
  {
    id: "cr8",
    descricao: "Taxa corretagem — Ana Paula",
    parceiro: "Ana Paula Mendes",
    categoria: "Taxa de corretagem",
    centro: "Comercial",
    vencimento: "2026-08-20",
    valor: 4500,
    status: "aberto",
    parcela: "1/1",
  },
];

export const MOCK_A_PAGAR: TituloFinanceiro[] = [
  {
    id: "cp1",
    descricao: "Aluguel Plaza — agosto",
    parceiro: "Escritório Plaza Coworking",
    categoria: "Aluguel",
    centro: "Administrativo",
    vencimento: "2026-08-05",
    valor: 8500,
    status: "aberto",
    parcela: "8/12",
  },
  {
    id: "cp2",
    descricao: "Google Ads — agosto (prévia)",
    parceiro: "Google Ads Brasil",
    categoria: "Marketing digital",
    centro: "Marketing",
    vencimento: "2026-08-08",
    valor: 7200,
    status: "aberto",
    parcela: "1/1",
  },
  {
    id: "cp3",
    descricao: "Honorários contábeis — julho",
    parceiro: "Contabilidade Silva & Associados",
    categoria: "Despesas gerais",
    centro: "Administrativo",
    vencimento: "2026-07-10",
    valor: 3200,
    status: "atrasado",
    parcela: "1/1",
  },
  {
    id: "cp4",
    descricao: "Repasse comissão — Juliana Costa",
    parceiro: "Juliana Costa",
    categoria: "Comissão corretor",
    centro: "Comercial",
    vencimento: "2026-08-12",
    valor: 18600,
    status: "aberto",
    parcela: "1/1",
  },
  {
    id: "cp5",
    descricao: "Repasse comissão — Rafael Souza",
    parceiro: "Rafael Souza",
    categoria: "Comissão corretor",
    centro: "Comercial",
    vencimento: "2026-08-12",
    valor: 14200,
    status: "aberto",
    parcela: "1/1",
  },
  {
    id: "cp6",
    descricao: "Folha de pagamento — julho",
    parceiro: "Folha interna",
    categoria: "Folha de pagamento",
    centro: "RH",
    vencimento: "2026-07-25",
    valor: 68400,
    status: "pago",
    parcela: "7/12",
  },
  {
    id: "cp7",
    descricao: "Meta Ads — julho",
    parceiro: "Meta Platforms",
    categoria: "Marketing digital",
    centro: "Marketing",
    vencimento: "2026-07-20",
    valor: 9450,
    status: "pago",
    parcela: "1/1",
  },
  {
    id: "cp8",
    descricao: "Licenças software — Q3",
    parceiro: "Fornecedores TI",
    categoria: "Software / SaaS",
    centro: "TI",
    vencimento: "2026-08-01",
    valor: 5670,
    status: "atrasado",
    parcela: "3/4",
  },
  {
    id: "cp9",
    descricao: "ISS julho",
    parceiro: "Prefeitura",
    categoria: "Impostos",
    centro: "Administrativo",
    vencimento: "2026-08-15",
    valor: 12400,
    status: "aberto",
    parcela: "1/1",
  },
];

export const MOCK_COMISSOES: ComissaoItem[] = [
  {
    id: "co1",
    corretor: "Juliana Costa",
    equipe: "Equipe Alpha",
    empreendimento: "Residencial Aurora",
    cliente: "Família Oliveira",
    dataVenda: "2026-07-18",
    vgv: 850000,
    percentual: 1.5,
    valor: 12750,
    status: "paga",
  },
  {
    id: "co2",
    corretor: "Rafael Souza",
    equipe: "Equipe Alpha",
    empreendimento: "Torre Cyrela B",
    cliente: "Mariana Freitas",
    dataVenda: "2026-07-22",
    vgv: 1178000,
    percentual: 1.5,
    valor: 17670,
    status: "liberada",
  },
  {
    id: "co3",
    corretor: "Beatriz Nunes",
    equipe: "Equipe Beta",
    empreendimento: "Verde Vale",
    cliente: "João Pedro Santos",
    dataVenda: "2026-07-26",
    vgv: 624000,
    percentual: 1.2,
    valor: 7488,
    status: "pendente",
  },
  {
    id: "co4",
    corretor: "Lucas Ferreira",
    equipe: "Equipe Beta",
    empreendimento: "Parque das Flores",
    cliente: "Helena Ribeiro",
    dataVenda: "2026-07-08",
    vgv: 556000,
    percentual: 1.5,
    valor: 8340,
    status: "paga",
  },
  {
    id: "co5",
    corretor: "Juliana Costa",
    equipe: "Equipe Alpha",
    empreendimento: "Residencial Aurora",
    cliente: "Ricardo Alves",
    dataVenda: "2026-06-28",
    vgv: 796000,
    percentual: 1.5,
    valor: 11940,
    status: "paga",
  },
  {
    id: "co6",
    corretor: "Camila Rocha",
    equipe: "Equipe Gama",
    empreendimento: "Torre Cyrela C",
    cliente: "Patrícia Gomes",
    dataVenda: "2026-07-30",
    vgv: 1344000,
    percentual: 1.5,
    valor: 20160,
    status: "pendente",
  },
  {
    id: "co7",
    corretor: "Rafael Souza",
    equipe: "Equipe Alpha",
    empreendimento: "Horizonte 304",
    cliente: "Família Costa",
    dataVenda: "2026-08-01",
    vgv: 770000,
    percentual: 1.5,
    valor: 11550,
    status: "liberada",
  },
  {
    id: "co8",
    corretor: "Beatriz Nunes",
    equipe: "Equipe Beta",
    empreendimento: "Consultoria Tecnisa",
    cliente: "Tecnisa S.A.",
    dataVenda: "2026-07-12",
    vgv: 0,
    percentual: 0,
    valor: 4500,
    status: "pendente",
  },
];

export const MOCK_FLUXO_CAIXA: FluxoDia[] = [
  { dia: "01/07", entradas: 12000, saidas: 8500, saldo: 148200 },
  { dia: "05/07", entradas: 27800, saidas: 2140, saldo: 173860 },
  { dia: "08/07", entradas: 0, saidas: 15600, saldo: 158260 },
  { dia: "10/07", entradas: 4500, saidas: 3200, saldo: 159560 },
  { dia: "12/07", entradas: 39800, saidas: 0, saldo: 199360 },
  { dia: "15/07", entradas: 0, saidas: 12750, saldo: 186610 },
  { dia: "18/07", entradas: 0, saidas: 1890, saldo: 184720 },
  { dia: "20/07", entradas: 0, saidas: 9450, saldo: 175270 },
  { dia: "22/07", entradas: 58900, saidas: 0, saldo: 234170 },
  { dia: "24/07", entradas: 0, saidas: 68400, saldo: 165770 },
  { dia: "25/07", entradas: 0, saidas: 8500, saldo: 157270 },
  { dia: "26/07", entradas: 31200, saidas: 0, saldo: 188470 },
  { dia: "27/07", entradas: 0, saidas: 6800, saldo: 181670 },
  { dia: "28/07", entradas: 42500, saidas: 0, saldo: 224170 },
  { dia: "01/08", entradas: 0, saidas: 5670, saldo: 218500 },
  { dia: "05/08", entradas: 67200, saidas: 8500, saldo: 277200 },
];

export const MOCK_MESES_RESUMO: MesResumo[] = [
  { mes: "Fev", receitas: 142000, despesas: 118500 },
  { mes: "Mar", receitas: 168400, despesas: 125200 },
  { mes: "Abr", receitas: 151200, despesas: 131800 },
  { mes: "Mai", receitas: 189600, despesas: 128400 },
  { mes: "Jun", receitas: 176800, despesas: 134600 },
  { mes: "Jul", receitas: 204700, despesas: 128730 },
];

export const MOCK_CENTROS: CentroDespesaResumo[] = [
  { centro: "Comercial", orcado: 45000, realizado: 42150, percentual: 93.7 },
  { centro: "Marketing", orcado: 25000, realizado: 16250, percentual: 65.0 },
  { centro: "Administrativo", orcado: 35000, realizado: 27300, percentual: 78.0 },
  { centro: "RH", orcado: 72000, realizado: 68400, percentual: 95.0 },
  { centro: "TI", orcado: 8000, realizado: 7560, percentual: 94.5 },
  { centro: "Operações", orcado: 5000, realizado: 2140, percentual: 42.8 },
];

export const MESES_DEMONSTRATIVO = ["Mai", "Jun", "Jul"] as const;

export const MOCK_DEMONSTRATIVO: LinhaDemonstrativo[] = [
  {
    id: "d1",
    grupo: "receita",
    label: "Receita bruta de comissões",
    valores: { Mai: 172000, Jun: 161200, Jul: 186400 },
  },
  {
    id: "d2",
    grupo: "receita",
    label: "Outras receitas",
    valores: { Mai: 17600, Jun: 15600, Jul: 18300 },
  },
  {
    id: "d3",
    grupo: "receita",
    label: "Receita líquida",
    valores: { Mai: 189600, Jun: 176800, Jul: 204700 },
    destaque: true,
  },
  {
    id: "d4",
    grupo: "custo",
    label: "(-) Comissões de corretores",
    valores: { Mai: -38500, Jun: -41200, Jul: -45300 },
  },
  {
    id: "d5",
    grupo: "custo",
    label: "(-) Impostos sobre receita",
    valores: { Mai: -14200, Jun: -13800, Jul: -15600 },
  },
  {
    id: "d6",
    grupo: "resultado",
    label: "Lucro bruto",
    valores: { Mai: 136900, Jun: 121800, Jul: 143800 },
    destaque: true,
  },
  {
    id: "d7",
    grupo: "despesa",
    label: "(-) Despesas com pessoal",
    valores: { Mai: -65200, Jun: -66800, Jul: -68400 },
  },
  {
    id: "d8",
    grupo: "despesa",
    label: "(-) Marketing e captação",
    valores: { Mai: -18200, Jun: -15400, Jul: -16250 },
  },
  {
    id: "d9",
    grupo: "despesa",
    label: "(-) Despesas administrativas",
    valores: { Mai: -22800, Jun: -24100, Jul: -24080 },
  },
  {
    id: "d10",
    grupo: "despesa",
    label: "(-) Tecnologia e operações",
    valores: { Mai: -7200, Jun: -8300, Jul: -10000 },
  },
  {
    id: "d11",
    grupo: "resultado",
    label: "Resultado operacional",
    valores: { Mai: 23500, Jun: 7200, Jul: 25070 },
    destaque: true,
  },
  {
    id: "d12",
    grupo: "resultado",
    label: "Resultado líquido do período",
    valores: { Mai: 23500, Jun: 7200, Jul: 25070 },
    destaque: true,
  },
];

export const VISAO_GERAL_KPIS = {
  saldoAtual: 218500,
  receitasMes: 204700,
  despesasMes: 128730,
  aReceber: 154100,
  aPagar: 69770,
  resultadoMes: 75970,
  evolucaoReceitas: 15.8,
  evolucaoDespesas: -4.4,
  evolucaoResultado: 42.1,
};

export function statusBadgeClass(status: StatusTitulo | ComissaoItem["status"]) {
  switch (status) {
    case "pago":
    case "paga":
      return "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "aberto":
    case "pendente":
      return "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300";
    case "atrasado":
      return "border-transparent bg-destructive/15 text-destructive";
    case "liberada":
      return "border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-300";
    case "cancelado":
      return "border-transparent bg-muted text-muted-foreground";
    default:
      return "border-transparent bg-secondary text-secondary-foreground";
  }
}

export function statusLabel(status: StatusTitulo | ComissaoItem["status"]) {
  const map: Record<string, string> = {
    aberto: "Aberto",
    pago: "Pago",
    atrasado: "Atrasado",
    cancelado: "Cancelado",
    pendente: "Pendente",
    liberada: "Liberada",
    paga: "Paga",
  };
  return map[status] ?? status;
}

export function filterByPeriodo<T extends { data?: string; vencimento?: string; dataVenda?: string }>(
  items: T[],
  periodo: PeriodoFiltro,
  dateKey: keyof T = "data" as keyof T,
): T[] {
  if (periodo === "tudo") return items;
  const now = new Date(2026, 6, 31); // 31/07/2026 referência mock
  return items.filter((item) => {
    const raw = String(item[dateKey] ?? "");
    if (!raw) return true;
    const d = new Date(raw + "T12:00:00");
    if (periodo === "mes") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (periodo === "trimestre") {
      const q = Math.floor(now.getMonth() / 3);
      return (
        Math.floor(d.getMonth() / 3) === q && d.getFullYear() === now.getFullYear()
      );
    }
    return d.getFullYear() === now.getFullYear();
  });
}
