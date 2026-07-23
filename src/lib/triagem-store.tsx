import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const TRIAGEM_STATUS = [
  "Contato inicial",
  "Qualificando interesse",
  "Apresentando empreendimentos",
  "Agendando visita",
  "Em visita",
  "Negociando proposta",
  "Aguardando documentação",
  "Aguardando retorno do cliente",
  "Em follow-up",
  "Pausado / sem retorno",
] as const;

export type TriagemStatus = (typeof TRIAGEM_STATUS)[number];

export interface TriagemEntry {
  id: string;
  leadId: string;
  leadNome: string;
  corretorNome: string;
  status: TriagemStatus;
  observacao: string;
  updatedAt: string; // ISO
}

const STORAGE_KEY = "crm_mock_triagem_v1";

const SEED: TriagemEntry[] = [
  {
    id: "t1",
    leadId: "L1000",
    leadNome: "João Pereira",
    corretorNome: "Marina Alves",
    status: "Apresentando empreendimentos",
    observacao: "Cliente pediu opções de 2 quartos na zona norte.",
    updatedAt: "2026-07-23T15:45:00.000Z",
  },
  {
    id: "t2",
    leadId: "L1003",
    leadNome: "Beatriz Costa",
    corretorNome: "Pedro Henrique",
    status: "Agendando visita",
    observacao: "Confirmando horário para sábado de manhã.",
    updatedAt: "2026-07-23T14:20:00.000Z",
  },
  {
    id: "t3",
    leadId: "L1005",
    leadNome: "Camila Rocha",
    corretorNome: "Sofia Ramos",
    status: "Aguardando retorno do cliente",
    observacao: "Enviou proposta ontem, sem resposta ainda.",
    updatedAt: "2026-07-22T18:10:00.000Z",
  },
];

function loadTriagens(): TriagemEntry[] {
  if (typeof window === "undefined") return [...SEED];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...SEED];
    const parsed = JSON.parse(raw) as TriagemEntry[];
    return Array.isArray(parsed) ? parsed : [...SEED];
  } catch {
    return [...SEED];
  }
}

function saveTriagens(items: TriagemEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

type TriagemContextValue = {
  triagens: TriagemEntry[];
  upsertTriagem: (entry: Omit<TriagemEntry, "id" | "updatedAt"> & { id?: string }) => void;
  removeTriagem: (id: string) => void;
};

const TriagemContext = createContext<TriagemContextValue | null>(null);

export function TriagemProvider({ children }: { children: ReactNode }) {
  const [triagens, setTriagens] = useState<TriagemEntry[]>(loadTriagens);

  const upsertTriagem = useCallback(
    (entry: Omit<TriagemEntry, "id" | "updatedAt"> & { id?: string }) => {
      setTriagens((prev) => {
        const now = new Date().toISOString();
        // One active triage per lead+corretor: update if exists
        const existingIdx = prev.findIndex(
          (t) =>
            t.leadId === entry.leadId &&
            t.corretorNome === entry.corretorNome,
        );

        let next: TriagemEntry[];
        if (existingIdx >= 0) {
          next = prev.map((t, i) =>
            i === existingIdx
              ? {
                  ...t,
                  status: entry.status,
                  observacao: entry.observacao,
                  leadNome: entry.leadNome,
                  updatedAt: now,
                }
              : t,
          );
        } else {
          next = [
            {
              id: entry.id ?? `tr${Date.now()}`,
              leadId: entry.leadId,
              leadNome: entry.leadNome,
              corretorNome: entry.corretorNome,
              status: entry.status,
              observacao: entry.observacao,
              updatedAt: now,
            },
            ...prev,
          ];
        }
        saveTriagens(next);
        return next;
      });
    },
    [],
  );

  const removeTriagem = useCallback((id: string) => {
    setTriagens((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveTriagens(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ triagens, upsertTriagem, removeTriagem }),
    [triagens, upsertTriagem, removeTriagem],
  );

  return <TriagemContext.Provider value={value}>{children}</TriagemContext.Provider>;
}

export function useTriagem() {
  const ctx = useContext(TriagemContext);
  if (!ctx) throw new Error("useTriagem must be used within TriagemProvider");
  return ctx;
}
