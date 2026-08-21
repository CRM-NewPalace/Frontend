import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";

const VISTA_KEY_PREFIX = "metas.vista";
export const METAS_VISTA_EVENT = "metas-vista-pref";
export type MetasVista = "cards" | "tabela";

function vistaStorageKey() {
  const session = getSession();
  const tenantId = session?.tenant?.id ?? session?.tenantId ?? "default";
  const userId = session?.id ?? "anon";
  return `${VISTA_KEY_PREFIX}.${tenantId}.${userId}`;
}

export function getMetasVista(): MetasVista {
  try {
    return localStorage.getItem(vistaStorageKey()) === "tabela"
      ? "tabela"
      : "cards";
  } catch {
    return "cards";
  }
}

export function setMetasVista(vista: MetasVista): void {
  localStorage.setItem(vistaStorageKey(), vista);
  window.dispatchEvent(new Event(METAS_VISTA_EVENT));
}

export function useMetasVista() {
  const [vista, setVistaState] = useState<MetasVista>(() => getMetasVista());

  useEffect(() => {
    const sync = () => setVistaState(getMetasVista());
    sync();
    window.addEventListener(METAS_VISTA_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(METAS_VISTA_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function setVista(next: MetasVista) {
    setMetasVista(next);
    setVistaState(next);
  }

  return [vista, setVista] as const;
}
