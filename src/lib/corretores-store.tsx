import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CORRETORES, type Corretor } from "@/lib/mock-data";

const STORAGE_KEY = "crm_mock_corretores_v3";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function normalizeCorretor(raw: Partial<Corretor> & { id: string; nome: string }): Corretor {
  const base = CORRETORES.find((c) => c.id === raw.id);
  const meta = raw.meta ?? base?.meta ?? 3;
  return {
    id: raw.id,
    nome: raw.nome,
    creci: raw.creci ?? base?.creci ?? "",
    telefone: raw.telefone ?? base?.telefone ?? "",
    email: raw.email ?? base?.email ?? "",
    equipe: raw.equipe ?? base?.equipe ?? "Time Norte",
    meta,
    metaPessoal: raw.metaPessoal ?? base?.metaPessoal ?? meta,
    vendas: raw.vendas ?? base?.vendas ?? 0,
    leads: raw.leads ?? base?.leads ?? 0,
    valorVendido: raw.valorVendido ?? base?.valorVendido ?? 0,
    status: raw.status ?? base?.status ?? "Ativo",
    criadoEm: raw.criadoEm ?? base?.criadoEm ?? todayIso(),
  };
}

function loadCorretores(): Corretor[] {
  if (typeof window === "undefined") return CORRETORES.map((c) => ({ ...c }));
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return CORRETORES.map((c) => ({ ...c }));
    const parsed = JSON.parse(raw) as Partial<Corretor>[];
    if (!Array.isArray(parsed) || parsed.length === 0) return CORRETORES.map((c) => ({ ...c }));
    return parsed
      .filter((c): c is Partial<Corretor> & { id: string; nome: string } => !!c?.id && !!c?.nome)
      .map(normalizeCorretor);
  } catch {
    return CORRETORES.map((c) => ({ ...c }));
  }
}

function saveCorretores(corretores: Corretor[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(corretores));
}

type CorretoresContextValue = {
  corretores: Corretor[];
  addCorretor: (corretor: Corretor) => void;
  updateCorretor: (id: string, patch: Partial<Corretor>) => void;
  deleteCorretor: (id: string) => void;
  setCorretorStatus: (id: string, status: Corretor["status"]) => void;
  /** Define meta da gerência para todos ou IDs específicos */
  setMetas: (meta: number, ids?: string[]) => void;
  /** Corretor define a própria meta pessoal */
  setMetaPessoal: (id: string, metaPessoal: number) => void;
};

const CorretoresContext = createContext<CorretoresContextValue | null>(null);

export function CorretoresProvider({ children }: { children: ReactNode }) {
  const [corretores, setCorretores] = useState<Corretor[]>(loadCorretores);

  const addCorretor = useCallback((corretor: Corretor) => {
    setCorretores((prev) => {
      const next = [corretor, ...prev];
      saveCorretores(next);
      return next;
    });
  }, []);

  const updateCorretor = useCallback((id: string, patch: Partial<Corretor>) => {
    setCorretores((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
      saveCorretores(next);
      return next;
    });
  }, []);

  const deleteCorretor = useCallback((id: string) => {
    setCorretores((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveCorretores(next);
      return next;
    });
  }, []);

  const setCorretorStatus = useCallback((id: string, status: Corretor["status"]) => {
    setCorretores((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, status } : c));
      saveCorretores(next);
      return next;
    });
  }, []);

  const setMetas = useCallback((meta: number, ids?: string[]) => {
    setCorretores((prev) => {
      const idSet = ids ? new Set(ids) : null;
      const next = prev.map((c) =>
        !idSet || idSet.has(c.id) ? { ...c, meta } : c,
      );
      saveCorretores(next);
      return next;
    });
  }, []);

  const setMetaPessoal = useCallback((id: string, metaPessoal: number) => {
    setCorretores((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, metaPessoal } : c));
      saveCorretores(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      corretores,
      addCorretor,
      updateCorretor,
      deleteCorretor,
      setCorretorStatus,
      setMetas,
      setMetaPessoal,
    }),
    [corretores, addCorretor, updateCorretor, deleteCorretor, setCorretorStatus, setMetas, setMetaPessoal],
  );

  return <CorretoresContext.Provider value={value}>{children}</CorretoresContext.Provider>;
}

export function useCorretores() {
  const ctx = useContext(CorretoresContext);
  if (!ctx) throw new Error("useCorretores must be used within CorretoresProvider");
  return ctx;
}
