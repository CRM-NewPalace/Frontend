const KEY = "crm_theme";
const ZONE_LIGHT_MIGRATION = "crm_theme_zone_light_v1";

export type Theme = "light" | "dark";

export function getTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(KEY);
  if (saved === "dark" || saved === "light") return saved;
  return "light";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function setTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, theme);
  applyTheme(theme);
}

/** Tema padrão do CRM = claro, como o site Zone Connection. */
export function initTheme() {
  if (typeof window === "undefined") return;
  // Uma vez: sai do dark antigo que deixava o painel com ciano demais.
  if (!window.localStorage.getItem(ZONE_LIGHT_MIGRATION)) {
    window.localStorage.setItem(ZONE_LIGHT_MIGRATION, "1");
    window.localStorage.setItem(KEY, "light");
  }
  applyTheme(getTheme());
}
