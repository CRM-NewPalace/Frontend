import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ContaTipo = "receber" | "pagar";
export type ContaStatus = "aberto" | "pago" | "atrasado" | "previsto";
/** Em contas a pagar: conta financeira comum ou despesa do centro de despesas. */
export type ClassificacaoPagar = "conta" | "despesa";

export interface TipoDespesa {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
}

export interface ContaFinanceira {
  id: string;
  tipo: ContaTipo;
  descricao: string;
  pessoa: string;
  valor: number;
  vencimento: string; // YYYY-MM-DD
  status: ContaStatus;
  categoria: string;
  /** Só relevante para tipo=pagar */
  classificacao?: ClassificacaoPagar;
  /** Ex.: Fornecedor, Imposto, Folha — quando classificacao=conta */
  tipoConta?: string;
  /** ID do tipo de despesa cadastrado — quando classificacao=despesa */
  tipoDespesaId?: string;
}

const CONTAS_KEY = "crm_financeiro_contas_v2";
const TIPOS_KEY = "crm_financeiro_tipos_despesa_v1";
const SALDO_KEY = "crm_financeiro_saldo_inicial";

export const TIPOS_CONTA = [
  "Fornecedor",
  "Imposto",
  "Folha / pessoal",
  "Serviços",
  "Outros",
] as const;

const SEED_TIPOS: TipoDespesa[] = [
  { id: "td-1", nome: "Marketing", descricao: "Anúncios, portais e campanhas", ativo: true },
  { id: "td-2", nome: "Estrutura", descricao: "Aluguel, condomínio e manutenção", ativo: true },
  { id: "td-3", nome: "Pessoal", descricao: "Comissões e treinamentos", ativo: true },
  { id: "td-4", nome: "Contábil / jurídico", descricao: "Honorários e taxas", ativo: true },
  { id: "td-5", nome: "Operacional", descricao: "Despesas do dia a dia", ativo: true },
];

const SEED: ContaFinanceira[] = [
  // A receber
  {
    id: "cr-1",
    tipo: "receber",
    descricao: "Comissão venda — Luciana Beatriz",
    pessoa: "LUCIANA BEATRIZ SOUZA DA PAZ",
    valor: 6028.63,
    vencimento: "2026-07-10",
    status: "atrasado",
    categoria: "Comissões",
  },
  {
    id: "cr-2",
    tipo: "receber",
    descricao: "Sinal proposta IM-2007",
    pessoa: "Ricardo Santos",
    valor: 999,
    vencimento: "2026-07-09",
    status: "previsto",
    categoria: "Sinais",
  },
  {
    id: "cr-3",
    tipo: "receber",
    descricao: "Taxa administrativa",
    pessoa: "João Pereira",
    valor: 47.74,
    vencimento: "2026-07-11",
    status: "aberto",
    categoria: "Taxas",
  },
  {
    id: "cr-4",
    tipo: "receber",
    descricao: "Comissão venda IM-2001",
    pessoa: "Beatriz Costa",
    valor: 2400,
    vencimento: "2026-07-25",
    status: "aberto",
    categoria: "Comissões",
  },
  {
    id: "cr-5",
    tipo: "receber",
    descricao: "Recebimento previsto — reserva",
    pessoa: "Construtora Alfa",
    valor: 8500,
    vencimento: "2026-07-28",
    status: "previsto",
    categoria: "Reservas",
  },
  // A pagar — tipo conta
  {
    id: "cp-1",
    tipo: "pagar",
    classificacao: "conta",
    tipoConta: "Fornecedor",
    descricao: "Aluguel posto",
    pessoa: "aluguel posto",
    valor: 6000,
    vencimento: "2026-07-05",
    status: "atrasado",
    categoria: "Locação",
  },
  {
    id: "cp-2",
    tipo: "pagar",
    classificacao: "conta",
    tipoConta: "Serviços",
    descricao: "Serviço Emerson",
    pessoa: "EMERSON",
    valor: 2123,
    vencimento: "2026-07-08",
    status: "atrasado",
    categoria: "Serviços gerais",
  },
  {
    id: "cp-3",
    tipo: "pagar",
    classificacao: "conta",
    tipoConta: "Serviços",
    descricao: "Daniel ASG",
    pessoa: "DANIEL ASG",
    valor: 2000,
    vencimento: "2026-07-12",
    status: "atrasado",
    categoria: "Limpeza",
  },
  {
    id: "cp-4",
    tipo: "pagar",
    classificacao: "conta",
    tipoConta: "Fornecedor",
    descricao: "Carla Frazão",
    pessoa: "CARLA FRAZAO",
    valor: 1600,
    vencimento: "2026-07-15",
    status: "aberto",
    categoria: "Fornecimento",
  },
  // A pagar — tipo despesa
  {
    id: "cp-5",
    tipo: "pagar",
    classificacao: "despesa",
    tipoDespesaId: "td-3",
    descricao: "Treiner Giovane",
    pessoa: "Treiner Giovane",
    valor: 500,
    vencimento: "2026-07-18",
    status: "aberto",
    categoria: "Treinamento",
  },
  {
    id: "cp-6",
    tipo: "pagar",
    classificacao: "despesa",
    tipoDespesaId: "td-4",
    descricao: "Contabilidade",
    pessoa: "CONTABILIDADE",
    valor: 320,
    vencimento: "2026-07-20",
    status: "aberto",
    categoria: "Honorários",
  },
  {
    id: "cp-7",
    tipo: "pagar",
    classificacao: "despesa",
    tipoDespesaId: "td-1",
    descricao: "Marketing digital",
    pessoa: "Agência XYZ",
    valor: 4500,
    vencimento: "2026-07-22",
    status: "aberto",
    categoria: "Mídia paga",
  },
  {
    id: "cp-8",
    tipo: "pagar",
    classificacao: "despesa",
    tipoDespesaId: "td-1",
    descricao: "Portais imobiliários",
    pessoa: "Zap Imóveis",
    valor: 3200,
    vencimento: "2026-07-30",
    status: "aberto",
    categoria: "Portais",
  },
];

function loadContas(): ContaFinanceira[] {
  if (typeof window === "undefined") return [...SEED];
  try {
    const raw = window.localStorage.getItem(CONTAS_KEY);
    if (!raw) return [...SEED];
    const parsed = JSON.parse(raw) as ContaFinanceira[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...SEED];
  } catch {
    return [...SEED];
  }
}

function saveContas(contas: ContaFinanceira[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONTAS_KEY, JSON.stringify(contas));
}

function loadTipos(): TipoDespesa[] {
  if (typeof window === "undefined") return [...SEED_TIPOS];
  try {
    const raw = window.localStorage.getItem(TIPOS_KEY);
    if (!raw) return [...SEED_TIPOS];
    const parsed = JSON.parse(raw) as TipoDespesa[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...SEED_TIPOS];
  } catch {
    return [...SEED_TIPOS];
  }
}

function saveTipos(tipos: TipoDespesa[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TIPOS_KEY, JSON.stringify(tipos));
}

function loadSaldoInicial(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(SALDO_KEY);
    const n = raw != null ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function saveSaldoInicial(value: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SALDO_KEY, String(value));
}

type FinanceiroContasContextValue = {
  contas: ContaFinanceira[];
  tiposDespesa: TipoDespesa[];
  saldoInicial: number;
  setSaldoInicial: (value: number) => void;
  addConta: (conta: ContaFinanceira) => void;
  updateConta: (id: string, patch: Partial<ContaFinanceira>) => void;
  deleteConta: (id: string) => void;
  addTipoDespesa: (tipo: TipoDespesa) => void;
  updateTipoDespesa: (id: string, patch: Partial<TipoDespesa>) => void;
  deleteTipoDespesa: (id: string) => void;
  contasAReceber: ContaFinanceira[];
  contasAPagar: ContaFinanceira[];
  despesas: ContaFinanceira[];
  getTipoDespesaNome: (id?: string) => string;
};

const FinanceiroContasContext = createContext<FinanceiroContasContextValue | null>(null);

export function FinanceiroContasProvider({ children }: { children: ReactNode }) {
  const [contas, setContas] = useState<ContaFinanceira[]>(loadContas);
  const [tiposDespesa, setTiposDespesa] = useState<TipoDespesa[]>(loadTipos);
  const [saldoInicial, setSaldoInicialState] = useState(loadSaldoInicial);

  const setSaldoInicial = useCallback((value: number) => {
    setSaldoInicialState(value);
    saveSaldoInicial(value);
  }, []);

  const addConta = useCallback((conta: ContaFinanceira) => {
    setContas((prev) => {
      const next = [conta, ...prev];
      saveContas(next);
      return next;
    });
  }, []);

  const updateConta = useCallback((id: string, patch: Partial<ContaFinanceira>) => {
    setContas((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
      saveContas(next);
      return next;
    });
  }, []);

  const deleteConta = useCallback((id: string) => {
    setContas((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveContas(next);
      return next;
    });
  }, []);

  const addTipoDespesa = useCallback((tipo: TipoDespesa) => {
    setTiposDespesa((prev) => {
      const next = [tipo, ...prev];
      saveTipos(next);
      return next;
    });
  }, []);

  const updateTipoDespesa = useCallback((id: string, patch: Partial<TipoDespesa>) => {
    setTiposDespesa((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
      saveTipos(next);
      return next;
    });
  }, []);

  const deleteTipoDespesa = useCallback((id: string) => {
    setTiposDespesa((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveTipos(next);
      return next;
    });
  }, []);

  const value = useMemo(() => {
    const contasAReceber = contas.filter((c) => c.tipo === "receber");
    const contasAPagar = contas.filter((c) => c.tipo === "pagar");
    const despesas = contasAPagar.filter((c) => c.classificacao === "despesa");
    const getTipoDespesaNome = (id?: string) =>
      tiposDespesa.find((t) => t.id === id)?.nome ?? "—";
    return {
      contas,
      tiposDespesa,
      saldoInicial,
      setSaldoInicial,
      addConta,
      updateConta,
      deleteConta,
      addTipoDespesa,
      updateTipoDespesa,
      deleteTipoDespesa,
      contasAReceber,
      contasAPagar,
      despesas,
      getTipoDespesaNome,
    };
  }, [
    contas,
    tiposDespesa,
    saldoInicial,
    setSaldoInicial,
    addConta,
    updateConta,
    deleteConta,
    addTipoDespesa,
    updateTipoDespesa,
    deleteTipoDespesa,
  ]);

  return (
    <FinanceiroContasContext.Provider value={value}>
      {children}
    </FinanceiroContasContext.Provider>
  );
}

export function useFinanceiroContas() {
  const ctx = useContext(FinanceiroContasContext);
  if (!ctx) throw new Error("useFinanceiroContas must be used within FinanceiroContasProvider");
  return ctx;
}

export function moneyBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function isContaPendente(c: ContaFinanceira) {
  return c.status !== "pago";
}
