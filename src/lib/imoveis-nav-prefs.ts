import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";

const KEY_PREFIX = "imoveis.hideFromSidebar";
const VISTA_KEY_PREFIX = "imoveis.vista";
export const IMOVEIS_NAV_EVENT = "imoveis-nav-pref";
export type ImoveisVista = "cards" | "tabela";

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

function vistaStorageKey() {
  const session = getSession();
  const tenantId = session?.tenant?.id ?? session?.tenantId ?? "default";
  const userId = session?.id ?? "anon";
  return `${VISTA_KEY_PREFIX}.${tenantId}.${userId}`;
}

export function getImoveisVista(): ImoveisVista {
  try {
    return localStorage.getItem(vistaStorageKey()) === "tabela"
      ? "tabela"
      : "cards";
  } catch {
    return "cards";
  }
}

export function setImoveisVista(vista: ImoveisVista): void {
  localStorage.setItem(vistaStorageKey(), vista);
  window.dispatchEvent(new Event(IMOVEIS_NAV_EVENT));
}

export function useImoveisVista() {
  const [vista, setVistaState] = useState<ImoveisVista>(() => getImoveisVista());

  useEffect(() => {
    const sync = () => setVistaState(getImoveisVista());
    sync();
    window.addEventListener(IMOVEIS_NAV_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(IMOVEIS_NAV_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function setVista(next: ImoveisVista) {
    setImoveisVista(next);
    setVistaState(next);
  }

  return [vista, setVista] as const;
}

export const IMOVEIS_CAMPO_GRUPOS = [
  { id: "cadastro", label: "Cadastro" },
  { id: "local", label: "Local" },
  { id: "ficha", label: "Ficha" },
] as const;

export type ImoveisCampoGrupo = (typeof IMOVEIS_CAMPO_GRUPOS)[number]["id"];

export const IMOVEIS_CAMPOS = [
  { id: "tipo", label: "Tipo", grupo: "cadastro" },
  { id: "status", label: "Status", grupo: "cadastro" },
  { id: "tags", label: "Tags", grupo: "cadastro" },
  { id: "construtora", label: "Construtora", grupo: "local" },
  { id: "localidade", label: "Localidade", grupo: "local" },
  { id: "endereco", label: "Endereço", grupo: "local" },
  { id: "previsao", label: "Previsão", grupo: "ficha" },
  { id: "quartos", label: "Quartos", grupo: "ficha" },
  { id: "banheiros", label: "Banheiros", grupo: "ficha" },
  { id: "vagas", label: "Vagas", grupo: "ficha" },
  { id: "metragem", label: "Metragem", grupo: "ficha" },
  { id: "valor", label: "A partir de", grupo: "ficha" },
  { id: "renda", label: "Renda a partir de", grupo: "ficha" },
] as const;

export type ImoveisCampo = (typeof IMOVEIS_CAMPOS)[number]["id"];

const CAMPOS_KEY_PREFIX = "imoveis.camposOcultos";

function camposStorageKey() {
  const session = getSession();
  const tenantId = session?.tenant?.id ?? session?.tenantId ?? "default";
  const userId = session?.id ?? "anon";
  return `${CAMPOS_KEY_PREFIX}.${tenantId}.${userId}`;
}

function isImoveisCampo(value: unknown): value is ImoveisCampo {
  return IMOVEIS_CAMPOS.some((campo) => campo.id === value);
}

export function getImoveisCamposOcultos(): Set<ImoveisCampo> {
  try {
    const raw = localStorage.getItem(camposStorageKey());
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter(isImoveisCampo));
  } catch {
    return new Set();
  }
}

export function setImoveisCampoVisivel(
  campo: ImoveisCampo,
  visivel: boolean,
): void {
  const next = getImoveisCamposOcultos();
  if (visivel) next.delete(campo);
  else next.add(campo);
  localStorage.setItem(camposStorageKey(), JSON.stringify([...next]));
  window.dispatchEvent(new Event(IMOVEIS_NAV_EVENT));
}

export function useImoveisCamposVisiveis() {
  const [ocultos, setOcultos] = useState<Set<ImoveisCampo>>(new Set());

  useEffect(() => {
    const sync = () => setOcultos(getImoveisCamposOcultos());
    sync();
    window.addEventListener(IMOVEIS_NAV_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(IMOVEIS_NAV_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function show(campo: ImoveisCampo) {
    return !ocultos.has(campo);
  }

  function toggle(campo: ImoveisCampo) {
    setImoveisCampoVisivel(campo, ocultos.has(campo));
    setOcultos(getImoveisCamposOcultos());
  }

  function setVisible(campo: ImoveisCampo, visivel: boolean) {
    setImoveisCampoVisivel(campo, visivel);
    setOcultos(getImoveisCamposOcultos());
  }

  return { show, toggle, setVisible };
}
