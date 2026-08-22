/** Visual compartilhado das barras de filtro (Imóveis e demais listagens). */
export const FILTER_BAR_SURFACE =
  "overflow-hidden rounded-2xl border border-primary/15 bg-linear-to-br from-primary/10 via-card to-card p-4 shadow-sm shadow-primary/5";

export const FILTER_BAR_SHELL = `mb-4 flex flex-col gap-3 ${FILTER_BAR_SURFACE} sm:flex-row sm:flex-wrap sm:items-center`;

export const FILTER_BAR_STACK = `mb-4 space-y-3 ${FILTER_BAR_SURFACE}`;

export const FILTER_LABEL = "mb-1.5 block text-xs font-medium text-primary";

export const FILTER_CONTROL = "border-primary/20 bg-background/90";

export const FILTER_SEARCH_ICON =
  "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70";

export const FILTER_CLEAR_BTN =
  "text-primary hover:bg-primary/10 hover:text-primary";

export const FILTER_VISTA_WRAP =
  "inline-flex h-9 rounded-lg border border-primary/20 bg-primary/8 p-0.5";

export const FILTER_VISTA_BTN =
  "h-8 px-3 text-primary hover:bg-primary/10 hover:text-primary";

export const FILTER_VISTA_BTN_ACTIVE =
  "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground";
