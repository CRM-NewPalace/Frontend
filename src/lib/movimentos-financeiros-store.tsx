import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type MovimentoTipo = "Entrada" | "Saída";

export interface MovimentoFinanceiro {
  id: string;
  /** ISO date YYYY-MM-DD */
  data: string;
  desc: string;
  tipo: MovimentoTipo;
  categoria: string;
  conta: string;
  valor: number;
  observacoes: string;
}

const KEY = "crm_financeiro_movimentos_v1";

const SEED: MovimentoFinanceiro[] = [
  { id: "m1", data: "2026-07-22", desc: "Comissão venda IM-2001", tipo: "Entrada", categoria: "Comissão", conta: "Conta corrente", valor: 24000, observacoes: "" },
  { id: "m2", data: "2026-07-21", desc: "Marketing digital", tipo: "Saída", categoria: "Marketing", conta: "Conta corrente", valor: 8500, observacoes: "" },
  { id: "m3", data: "2026-07-20", desc: "Sinal proposta IM-2007", tipo: "Entrada", categoria: "Sinal", conta: "Conta corrente", valor: 12000, observacoes: "" },
  { id: "m4", data: "2026-07-18", desc: "Aluguel escritório", tipo: "Saída", categoria: "Estrutura", conta: "Conta corrente", valor: 12000, observacoes: "" },
  { id: "m5", data: "2026-07-15", desc: "Comissão venda IM-2003", tipo: "Entrada", categoria: "Comissão", conta: "Conta corrente", valor: 35600, observacoes: "" },
  { id: "m6", data: "2026-07-10", desc: "Portais imobiliários", tipo: "Saída", categoria: "Marketing", conta: "Cartão corporativo", valor: 3200, observacoes: "" },
  { id: "m7", data: "2026-07-05", desc: "Comissões corretores", tipo: "Saída", categoria: "Pessoal", conta: "Conta corrente", valor: 45000, observacoes: "" },
];

function load(): MovimentoFinanceiro[] {
  if (typeof window === "undefined") return [...SEED];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [...SEED];
    const parsed = JSON.parse(raw) as MovimentoFinanceiro[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...SEED];
  } catch {
    return [...SEED];
  }
}

function save(data: MovimentoFinanceiro[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(data));
}

type Ctx = {
  movimentos: MovimentoFinanceiro[];
  addMovimento: (m: MovimentoFinanceiro) => void;
  updateMovimento: (id: string, patch: Partial<MovimentoFinanceiro>) => void;
  deleteMovimento: (id: string) => void;
};

const MovimentosContext = createContext<Ctx | null>(null);

export function MovimentosFinanceirosProvider({ children }: { children: ReactNode }) {
  const [movimentos, setMovimentos] = useState(load);

  const addMovimento = useCallback((m: MovimentoFinanceiro) => {
    setMovimentos((prev) => {
      const next = [m, ...prev];
      save(next);
      return next;
    });
  }, []);

  const updateMovimento = useCallback((id: string, patch: Partial<MovimentoFinanceiro>) => {
    setMovimentos((prev) => {
      const next = prev.map((m) => (m.id === id ? { ...m, ...patch } : m));
      save(next);
      return next;
    });
  }, []);

  const deleteMovimento = useCallback((id: string) => {
    setMovimentos((prev) => {
      const next = prev.filter((m) => m.id !== id);
      save(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ movimentos, addMovimento, updateMovimento, deleteMovimento }),
    [movimentos, addMovimento, updateMovimento, deleteMovimento],
  );

  return (
    <MovimentosContext.Provider value={value}>
      {children}
    </MovimentosContext.Provider>
  );
}

export function useMovimentosFinanceiros() {
  const ctx = useContext(MovimentosContext);
  if (!ctx) throw new Error("useMovimentosFinanceiros must be used within MovimentosFinanceirosProvider");
  return ctx;
}

export function formatDataBR(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");
}
