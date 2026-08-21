import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";

export type VistaParcelas = "lista" | "agrupado";

const VISTA_PARCELAS_KEY = "financeiro.titulos.vistaParcelas";
const HIDE_VALUES_KEY_PREFIX = "financeiro.visaoGeral.hideValues";
export const FINANCEIRO_HIDE_VALUES_EVENT = "financeiro-hide-values";

export function getVistaParcelas(): VistaParcelas {
  try {
    const raw = localStorage.getItem(VISTA_PARCELAS_KEY);
    if (raw === "lista" || raw === "agrupado") return raw;
  } catch {
    /* ignore */
  }
  return "agrupado";
}

export const VISTA_PARCELAS_EVENT = "financeiro-vista-parcelas";

export function setVistaParcelas(value: VistaParcelas): void {
  localStorage.setItem(VISTA_PARCELAS_KEY, value);
  window.dispatchEvent(new Event(VISTA_PARCELAS_EVENT));
}

function hideValuesStorageKey() {
  const session = getSession();
  const tenantId = session?.tenant?.id ?? session?.tenantId ?? "default";
  const userId = session?.id ?? "anon";
  return `${HIDE_VALUES_KEY_PREFIX}.${tenantId}.${userId}`;
}

export function getHideFinanceiroValues(): boolean {
  try {
    const raw = localStorage.getItem(hideValuesStorageKey());
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

export function setHideFinanceiroValues(hide: boolean): void {
  localStorage.setItem(hideValuesStorageKey(), hide ? "1" : "0");
  window.dispatchEvent(new Event(FINANCEIRO_HIDE_VALUES_EVENT));
}

export function useHideFinanceiroValues() {
  const [hide, setHide] = useState(false);

  useEffect(() => {
    const sync = () => setHide(getHideFinanceiroValues());
    sync();
    window.addEventListener(FINANCEIRO_HIDE_VALUES_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(FINANCEIRO_HIDE_VALUES_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return [
    hide,
    (next: boolean) => {
      setHideFinanceiroValues(next);
      setHide(next);
    },
  ] as const;
}
