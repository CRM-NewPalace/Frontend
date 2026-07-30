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
import { getSession } from "@/lib/auth";
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
import { prependLostLeadToCache } from "@/lib/lost-leads-cache";

const LEGACY_STORAGE_KEY = "crm_mock_leads";

export type { LeadAssignee };

type LeadsContextValue = {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  /** Usuários ativos para atribuição (vindo de GET /leads/assignees). */
  assignees: LeadAssignee[];
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  resolveCorretorId: (nome: string) => string | undefined;
  addLead: (input: CreateLeadInput) => Promise<Lead>;
  updateLead: (
    id: string,
    patch: UpdateLeadInput & { corretor?: string },
  ) => Promise<Lead>;
  updateLeadStage: (
    id: string,
    stage: StageId,
    extra?: { construtoraId?: string; empreendimentoId?: string },
  ) => Promise<Lead>;
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

function todayLabel(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function buildOptimisticLead(
  input: CreateLeadInput,
  assignees: LeadAssignee[],
): Lead {
  const session = getSession();
  const assignee =
    (input.corretorId
      ? assignees.find((a) => a.id === input.corretorId)
      : null) ??
    (session ? assignees.find((a) => a.id === session.id) : null);

  return {
    id: `temp-${crypto.randomUUID()}`,
    tipo: input.tipo === "cliente" ? "cliente" : "lead",
    nome: input.nome,
    telefone: input.telefone,
    email: input.email,
    origem: input.origem,
    interesse: input.interesse,
    cidade: input.cidade,
    bairro: input.bairro,
    corretor: assignee?.name ?? session?.name ?? "—",
    corretorId: input.corretorId ?? assignee?.id ?? session?.id ?? null,
    stage: input.stage ?? "novo",
    prioridade: input.prioridade ?? "Média",
    renda: input.renda ?? null,
    updatedAt: todayLabel(),
    tags: input.tags ?? [],
  };
}

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [assignees, setAssignees] = useState<LeadAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
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

  const addLead = useCallback(
    async (input: CreateLeadInput) => {
      const optimistic = buildOptimisticLead(input, assignees);
      setLeads((prev) => [optimistic, ...prev]);

      try {
        const created = await createLead(input);
        const mapped = mapApiLead(created);
        setLeads((prev) =>
          prev.map((l) => (l.id === optimistic.id ? mapped : l)),
        );
        return mapped;
      } catch (err) {
        setLeads((prev) => prev.filter((l) => l.id !== optimistic.id));
        throw err;
      }
    },
    [assignees],
  );

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

      const previous = leads.find((l) => l.id === id);
      if (previous) {
        const assigneeName = body.corretorId
          ? (assignees.find((a) => a.id === body.corretorId)?.name ??
            previous.corretor)
          : corretor
            ? corretor
            : previous.corretor;

        setLeads((prev) =>
          prev.map((l) =>
            l.id === id
              ? {
                  ...l,
                  ...rest,
                  ...(body.corretorId !== undefined
                    ? { corretorId: body.corretorId, corretor: assigneeName }
                    : {}),
                  ...(corretor && !body.corretorId
                    ? { corretor }
                    : {}),
                  updatedAt: todayLabel(),
                }
              : l,
          ),
        );
      }

      try {
        const updated = await updateLeadApi(id, body);
        const mapped = mapApiLead(updated);
        setLeads((prev) => prev.map((l) => (l.id === id ? mapped : l)));
        return mapped;
      } catch (err) {
        if (previous) {
          setLeads((prev) => prev.map((l) => (l.id === id ? previous : l)));
        }
        throw err;
      }
    },
    [assignees, leads, resolveCorretorId],
  );

  const updateLeadStage = useCallback(
    async (
      id: string,
      stage: StageId,
      extra?: { construtoraId?: string; empreendimentoId?: string },
    ) => {
      const previous = leads.find((l) => l.id === id);
      setLeads((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, stage, updatedAt: todayLabel() } : l,
        ),
      );

      try {
        const updated = await updateLeadStageApi(id, stage, extra);
        const mapped = mapApiLead(updated);
        setLeads((prev) => prev.map((l) => (l.id === id ? mapped : l)));
        return mapped;
      } catch (err) {
        if (previous) {
          setLeads((prev) => prev.map((l) => (l.id === id ? previous : l)));
        }
        throw err;
      }
    },
    [leads],
  );

  const markLeadLost = useCallback(async (id: string, motivo: string) => {
    let previous: Lead | undefined;
    setLeads((prev) => {
      previous = prev.find((l) => l.id === id);
      return prev.filter((l) => l.id !== id);
    });

    try {
      const api = await markLeadLostApi(id, motivo);
      prependLostLeadToCache(api);
    } catch (err) {
      if (previous) {
        setLeads((prev) => [previous!, ...prev]);
      }
      throw err;
    }
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    let previous: Lead | undefined;
    setLeads((prev) => {
      previous = prev.find((l) => l.id === id);
      return prev.filter((l) => l.id !== id);
    });

    try {
      await deleteLeadApi(id);
    } catch (err) {
      if (previous) {
        setLeads((prev) => [previous!, ...prev]);
      }
      throw err;
    }
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
