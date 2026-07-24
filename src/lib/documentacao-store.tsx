import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DocumentacaoStatus =
  | "recebida"
  | "em_analise"
  | "aprovada"
  | "pendencia"
  | "recusada";

export type ResultadoAnalise =
  | "aprovado"
  | "aprovado_parcialmente"
  | "reprovado"
  | null;

export type Documentacao = {
  id: string;
  nome: string;
  temFgts: boolean;
  temEntrada: boolean;
  renda: number;
  corretor: string;
  status: DocumentacaoStatus;
  resultado: ResultadoAnalise;
  observacao?: string;
  createdAt: string;
  updatedAt: string;
};

export const DOCUMENTACAO_STAGES: {
  id: DocumentacaoStatus;
  name: string;
  color: string;
}[] = [
  { id: "recebida", name: "Recebida", color: "bg-info/15 text-info border-info/30" },
  { id: "em_analise", name: "Em análise", color: "bg-warning/15 text-warning-foreground border-warning/30" },
  { id: "aprovada", name: "Aprovada", color: "bg-success/15 text-success border-success/30" },
  { id: "pendencia", name: "Pendência", color: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30" },
  { id: "recusada", name: "Recusada", color: "bg-destructive/15 text-destructive border-destructive/30" },
];

export function resultadoToStatus(resultado: Exclude<ResultadoAnalise, null>): DocumentacaoStatus {
  switch (resultado) {
    case "aprovado":
      return "aprovada";
    case "aprovado_parcialmente":
      return "pendencia";
    case "reprovado":
      return "recusada";
  }
}

export function statusLabel(status: DocumentacaoStatus) {
  return DOCUMENTACAO_STAGES.find((s) => s.id === status)?.name ?? status;
}

export function resultadoLabel(resultado: ResultadoAnalise) {
  switch (resultado) {
    case "aprovado":
      return "Aprovado";
    case "aprovado_parcialmente":
      return "Aprovado parcialmente";
    case "reprovado":
      return "Reprovado";
    default:
      return "—";
  }
}

const STORAGE_KEY = "crm_mock_documentacao";

const SEED: Documentacao[] = [
  {
    id: "d1",
    nome: "João Ferreira",
    temFgts: true,
    temEntrada: true,
    renda: 6500,
    corretor: "Marina Alves",
    status: "recebida",
    resultado: null,
    createdAt: "2026-07-18T10:00:00.000Z",
    updatedAt: "2026-07-18T10:00:00.000Z",
  },
  {
    id: "d2",
    nome: "Carla Mendes",
    temFgts: false,
    temEntrada: true,
    renda: 8200,
    corretor: "Pedro Henrique",
    status: "em_analise",
    resultado: null,
    createdAt: "2026-07-12T14:30:00.000Z",
    updatedAt: "2026-07-15T09:00:00.000Z",
  },
  {
    id: "d3",
    nome: "Roberto Silva",
    temFgts: true,
    temEntrada: false,
    renda: 4800,
    corretor: "Marina Alves",
    status: "aprovada",
    resultado: "aprovado",
    observacao: "Documentação completa.",
    createdAt: "2026-07-05T11:00:00.000Z",
    updatedAt: "2026-07-08T16:20:00.000Z",
  },
  {
    id: "d4",
    nome: "Ana Beatriz Costa",
    temFgts: true,
    temEntrada: true,
    renda: 9200,
    corretor: "Sofia Ramos",
    status: "pendencia",
    resultado: "aprovado_parcialmente",
    observacao: "Falta comprovante de FGTS atualizado.",
    createdAt: "2026-06-22T08:00:00.000Z",
    updatedAt: "2026-06-28T12:00:00.000Z",
  },
  {
    id: "d5",
    nome: "Lucas Oliveira",
    temFgts: false,
    temEntrada: false,
    renda: 3500,
    corretor: "Diego Cardoso",
    status: "recusada",
    resultado: "reprovado",
    observacao: "Renda insuficiente para o perfil.",
    createdAt: "2026-06-10T15:00:00.000Z",
    updatedAt: "2026-06-14T10:00:00.000Z",
  },
  {
    id: "d6",
    nome: "Fernanda Lima",
    temFgts: true,
    temEntrada: true,
    renda: 7100,
    corretor: "Pedro Henrique",
    status: "recebida",
    resultado: null,
    createdAt: "2026-07-21T09:30:00.000Z",
    updatedAt: "2026-07-21T09:30:00.000Z",
  },
];

function loadDocumentacoes(): Documentacao[] {
  if (typeof window === "undefined") return [...SEED];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...SEED];
    const parsed = JSON.parse(raw) as Documentacao[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...SEED];
  } catch {
    return [...SEED];
  }
}

function saveDocumentacoes(items: Documentacao[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

type DocumentacaoContextValue = {
  documentacoes: Documentacao[];
  addDocumentacao: (doc: Documentacao) => void;
  updateDocumentacao: (id: string, patch: Partial<Documentacao>) => void;
  deleteDocumentacao: (id: string) => void;
  updateStatus: (id: string, status: DocumentacaoStatus) => void;
};

const DocumentacaoContext = createContext<DocumentacaoContextValue | null>(null);

export function DocumentacaoProvider({ children }: { children: ReactNode }) {
  const [documentacoes, setDocumentacoes] = useState<Documentacao[]>(loadDocumentacoes);

  const addDocumentacao = useCallback((doc: Documentacao) => {
    setDocumentacoes((prev) => {
      const next = [doc, ...prev];
      saveDocumentacoes(next);
      return next;
    });
  }, []);

  const updateDocumentacao = useCallback((id: string, patch: Partial<Documentacao>) => {
    setDocumentacoes((prev) => {
      const next = prev.map((d) =>
        d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d,
      );
      saveDocumentacoes(next);
      return next;
    });
  }, []);

  const deleteDocumentacao = useCallback((id: string) => {
    setDocumentacoes((prev) => {
      const next = prev.filter((d) => d.id !== id);
      saveDocumentacoes(next);
      return next;
    });
  }, []);

  const updateStatus = useCallback((id: string, status: DocumentacaoStatus) => {
    setDocumentacoes((prev) => {
      const next = prev.map((d) => {
        if (d.id !== id) return d;
        let resultado = d.resultado;
        if (status === "aprovada") resultado = "aprovado";
        else if (status === "pendencia") resultado = "aprovado_parcialmente";
        else if (status === "recusada") resultado = "reprovado";
        else if (status === "recebida" || status === "em_analise") resultado = null;
        return { ...d, status, resultado, updatedAt: new Date().toISOString() };
      });
      saveDocumentacoes(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      documentacoes,
      addDocumentacao,
      updateDocumentacao,
      deleteDocumentacao,
      updateStatus,
    }),
    [documentacoes, addDocumentacao, updateDocumentacao, deleteDocumentacao, updateStatus],
  );

  return (
    <DocumentacaoContext.Provider value={value}>{children}</DocumentacaoContext.Provider>
  );
}

export function useDocumentacao() {
  const ctx = useContext(DocumentacaoContext);
  if (!ctx) throw new Error("useDocumentacao must be used within DocumentacaoProvider");
  return ctx;
}
