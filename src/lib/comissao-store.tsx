import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Comissão:
 * 1) X% do VGV = comissão da imobiliária (padrão 4%)
 * 2) (−) Y% dessa comissão = NF (padrão 10%)
 * 3) Do que sobrar, (−) Z% = corretor (padrão 35%)
 * 4) Restante = líquido da imobiliária
 */
export type ComissaoCalculo = {
  id: string;
  empreendimentoId: string;
  empreendimentoNome: string;
  vgv: number;
  pctImobiliaria: number;
  pctNf: number;
  pctCorretor: number;
  valorImobiliaria: number;
  valorNf: number;
  valorAposNf: number;
  valorCorretor: number;
  valorLiquido: number;
  createdAt: string;
};

export const DEFAULT_PCT_IMOBILIARIA = 4;
export const DEFAULT_PCT_NF = 10;
export const DEFAULT_PCT_CORRETOR = 35;

export function calcComissao(
  vgv: number,
  pctImobiliaria: number,
  pctNf: number,
  pctCorretor: number,
) {
  const valorImobiliaria = vgv * (pctImobiliaria / 100);
  const valorNf = valorImobiliaria * (pctNf / 100);
  const valorAposNf = valorImobiliaria - valorNf;
  const valorCorretor = valorAposNf * (pctCorretor / 100);
  const valorLiquido = valorAposNf - valorCorretor;
  return { valorImobiliaria, valorNf, valorAposNf, valorCorretor, valorLiquido };
}

const STORAGE_KEY = "crm_mock_comissoes_v5";

const SEED: ComissaoCalculo[] = [
  {
    id: "cm1",
    empreendimentoId: "np-01",
    empreendimentoNome: "Mirante Belvedere",
    vgv: 320000,
    pctImobiliaria: DEFAULT_PCT_IMOBILIARIA,
    pctNf: DEFAULT_PCT_NF,
    pctCorretor: DEFAULT_PCT_CORRETOR,
    ...calcComissao(320000, DEFAULT_PCT_IMOBILIARIA, DEFAULT_PCT_NF, DEFAULT_PCT_CORRETOR),
    createdAt: "2026-07-10T12:00:00.000Z",
  },
];

function isValidCalculo(item: unknown): item is ComissaoCalculo {
  if (!item || typeof item !== "object") return false;
  const c = item as Partial<ComissaoCalculo>;
  return (
    typeof c.vgv === "number" &&
    typeof c.valorImobiliaria === "number" &&
    typeof c.valorAposNf === "number" &&
    typeof c.pctImobiliaria === "number"
  );
}

function loadComissoes(): ComissaoCalculo[] {
  if (typeof window === "undefined") return [...SEED];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...SEED];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [...SEED];
    const valid = parsed.filter(isValidCalculo);
    return valid.length > 0 ? valid : [...SEED];
  } catch {
    return [...SEED];
  }
}

function saveComissoes(items: ComissaoCalculo[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

type ComissaoContextValue = {
  comissoes: ComissaoCalculo[];
  addComissao: (item: ComissaoCalculo) => void;
  deleteComissao: (id: string) => void;
};

const ComissaoContext = createContext<ComissaoContextValue | null>(null);

export function ComissaoProvider({ children }: { children: ReactNode }) {
  const [comissoes, setComissoes] = useState<ComissaoCalculo[]>(loadComissoes);

  const addComissao = useCallback((item: ComissaoCalculo) => {
    setComissoes((prev) => {
      const next = [item, ...prev];
      saveComissoes(next);
      return next;
    });
  }, []);

  const deleteComissao = useCallback((id: string) => {
    setComissoes((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveComissoes(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ comissoes, addComissao, deleteComissao }),
    [comissoes, addComissao, deleteComissao],
  );

  return <ComissaoContext.Provider value={value}>{children}</ComissaoContext.Provider>;
}

export function useComissao() {
  const ctx = useContext(ComissaoContext);
  if (!ctx) throw new Error("useComissao must be used within ComissaoProvider");
  return ctx;
}
