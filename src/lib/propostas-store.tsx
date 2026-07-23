import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PROPOSTAS, type Proposta } from "@/lib/mock-data";

const STORAGE_KEY = "crm_mock_propostas";

function loadPropostas(): Proposta[] {
  if (typeof window === "undefined") return [...PROPOSTAS];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...PROPOSTAS];
    const parsed = JSON.parse(raw) as Proposta[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...PROPOSTAS];
  } catch {
    return [...PROPOSTAS];
  }
}

function savePropostas(propostas: Proposta[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(propostas));
}

type PropostasContextValue = {
  propostas: Proposta[];
  addProposta: (proposta: Proposta) => void;
  updateProposta: (id: string, patch: Partial<Proposta>) => void;
  deleteProposta: (id: string) => void;
};

const PropostasContext = createContext<PropostasContextValue | null>(null);

export function PropostasProvider({ children }: { children: ReactNode }) {
  const [propostas, setPropostas] = useState<Proposta[]>(loadPropostas);

  const addProposta = useCallback((proposta: Proposta) => {
    setPropostas((prev) => {
      const next = [proposta, ...prev];
      savePropostas(next);
      return next;
    });
  }, []);

  const updateProposta = useCallback((id: string, patch: Partial<Proposta>) => {
    setPropostas((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      savePropostas(next);
      return next;
    });
  }, []);

  const deleteProposta = useCallback((id: string) => {
    setPropostas((prev) => {
      const next = prev.filter((p) => p.id !== id);
      savePropostas(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ propostas, addProposta, updateProposta, deleteProposta }),
    [propostas, addProposta, updateProposta, deleteProposta],
  );

  return <PropostasContext.Provider value={value}>{children}</PropostasContext.Provider>;
}

export function usePropostas() {
  const ctx = useContext(PropostasContext);
  if (!ctx) throw new Error("usePropostas must be used within PropostasProvider");
  return ctx;
}
