export type VistaParcelas = "lista" | "agrupado";

const VISTA_PARCELAS_KEY = "financeiro.titulos.vistaParcelas";

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
