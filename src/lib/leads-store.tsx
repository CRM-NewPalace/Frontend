import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Lead, StageId } from "@/lib/crm-types";
import { ApiError } from "@/lib/api";
import {
  createLead,
  deleteLeadApi,
  fetchLeadAssignees,
  fetchLeads,
  mapApiLead,
  markLeadLostApi,
  updateLeadApi,
  updateLeadStageApi,
  type CreateLeadInput,
  type LeadAssignee,
  type UpdateLeadInput,
} from "@/lib/leads-api";

const LEGACY_STORAGE_KEY = "crm_mock_leads";

export type { LeadAssignee };

type LeadsContextValue = {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  /** Usuários ativos para atribuição (vindo de GET /leads/assignees). */
  assignees: LeadAssignee[];
  refresh: () => Promise<void>;
  resolveCorretorId: (nome: string) => string | undefined;
  addLead: (input: CreateLeadInput) => Promise<Lead>;
  updateLead: (id: string, patch: UpdateLeadInput & { corretor?: string }) => Promise<Lead>;
  updateLeadStage: (id: string, stage: StageId) => Promise<Lead>;
  /** Marca como perdido (sai das listas operacionais). */
  markLeadLost: (id: string, motivo: string) => Promise<void>;
  /** Exclusão definitiva (admin, lead já perdido). */
  deleteLead: (id: string) => Promise<void>;
};

const LeadsContext = createContext<LeadsContextValue | null>(null);

function clearLegacyStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [assignees, setAssignees] = useState<LeadAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [page, team] = await Promise.all([
        fetchLeads({ page: 1, limit: 100 }),
        fetchLeadAssignees(),
      ]);
      setLeads(page.data.map(mapApiLead));
      setAssignees(
        [...team].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      );
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os leads.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearLegacyStorage();
    void refresh();
  }, [refresh]);

  const resolveCorretorId = useCallback(
    (nome: string) => assignees.find((a) => a.name === nome)?.id,
    [assignees],
  );

  const addLead = useCallback(async (input: CreateLeadInput) => {
    const created = await createLead(input);
    const mapped = mapApiLead(created);
    setLeads((prev) => [mapped, ...prev.filter((l) => l.id !== mapped.id)]);
    return mapped;
  }, []);

  const updateLead = useCallback(
    async (id: string, patch: UpdateLeadInput & { corretor?: string }) => {
      const { corretor, corretorId, ...rest } = patch;
      const body: UpdateLeadInput = { ...rest };

      if (corretorId) {
        body.corretorId = corretorId;
      } else if (corretor) {
        const resolved = resolveCorretorId(corretor);
        if (resolved) body.corretorId = resolved;
      }

      const updated = await updateLeadApi(id, body);
      const mapped = mapApiLead(updated);
      setLeads((prev) => prev.map((l) => (l.id === id ? mapped : l)));
      return mapped;
    },
    [resolveCorretorId],
  );

  const updateLeadStage = useCallback(async (id: string, stage: StageId) => {
    const updated = await updateLeadStageApi(id, stage);
    const mapped = mapApiLead(updated);
    setLeads((prev) => prev.map((l) => (l.id === id ? mapped : l)));
    return mapped;
  }, []);

  const markLeadLost = useCallback(async (id: string, motivo: string) => {
    await markLeadLostApi(id, motivo);
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    await deleteLeadApi(id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      leads,
      loading,
      error,
      assignees,
      refresh,
      resolveCorretorId,
      addLead,
      updateLead,
      updateLeadStage,
      markLeadLost,
      deleteLead,
    }),
    [
      leads,
      loading,
      error,
      assignees,
      refresh,
      resolveCorretorId,
      addLead,
      updateLead,
      updateLeadStage,
      markLeadLost,
      deleteLead,
    ],
  );

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within LeadsProvider");
  return ctx;
}
