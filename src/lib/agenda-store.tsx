import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AGENDA, type AgendaEvento } from "@/lib/mock-data";

const STORAGE_KEY = "crm_mock_agenda";

function loadAgenda(): AgendaEvento[] {
  if (typeof window === "undefined") return [...AGENDA];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...AGENDA];
    const parsed = JSON.parse(raw) as AgendaEvento[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...AGENDA];
  } catch {
    return [...AGENDA];
  }
}

function saveAgenda(events: AgendaEvento[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

type AgendaContextValue = {
  events: AgendaEvento[];
  addEvent: (event: AgendaEvento) => void;
  updateEvent: (id: string, patch: Partial<AgendaEvento>) => void;
  deleteEvent: (id: string) => void;
};

const AgendaContext = createContext<AgendaContextValue | null>(null);

export function AgendaProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<AgendaEvento[]>(loadAgenda);

  const addEvent = useCallback((event: AgendaEvento) => {
    setEvents((prev) => {
      const next = [event, ...prev];
      saveAgenda(next);
      return next;
    });
  }, []);

  const updateEvent = useCallback((id: string, patch: Partial<AgendaEvento>) => {
    setEvents((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...patch } : e));
      saveAgenda(next);
      return next;
    });
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveAgenda(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ events, addEvent, updateEvent, deleteEvent }),
    [events, addEvent, updateEvent, deleteEvent],
  );

  return <AgendaContext.Provider value={value}>{children}</AgendaContext.Provider>;
}

export function useAgenda() {
  const ctx = useContext(AgendaContext);
  if (!ctx) throw new Error("useAgenda must be used within AgendaProvider");
  return ctx;
}
