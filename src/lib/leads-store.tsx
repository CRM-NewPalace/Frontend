import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LEADS, type Lead, type StageId } from "@/lib/mock-data";

const STORAGE_KEY = "crm_mock_leads";

function loadLeads(): Lead[] {
  if (typeof window === "undefined") return [...LEADS];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...LEADS];
    const parsed = JSON.parse(raw) as Lead[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...LEADS];
  } catch {
    return [...LEADS];
  }
}

function saveLeads(leads: Lead[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

function todayLabel() {
  const today = new Date();
  return `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
}

type LeadsContextValue = {
  leads: Lead[];
  addLead: (lead: Lead) => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  updateLeadStage: (id: string, stage: StageId) => void;
  deleteLead: (id: string) => void;
};

const LeadsContext = createContext<LeadsContextValue | null>(null);

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(loadLeads);

  const addLead = useCallback((lead: Lead) => {
    setLeads((prev) => {
      const next = [lead, ...prev];
      saveLeads(next);
      return next;
    });
  }, []);

  const updateLead = useCallback((id: string, patch: Partial<Lead>) => {
    setLeads((prev) => {
      const next = prev.map((l) =>
        l.id === id ? { ...l, ...patch, updatedAt: patch.updatedAt ?? todayLabel() } : l,
      );
      saveLeads(next);
      return next;
    });
  }, []);

  const updateLeadStage = useCallback((id: string, stage: StageId) => {
    setLeads((prev) => {
      const next = prev.map((l) =>
        l.id === id ? { ...l, stage, updatedAt: todayLabel() } : l,
      );
      saveLeads(next);
      return next;
    });
  }, []);

  const deleteLead = useCallback((id: string) => {
    setLeads((prev) => {
      const next = prev.filter((l) => l.id !== id);
      saveLeads(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ leads, addLead, updateLead, updateLeadStage, deleteLead }),
    [leads, addLead, updateLead, updateLeadStage, deleteLead],
  );

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within LeadsProvider");
  return ctx;
}
