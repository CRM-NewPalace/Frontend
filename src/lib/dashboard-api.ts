import { apiFetch } from "@/lib/api";
import type { AnaliseStatus } from "@/lib/analise-api";

export type DashboardMetric = {
  valor: number;
  valorMesAnterior: number;
  evolucaoPct: number | null;
};

export type DashboardCorretor = {
  periodo: { inicio: string; fim: string };
  carteira: {
    leads: number;
    clientes: number;
    novosContatos: number;
  };
  funil: { etapa: string; total: number }[];
  conversaoEmAnalise: number;
  analises: { status: AnaliseStatus; total: number }[];
  documentacao: {
    registrados: number;
    vendidos: number;
    emAndamento: number;
    vgvVendidoMes: number;
  };
  agenda: {
    totalHoje: number;
    pendentesHoje: number;
    concluidosHoje: number;
    itens: {
      id: string;
      titulo: string;
      tipo: string;
      status: string;
      startsAt: string;
      contato: string | null;
      categoria: "pessoal" | "compartilhada";
    }[];
  };
};

export type DashboardAdmin = {
  periodo: {
    mesAtual: { inicio: string; fim: string };
    mesAnterior: { inicio: string; fim: string };
  };
  entradas: {
    hoje: number;
    semana: number;
    mes: DashboardMetric;
  };
  funil: { etapa: string; total: number }[];
  conversao: {
    /** Leads que entraram no mês. */
    entradas: DashboardMetric;
    /** Desses leads, quantos já viraram venda. */
    vendas: DashboardMetric;
    /** Regra: vendas / entradas × 100. */
    taxa: DashboardMetric;
    vgv: DashboardMetric;
  };
  atencao: {
    semDono: number;
    parados: number;
    diasParado: number;
  };
  perdidos: {
    mes: DashboardMetric;
    motivos: Array<{ motivo: string } & DashboardMetric>;
  };
  agenda: {
    totalHoje: number;
    pendentesHoje: number;
    concluidosHoje: number;
    atrasados: number;
    itens: {
      id: string;
      titulo: string;
      tipo: string;
      status: string;
      startsAt: string;
      contato: string | null;
    }[];
  };
  ranking: Array<{
    corretorId: string;
    nome: string;
    equipe: string | null;
    leads: number;
    visitas: number;
    vendas: DashboardMetric;
    vgv: DashboardMetric;
  }>;
  equipes: Array<{
    equipeId: string;
    nome: string;
    corretores: number;
    leads: number;
    clientes: number;
    total: number;
  }>;
  metas: {
    corretores: Array<{
      id: string;
      tipo: string;
      valor: number;
      atual: number;
      percentual: number;
      corretorId: string;
      corretorNome: string;
      equipeId: string | null;
      equipeNome: string | null;
    }>;
    equipes: Array<{
      equipeId: string;
      nome: string;
      meta: number;
      atual: number;
      percentual: number;
    }>;
    imobiliaria: {
      meta: number;
      atual: number;
      percentual: number;
    };
  };
};

export async function fetchDashboardCorretor(): Promise<DashboardCorretor> {
  return apiFetch<DashboardCorretor>("/dashboard/corretor");
}

export async function fetchDashboardAdmin(): Promise<DashboardAdmin> {
  return apiFetch<DashboardAdmin>("/dashboard/admin");
}

export type DashboardRankingMeta = {
  tipo: string;
  valor: number;
  atual: number;
  percentual: number;
};

export type DashboardRankingCorretor = {
  posicao: number;
  corretorId: string;
  nome: string;
  equipeId: string | null;
  equipe: string | null;
  gerenteId: string | null;
  gerente: string | null;
  leads: number;
  entradas: DashboardMetric;
  visitas: number;
  documentacoes: number;
  vendas: DashboardMetric;
  vgv: DashboardMetric;
  taxaConversao: DashboardMetric;
  perdidos: number;
  meta: DashboardRankingMeta | null;
};

export type DashboardRankingGerente = {
  posicao: number;
  gerenteId: string;
  nome: string;
  equipeId: string;
  equipe: string;
  corretores: number;
  leads: number;
  entradas: DashboardMetric;
  visitas: number;
  vendas: DashboardMetric;
  vgv: DashboardMetric;
  taxaConversao: DashboardMetric;
  perdidos: number;
};

export type DashboardRanking = {
  periodo: {
    mesAtual: { inicio: string; fim: string };
    mesAnterior: { inicio: string; fim: string };
  };
  totais: {
    entradas: number;
    vendas: number;
    vgv: number;
    visitas: number;
    perdidos: number;
    taxaConversao: number;
    corretores: number;
    gerentes: number;
  };
  corretores: DashboardRankingCorretor[];
  gerentes: DashboardRankingGerente[];
};

export async function fetchDashboardRanking(): Promise<DashboardRanking> {
  return apiFetch<DashboardRanking>("/dashboard/ranking");
}
