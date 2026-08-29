import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";

const KEY_PREFIX = "clientes.hideFromSidebar";
export const CLIENTES_NAV_EVENT = "clientes-nav-pref";

function storageKey() {
  const session = getSession();
  const tenantId = session?.tenant?.id ?? session?.tenantId ?? "default";
  const userId = session?.id ?? "anon";
  return `${KEY_PREFIX}.${tenantId}.${userId}`;
}

/** Ligado = some Clientes e Funil de Clientes do menu. */
export function getHideClientesFromSidebar(): boolean {
  try {
    const raw = localStorage.getItem(storageKey());
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

export function setHideClientesFromSidebar(hide: boolean): void {
  localStorage.setItem(storageKey(), hide ? "1" : "0");
  window.dispatchEvent(new Event(CLIENTES_NAV_EVENT));
}

export function useHideClientesFromSidebar() {
  const [hide, setHide] = useState(false);

  useEffect(() => {
    const sync = () => setHide(getHideClientesFromSidebar());
    sync();
    window.addEventListener(CLIENTES_NAV_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CLIENTES_NAV_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return hide;
}
