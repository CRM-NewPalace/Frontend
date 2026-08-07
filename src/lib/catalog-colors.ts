/**
 * Paleta de cores das badges de catálogo (etapas, origens, tags, motivos).
 * Valores = classes Tailwind persistidas em CatalogItem.color.
 */
export const CATALOG_COLORS = [
  "bg-slate-200 text-slate-700",
  "bg-blue-100 text-blue-700",
  "bg-indigo-100 text-indigo-700",
  "bg-violet-100 text-violet-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
  "bg-rose-100 text-rose-700",
  "bg-red-100 text-red-700",
  "bg-orange-100 text-orange-700",
  "bg-amber-100 text-amber-700",
  "bg-yellow-100 text-yellow-800",
  "bg-lime-100 text-lime-800",
  "bg-green-100 text-green-700",
  "bg-emerald-100 text-emerald-700",
  "bg-teal-100 text-teal-700",
  "bg-cyan-100 text-cyan-700",
  "bg-sky-100 text-sky-700",
] as const;

export type CatalogColor = (typeof CATALOG_COLORS)[number];

export const DEFAULT_CATALOG_COLOR: CatalogColor =
  "bg-slate-200 text-slate-700";

/** Extrai a classe de fundo para o swatch (ex.: bg-blue-100). */
export function catalogColorSwatch(color: string | null | undefined): string {
  const bg = (color ?? DEFAULT_CATALOG_COLOR)
    .split(/\s+/)
    .find((c) => c.startsWith("bg-"));
  return bg ?? "bg-slate-200";
}

/**
 * Hex para gráficos (barras/pie) a partir da classe Tailwind do catálogo.
 * Usa tom médio/saturado para ficar legível nas barras.
 */
const CATALOG_BG_TO_CHART_HEX: Record<string, string> = {
  "bg-slate-200": "#64748b",
  "bg-blue-100": "#3b82f6",
  "bg-indigo-100": "#6366f1",
  "bg-violet-100": "#8b5cf6",
  "bg-purple-100": "#a855f7",
  "bg-pink-100": "#ec4899",
  "bg-rose-100": "#f43f5e",
  "bg-red-100": "#ef4444",
  "bg-orange-100": "#f97316",
  "bg-amber-100": "#f59e0b",
  "bg-yellow-100": "#eab308",
  "bg-lime-100": "#84cc16",
  "bg-green-100": "#22c55e",
  "bg-emerald-100": "#10b981",
  "bg-teal-100": "#14b8a6",
  "bg-cyan-100": "#06b6d4",
  "bg-sky-100": "#0ea5e9",
};

export function catalogColorToChartHex(
  color: string | null | undefined,
): string {
  const bg = catalogColorSwatch(color);
  return CATALOG_BG_TO_CHART_HEX[bg] ?? "#64748b";
}

export function nextCatalogColor(index: number): CatalogColor {
  return CATALOG_COLORS[index % CATALOG_COLORS.length];
}
