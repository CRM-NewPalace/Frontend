import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";

const KEY_PREFIX = "imoveis.hideFromSidebar";
export const IMOVEIS_NAV_EVENT = "imoveis-nav-pref";

function storageKey() {
  const session = getSession();
  const tenantId = session?.tenant?.id ?? session?.tenantId ?? "default";
  const userId = session?.id ?? "anon";
  return `${KEY_PREFIX}.${tenantId}.${userId}`;
}

/** Ligado = some do menu e fica só em Configurações. */
export function getHideImoveisFromSidebar(): boolean {
  try {
    const raw = localStorage.getItem(storageKey());
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

export function setHideImoveisFromSidebar(hide: boolean): void {
  localStorage.setItem(storageKey(), hide ? "1" : "0");
  window.dispatchEvent(new Event(IMOVEIS_NAV_EVENT));
}

export function useHideImoveisFromSidebar() {
  const [hide, setHide] = useState(false);

  useEffect(() => {
    const sync = () => setHide(getHideImoveisFromSidebar());
    sync();
    window.addEventListener(IMOVEIS_NAV_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(IMOVEIS_NAV_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return hide;
}
