import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PessoaStatus = "Ativo" | "Inativo";
export type ClienteTipo = "PF" | "PJ";

export interface ClienteFinanceiro {
  id: string;
  nome: string;
  doc: string;
  tipo: ClienteTipo;
  email: string;
  telefone: string;
  saldo: number;
  status: PessoaStatus;
  observacoes: string;
}

export interface FornecedorFinanceiro {
  id: string;
  nome: string;
  doc: string;
  categoria: string;
  email: string;
  telefone: string;
  aPagar: number;
  status: PessoaStatus;
  observacoes: string;
}

const CLIENTES_KEY = "crm_financeiro_clientes_v1";
const FORNECEDORES_KEY = "crm_financeiro_fornecedores_v1";

const SEED_CLIENTES: ClienteFinanceiro[] = [
  {
    id: "cli-1",
    nome: "João Pereira",
    doc: "123.456.789-00",
    tipo: "PF",
    email: "joao.pereira@email.com",
    telefone: "(81) 98888-1001",
    saldo: 24000,
    status: "Ativo",
    observacoes: "Cliente recorrente de comissões.",
  },
  {
    id: "cli-2",
    nome: "Beatriz Costa",
    doc: "987.654.321-00",
    tipo: "PF",
    email: "beatriz.costa@email.com",
    telefone: "(81) 98777-2002",
    saldo: 0,
    status: "Ativo",
    observacoes: "",
  },
  {
    id: "cli-3",
    nome: "Construtora Alfa Ltda",
    doc: "12.345.678/0001-90",
    tipo: "PJ",
    email: "financeiro@alfa.com.br",
    telefone: "(81) 3333-4500",
    saldo: 85000,
    status: "Ativo",
    observacoes: "Contrato corporativo New Palace.",
  },
  {
    id: "cli-4",
    nome: "Ricardo Santos",
    doc: "111.222.333-44",
    tipo: "PF",
    email: "ricardo.santos@email.com",
    telefone: "(81) 98666-3003",
    saldo: 12000,
    status: "Inativo",
    observacoes: "Sem movimentação recente.",
  },
];

const SEED_FORNECEDORES: FornecedorFinanceiro[] = [
  {
    id: "for-1",
    nome: "Agência XYZ",
    doc: "11.222.333/0001-44",
    categoria: "Marketing",
    email: "contato@agenciaxyz.com",
    telefone: "(11) 4002-8922",
    aPagar: 8500,
    status: "Ativo",
    observacoes: "Campanhas digitais mensais.",
  },
  {
    id: "for-2",
    nome: "Imob Corp",
    doc: "22.333.444/0001-55",
    categoria: "Estrutura",
    email: "cobranca@imobcorp.com",
    telefone: "(81) 3222-1100",
    aPagar: 12000,
    status: "Ativo",
    observacoes: "Aluguel do escritório.",
  },
  {
    id: "for-3",
    nome: "Zap Imóveis",
    doc: "33.444.555/0001-66",
    categoria: "Marketing",
    email: "parceiros@zap.com.br",
    telefone: "(11) 3003-3003",
    aPagar: 3200,
    status: "Ativo",
    observacoes: "",
  },
  {
    id: "for-4",
    nome: "Contábil Plus",
    doc: "44.555.666/0001-77",
    categoria: "Serviços",
    email: "atendimento@contabilplus.com",
    telefone: "(81) 3444-7788",
    aPagar: 2800,
    status: "Ativo",
    observacoes: "Honorários contábeis.",
  },
];

function loadList<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return [...seed];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [...seed];
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...seed];
  } catch {
    return [...seed];
  }
}

function saveList<T>(key: string, data: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(data));
}

type Ctx = {
  clientes: ClienteFinanceiro[];
  fornecedores: FornecedorFinanceiro[];
  addCliente: (c: ClienteFinanceiro) => void;
  updateCliente: (id: string, patch: Partial<ClienteFinanceiro>) => void;
  deleteCliente: (id: string) => void;
  addFornecedor: (f: FornecedorFinanceiro) => void;
  updateFornecedor: (id: string, patch: Partial<FornecedorFinanceiro>) => void;
  deleteFornecedor: (id: string) => void;
};

const FinanceiroPessoasContext = createContext<Ctx | null>(null);

export function FinanceiroPessoasProvider({ children }: { children: ReactNode }) {
  const [clientes, setClientes] = useState(() => loadList(CLIENTES_KEY, SEED_CLIENTES));
  const [fornecedores, setFornecedores] = useState(() =>
    loadList(FORNECEDORES_KEY, SEED_FORNECEDORES),
  );

  const addCliente = useCallback((c: ClienteFinanceiro) => {
    setClientes((prev) => {
      const next = [c, ...prev];
      saveList(CLIENTES_KEY, next);
      return next;
    });
  }, []);

  const updateCliente = useCallback((id: string, patch: Partial<ClienteFinanceiro>) => {
    setClientes((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
      saveList(CLIENTES_KEY, next);
      return next;
    });
  }, []);

  const deleteCliente = useCallback((id: string) => {
    setClientes((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveList(CLIENTES_KEY, next);
      return next;
    });
  }, []);

  const addFornecedor = useCallback((f: FornecedorFinanceiro) => {
    setFornecedores((prev) => {
      const next = [f, ...prev];
      saveList(FORNECEDORES_KEY, next);
      return next;
    });
  }, []);

  const updateFornecedor = useCallback((id: string, patch: Partial<FornecedorFinanceiro>) => {
    setFornecedores((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, ...patch } : f));
      saveList(FORNECEDORES_KEY, next);
      return next;
    });
  }, []);

  const deleteFornecedor = useCallback((id: string) => {
    setFornecedores((prev) => {
      const next = prev.filter((f) => f.id !== id);
      saveList(FORNECEDORES_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      clientes,
      fornecedores,
      addCliente,
      updateCliente,
      deleteCliente,
      addFornecedor,
      updateFornecedor,
      deleteFornecedor,
    }),
    [
      clientes,
      fornecedores,
      addCliente,
      updateCliente,
      deleteCliente,
      addFornecedor,
      updateFornecedor,
      deleteFornecedor,
    ],
  );

  return (
    <FinanceiroPessoasContext.Provider value={value}>
      {children}
    </FinanceiroPessoasContext.Provider>
  );
}

export function useFinanceiroPessoas() {
  const ctx = useContext(FinanceiroPessoasContext);
  if (!ctx) throw new Error("useFinanceiroPessoas must be used within FinanceiroPessoasProvider");
  return ctx;
}
