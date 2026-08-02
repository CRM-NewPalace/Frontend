/** Dados demonstrativos do módulo Propostas (sem API). */

export type PropostaStatus =
  | "rascunho"
  | "enviada"
  | "negociacao"
  | "aceita"
  | "recusada"
  | "expirada";

export interface Proposta {
  id: string;
  codigo: string;
  cliente: string;
  telefone: string;
  empreendimento: string;
  unidade: string;
  construtora: string;
  corretor: string;
  equipe: string;
  valor: number;
  entrada: number;
  financiamento: number;
  status: PropostaStatus;
  criadaEm: string;
  enviadaEm: string | null;
  validade: string;
  observacao: string;
}

export function brl(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");
}

export const PROPOSTA_STATUS_LABEL: Record<PropostaStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  negociacao: "Em negociação",
  aceita: "Aceita",
  recusada: "Recusada",
  expirada: "Expirada",
};

export function propostaStatusClass(status: PropostaStatus) {
  switch (status) {
    case "aceita":
      return "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "enviada":
      return "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300";
    case "negociacao":
      return "border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-300";
    case "rascunho":
      return "border-transparent bg-muted text-muted-foreground";
    case "recusada":
      return "border-transparent bg-destructive/15 text-destructive";
    case "expirada":
      return "border-transparent bg-orange-500/15 text-orange-800 dark:text-orange-300";
    default:
      return "border-transparent bg-secondary text-secondary-foreground";
  }
}

export const MOCK_PROPOSTAS: Proposta[] = [
  {
    id: "pr1",
    codigo: "PROP-2026-0142",
    cliente: "Mariana Freitas",
    telefone: "(11) 98765-4321",
    empreendimento: "Torre Cyrela B",
    unidade: "802",
    construtora: "Cyrela Brazil Realty",
    corretor: "Rafael Souza",
    equipe: "Equipe Alpha",
    valor: 1178000,
    entrada: 235600,
    financiamento: 942400,
    status: "negociacao",
    criadaEm: "2026-07-18",
    enviadaEm: "2026-07-19",
    validade: "2026-08-10",
    observacao: "Cliente pediu desconto de 2% na entrada.",
  },
  {
    id: "pr2",
    codigo: "PROP-2026-0138",
    cliente: "Família Oliveira",
    telefone: "(11) 97654-3210",
    empreendimento: "Residencial Aurora",
    unidade: "1204",
    construtora: "Construtora Horizonte",
    corretor: "Juliana Costa",
    equipe: "Equipe Alpha",
    valor: 850000,
    entrada: 170000,
    financiamento: 680000,
    status: "aceita",
    criadaEm: "2026-07-10",
    enviadaEm: "2026-07-11",
    validade: "2026-07-31",
    observacao: "Aceita com FGTS + financiamento caixa.",
  },
  {
    id: "pr3",
    codigo: "PROP-2026-0145",
    cliente: "João Pedro Santos",
    telefone: "(19) 99876-1122",
    empreendimento: "Verde Vale",
    unidade: "Lote 42",
    construtora: "MRV Engenharia",
    corretor: "Beatriz Nunes",
    equipe: "Equipe Beta",
    valor: 624000,
    entrada: 62400,
    financiamento: 561600,
    status: "enviada",
    criadaEm: "2026-07-26",
    enviadaEm: "2026-07-26",
    validade: "2026-08-15",
    observacao: "Aguardando retorno da análise de crédito.",
  },
  {
    id: "pr4",
    codigo: "PROP-2026-0131",
    cliente: "Helena Ribeiro",
    telefone: "(11) 96543-2109",
    empreendimento: "Parque das Flores",
    unidade: "45",
    construtora: "Tecnisa S.A.",
    corretor: "Lucas Ferreira",
    equipe: "Equipe Beta",
    valor: 556000,
    entrada: 111200,
    financiamento: 444800,
    status: "aceita",
    criadaEm: "2026-07-02",
    enviadaEm: "2026-07-03",
    validade: "2026-07-20",
    observacao: "Assinatura agendada para 05/08.",
  },
  {
    id: "pr5",
    codigo: "PROP-2026-0148",
    cliente: "Patrícia Gomes",
    telefone: "(11) 95432-1098",
    empreendimento: "Torre Cyrela C",
    unidade: "1501",
    construtora: "Cyrela Brazil Realty",
    corretor: "Camila Rocha",
    equipe: "Equipe Gama",
    valor: 1344000,
    entrada: 268800,
    financiamento: 1075200,
    status: "enviada",
    criadaEm: "2026-07-29",
    enviadaEm: "2026-07-30",
    validade: "2026-08-20",
    observacao: "Proposta com vaga extra inclusa.",
  },
  {
    id: "pr6",
    codigo: "PROP-2026-0129",
    cliente: "Ricardo Alves",
    telefone: "(11) 94321-0987",
    empreendimento: "Residencial Aurora",
    unidade: "905",
    construtora: "Construtora Horizonte",
    corretor: "Juliana Costa",
    equipe: "Equipe Alpha",
    valor: 796000,
    entrada: 159200,
    financiamento: 636800,
    status: "recusada",
    criadaEm: "2026-06-22",
    enviadaEm: "2026-06-23",
    validade: "2026-07-10",
    observacao: "Cliente optou por outro empreendimento.",
  },
  {
    id: "pr7",
    codigo: "PROP-2026-0150",
    cliente: "Família Costa",
    telefone: "(11) 93210-9876",
    empreendimento: "Horizonte Garden",
    unidade: "304",
    construtora: "Construtora Horizonte",
    corretor: "Rafael Souza",
    equipe: "Equipe Alpha",
    valor: 770000,
    entrada: 154000,
    financiamento: 616000,
    status: "rascunho",
    criadaEm: "2026-08-01",
    enviadaEm: null,
    validade: "2026-08-25",
    observacao: "Aguardando fotos da planta para enviar.",
  },
  {
    id: "pr8",
    codigo: "PROP-2026-0125",
    cliente: "Ana Paula Mendes",
    telefone: "(11) 92109-8765",
    empreendimento: "Residencial Aurora",
    unidade: "612",
    construtora: "Construtora Horizonte",
    corretor: "Beatriz Nunes",
    equipe: "Equipe Beta",
    valor: 689000,
    entrada: 137800,
    financiamento: 551200,
    status: "expirada",
    criadaEm: "2026-06-10",
    enviadaEm: "2026-06-11",
    validade: "2026-06-30",
    observacao: "Validade vencida sem resposta.",
  },
  {
    id: "pr9",
    codigo: "PROP-2026-0140",
    cliente: "Carlos Eduardo Lima",
    telefone: "(19) 91098-7654",
    empreendimento: "Verde Vale",
    unidade: "Lote 18",
    construtora: "MRV Engenharia",
    corretor: "Lucas Ferreira",
    equipe: "Equipe Beta",
    valor: 498000,
    entrada: 49800,
    financiamento: 448200,
    status: "negociacao",
    criadaEm: "2026-07-15",
    enviadaEm: "2026-07-16",
    validade: "2026-08-05",
    observacao: "Negociando prazo de entrega das chaves.",
  },
  {
    id: "pr10",
    codigo: "PROP-2026-0147",
    cliente: "Fernanda Dias",
    telefone: "(11) 90987-6543",
    empreendimento: "Parque das Flores",
    unidade: "112",
    construtora: "Tecnisa S.A.",
    corretor: "Camila Rocha",
    equipe: "Equipe Gama",
    valor: 612000,
    entrada: 122400,
    financiamento: 489600,
    status: "enviada",
    criadaEm: "2026-07-28",
    enviadaEm: "2026-07-28",
    validade: "2026-08-18",
    observacao: "Cliente interessada em planta garden.",
  },
  {
    id: "pr11",
    codigo: "PROP-2026-0135",
    cliente: "Bruno Martins",
    telefone: "(11) 98877-6655",
    empreendimento: "Torre Cyrela B",
    unidade: "405",
    construtora: "Cyrela Brazil Realty",
    corretor: "Juliana Costa",
    equipe: "Equipe Alpha",
    valor: 945000,
    entrada: 189000,
    financiamento: 756000,
    status: "aceita",
    criadaEm: "2026-07-05",
    enviadaEm: "2026-07-06",
    validade: "2026-07-25",
    observacao: "Contrato em elaboração jurídico.",
  },
  {
    id: "pr12",
    codigo: "PROP-2026-0149",
    cliente: "Sofia Almeida",
    telefone: "(11) 97766-5544",
    empreendimento: "Horizonte Garden",
    unidade: "201",
    construtora: "Construtora Horizonte",
    corretor: "Rafael Souza",
    equipe: "Equipe Alpha",
    valor: 715000,
    entrada: 143000,
    financiamento: 572000,
    status: "rascunho",
    criadaEm: "2026-07-31",
    enviadaEm: null,
    validade: "2026-08-22",
    observacao: "Incluir mobília na proposta.",
  },
];
