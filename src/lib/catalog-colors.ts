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

/** Tons progressivos derivados do aside (#032b43), da 1ª → última coluna. */
const FUNNEL_COLUMN_ASIDE_SCALE = [
  "bg-[#d0dbe3]",
  "bg-[#c2d0db]",
  "bg-[#b3c4d2]",
  "bg-[#a4b9c9]",
  "bg-[#95adc0]",
  "bg-[#86a2b7]",
  "bg-[#7796ae]",
  "bg-[#688ba5]",
] as const;

/** Versão mais clara (equipes). */
const FUNNEL_COLUMN_ASIDE_SCALE_LIGHT = [
  "bg-[#eef3f6]",
  "bg-[#e5ecf1]",
  "bg-[#dce5ec]",
  "bg-[#d2dee6]",
  "bg-[#c9d7e1]",
  "bg-[#bfd0db]",
  "bg-[#b6c9d6]",
  "bg-[#adc2d0]",
] as const;

/**
 * Fundo de coluna em degradê na família do aside.
 * `tone: "light"` — mais suave (ex.: equipes).
 */
export function funnelColumnBg(
  index: number,
  total: number,
  tone: "default" | "light" = "default",
): string {
  const scale =
    tone === "light"
      ? FUNNEL_COLUMN_ASIDE_SCALE_LIGHT
      : FUNNEL_COLUMN_ASIDE_SCALE;
  if (total <= 1) return scale[0];
  const t = Math.min(1, Math.max(0, index / (total - 1)));
  const i = Math.round(t * (scale.length - 1));
  return scale[i];
}

export function nextCatalogColor(index: number): CatalogColor {
  return CATALOG_COLORS[index % CATALOG_COLORS.length];
}

/** Normaliza label de origem/fonte para matching (sem acento, minúsculo). */
function normalizeOrigemKey(origem: string): string {
  return origem
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Classes de badge por canal (Facebook, Instagram, WhatsApp…).
 * Fundo e texto na cor da marca; fallback neutro para origens desconhecidas.
 * Inclui hover claro para sobrescrever o hover escuro do Badge default.
 */
export function origemBadgeClass(origem: string | null | undefined): string {
  const key = normalizeOrigemKey(origem ?? "");
  if (!key) {
    return "border-transparent bg-slate-200 text-slate-700 shadow-none hover:bg-slate-200";
  }

  if (key.includes("facebook") || key === "fb") {
    return "border-transparent bg-[#1877F2]/18 text-[#1877F2] shadow-none hover:bg-[#1877F2]/25";
  }
  if (key.includes("instagram") || key === "ig") {
    return "border-transparent bg-[#E4405F]/18 text-[#C13584] shadow-none hover:bg-[#E4405F]/25";
  }
  if (key.includes("whatsapp") || key === "wa" || key === "zap") {
    return "border-transparent bg-[#25D366]/20 text-[#128C7E] shadow-none hover:bg-[#25D366]/28";
  }
  if (key.includes("google")) {
    return "border-transparent bg-[#4285F4]/18 text-[#4285F4] shadow-none hover:bg-[#4285F4]/25";
  }
  if (key.includes("tiktok")) {
    return "border-transparent bg-zinc-900/10 text-zinc-900 shadow-none hover:bg-zinc-900/15";
  }
  if (key.includes("youtube")) {
    return "border-transparent bg-[#FF0000]/15 text-[#FF0000] shadow-none hover:bg-[#FF0000]/22";
  }
  if (key.includes("linkedin")) {
    return "border-transparent bg-[#0A66C2]/18 text-[#0A66C2] shadow-none hover:bg-[#0A66C2]/25";
  }
  if (key.includes("twitter") || key === "x" || key.includes("x.com")) {
    return "border-transparent bg-zinc-900/10 text-zinc-900 shadow-none hover:bg-zinc-900/15";
  }
  if (key.includes("site") || key.includes("landing") || key.includes("web")) {
    return "border-transparent bg-[#079ED4]/18 text-[#079ED4] shadow-none hover:bg-[#079ED4]/25";
  }
  if (key.includes("indicacao")) {
    return "border-transparent bg-amber-100 text-amber-800 shadow-none hover:bg-amber-100";
  }
  if (key.includes("campanha")) {
    return "border-transparent bg-violet-100 text-violet-700 shadow-none hover:bg-violet-100";
  }
  if (key.includes("lista") || key.includes("import")) {
    return "border-transparent bg-sky-100 text-sky-700 shadow-none hover:bg-sky-100";
  }
  if (key.includes("lead proprio") || key.includes("proprio")) {
    return "border-transparent bg-teal-100 text-teal-700 shadow-none hover:bg-teal-100";
  }

  return "border-transparent bg-slate-200 text-slate-700 shadow-none hover:bg-slate-200";
}
