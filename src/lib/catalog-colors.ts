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

export function nextCatalogColor(index: number): CatalogColor {
  return CATALOG_COLORS[index % CATALOG_COLORS.length];
}
