import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  createCatalogItem,
  deleteCatalogItem,
  fetchCatalog,
  installDefaultFunnelStages,
  reorderCatalog,
  updateCatalogItem,
  type CatalogItem,
  type CatalogType,
  type CreateCatalogInput,
  type FunilEtapaPapel,
  type GroupedCatalog,
  type UpdateCatalogInput,
} from "@/lib/catalog-api";
import { DEFAULT_CATALOG_COLOR } from "@/lib/catalog-colors";

/** Etapa do funil normalizada para as telas (id = slug). */
export type FunnelStage = {
  id: string;
  name: string;
  color: string;
  papel: FunilEtapaPapel | null;
};

/** Slug legado da etapa inicial (fallback). */
export const INITIAL_STAGE_SLUG = "novo";

const LEGACY_PAPEL_BY_SLUG: Record<string, FunilEtapaPapel> = {
  novo: "inicial",
  "em-analise": "analise",
  "ganho-venda": "venda",
  perdido: "perdido",
};

function resolvePapel(
  item: CatalogItem,
): FunilEtapaPapel | null {
  if (item.papel) return item.papel;
  const slug = item.slug ?? "";
  return LEGACY_PAPEL_BY_SLUG[slug] ?? null;
}

type CatalogContextValue = {
  catalog: GroupedCatalog;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Etapas do funil ativas, ordenadas (id = slug). */
  funnelStages: FunnelStage[];
  /** Slug da etapa usada ao criar lead (papel inicial). */
  defaultStageId: string;
  /** Slug da etapa com o papel dado, ou null. */
  stageByPapel: (papel: FunilEtapaPapel) => string | null;
  /** Labels ativos por tipo (para dropdowns). */
  origens: string[];
  motivos: string[];
  tags: string[];
  documentacaoFontes: string[];
  documentacaoStatus1: string[];
  documentacaoStatus2: string[];
  /** Cor Tailwind do item pelo label; fallback neutro se não houver. */
  colorByLabel: (type: CatalogType, label: string) => string;
  addItem: (input: CreateCatalogInput) => Promise<CatalogItem>;
  updateItem: (id: string, patch: UpdateCatalogInput) => Promise<CatalogItem>;
  removeItem: (id: string) => Promise<void>;
  reorder: (type: CatalogType, orderedIds: string[]) => Promise<void>;
  installDefaultFunnel: () => Promise<void>;
};

const emptyGrouped = (): GroupedCatalog => ({
  funil_etapa: [],
  origem: [],
  motivo_perda: [],
  tag: [],
  documentacao_fonte: [],
  documentacao_status1: [],
  documentacao_status2: [],
});

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<GroupedCatalog>(emptyGrouped);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (getSession()?.role === "super_admin") {
      setCatalog(emptyGrouped());
      setLoading(false);
      setError(null);
      return;
    }

    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchCatalog(true);
      setCatalog(data);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os catálogos.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const funnelStages = useMemo<FunnelStage[]>(
    () =>
      catalog.funil_etapa.map((item) => ({
        id: item.slug ?? item.id,
        name: item.label,
        color: item.color ?? DEFAULT_CATALOG_COLOR,
        papel: resolvePapel(item),
      })),
    [catalog.funil_etapa],
  );

  const stageByPapel = useCallback(
    (papel: FunilEtapaPapel) =>
      funnelStages.find((s) => s.papel === papel)?.id ?? null,
    [funnelStages],
  );

  const defaultStageId = useMemo(() => {
    return (
      stageByPapel("inicial") ??
      funnelStages[0]?.id ??
      INITIAL_STAGE_SLUG
    );
  }, [funnelStages, stageByPapel]);

  const origens = useMemo(
    () => catalog.origem.map((i) => i.label),
    [catalog.origem],
  );
  const motivos = useMemo(
    () => catalog.motivo_perda.map((i) => i.label),
    [catalog.motivo_perda],
  );
  const tags = useMemo(() => catalog.tag.map((i) => i.label), [catalog.tag]);
  const documentacaoFontes = useMemo(
    () => catalog.documentacao_fonte.map((i) => i.label),
    [catalog.documentacao_fonte],
  );
  const documentacaoStatus1 = useMemo(
    () => catalog.documentacao_status1.map((i) => i.label),
    [catalog.documentacao_status1],
  );
  const documentacaoStatus2 = useMemo(
    () => catalog.documentacao_status2.map((i) => i.label),
    [catalog.documentacao_status2],
  );

  const colorByLabel = useCallback(
    (type: CatalogType, label: string) => {
      const item = catalog[type].find((i) => i.label === label);
      return item?.color ?? DEFAULT_CATALOG_COLOR;
    },
    [catalog],
  );

  const upsertLocal = useCallback((item: CatalogItem) => {
    setCatalog((prev) => {
      const list = prev[item.type].filter((i) => i.id !== item.id);
      const next = item.active ? [...list, item] : list;
      next.sort(
        (a, b) =>
          a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "pt-BR"),
      );
      return { ...prev, [item.type]: next };
    });
  }, []);

  const addItem = useCallback(
    async (input: CreateCatalogInput) => {
      const created = await createCatalogItem(input);
      upsertLocal(created);
      return created;
    },
    [upsertLocal],
  );

  const updateItem = useCallback(
    async (id: string, patch: UpdateCatalogInput) => {
      const updated = await updateCatalogItem(id, patch);
      upsertLocal(updated);
      return updated;
    },
    [upsertLocal],
  );

  const removeItem = useCallback(async (id: string) => {
    const removed = await deleteCatalogItem(id);
    setCatalog((prev) => ({
      ...prev,
      [removed.type]: prev[removed.type].filter((i) => i.id !== id),
    }));
  }, []);

  const reorder = useCallback(
    async (type: CatalogType, orderedIds: string[]) => {
      const items = await reorderCatalog(type, orderedIds);
      setCatalog((prev) => ({
        ...prev,
        [type]: items.filter((i) => i.active),
      }));
    },
    [],
  );

  const installDefaultFunnel = useCallback(async () => {
    const stages = await installDefaultFunnelStages();
    setCatalog((prev) => ({
      ...prev,
      funil_etapa: stages.filter((i) => i.active),
    }));
  }, []);

  const value = useMemo(
    () => ({
      catalog,
      loading,
      error,
      refresh,
      funnelStages,
      defaultStageId,
      stageByPapel,
      origens,
      motivos,
      tags,
      documentacaoFontes,
      documentacaoStatus1,
      documentacaoStatus2,
      colorByLabel,
      addItem,
      updateItem,
      removeItem,
      reorder,
      installDefaultFunnel,
    }),
    [
      catalog,
      loading,
      error,
      refresh,
      funnelStages,
      defaultStageId,
      stageByPapel,
      origens,
      motivos,
      tags,
      documentacaoFontes,
      documentacaoStatus1,
      documentacaoStatus2,
      colorByLabel,
      addItem,
      updateItem,
      removeItem,
      reorder,
      installDefaultFunnel,
    ],
  );

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}
