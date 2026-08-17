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

/**
 * Tamanho único dos chips de status (etapas, origem, tags, documentação, etc.).
 * Texto longo corta com reticências; use `title` no Badge para o rótulo completo.
 */
export const STATUS_CHIP_CLASS =
  "box-border inline-flex h-6 w-[8.25rem] min-w-0 shrink-0 items-center justify-start overflow-hidden px-2 py-0 text-left text-[11px] font-semibold leading-6 truncate";

export function isHexColor(color: string | null | undefined): boolean {
  return Boolean(color && /^#[0-9A-Fa-f]{6}$/.test(color));
}

export const DEFAULT_CCA_COLOR = "#3B82F6";

export const DEFAULT_CATALOG_COLOR: CatalogColor =
  "bg-slate-200 text-slate-700";

/** Extrai a classe de fundo para o swatch (ex.: bg-blue-100). */
export function catalogColorSwatch(color: string | null | undefined): string {
  const bg = (color ?? DEFAULT_CATALOG_COLOR)
    .split(/\s+/)
    .find((c) => c.startsWith("bg-"));
  return bg ?? "bg-slate-200";
}

/** Extrai a classe de texto (ex.: text-blue-700). */
export function catalogColorTextClass(
  color: string | null | undefined,
): string {
  const text = (color ?? DEFAULT_CATALOG_COLOR)
    .split(/\s+/)
    .find((c) => c.startsWith("text-"));
  return text ?? "text-slate-700";
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

/** Tons claros (50 / 100 / 200) para degradês discretos nas badges. */
const CATALOG_BG_SOFT_STOPS: Record<
  string,
  { a: string; b: string; c: string }
> = {
  "bg-slate-200": { a: "#f8fafc", b: "#e2e8f0", c: "#cbd5e1" },
  "bg-blue-100": { a: "#eff6ff", b: "#dbeafe", c: "#bfdbfe" },
  "bg-indigo-100": { a: "#eef2ff", b: "#e0e7ff", c: "#c7d2fe" },
  "bg-violet-100": { a: "#f5f3ff", b: "#ede9fe", c: "#ddd6fe" },
  "bg-purple-100": { a: "#faf5ff", b: "#f3e8ff", c: "#e9d5ff" },
  "bg-pink-100": { a: "#fdf2f8", b: "#fce7f3", c: "#fbcfe8" },
  "bg-rose-100": { a: "#fff1f2", b: "#ffe4e6", c: "#fecdd3" },
  "bg-red-100": { a: "#fef2f2", b: "#fee2e2", c: "#fecaca" },
  "bg-orange-100": { a: "#fff7ed", b: "#ffedd5", c: "#fed7aa" },
  "bg-amber-100": { a: "#fffbeb", b: "#fef3c7", c: "#fde68a" },
  "bg-yellow-100": { a: "#fefce8", b: "#fef9c3", c: "#fef08a" },
  "bg-lime-100": { a: "#f7fee7", b: "#ecfccb", c: "#d9f99d" },
  "bg-green-100": { a: "#f0fdf4", b: "#dcfce7", c: "#bbf7d0" },
  "bg-emerald-100": { a: "#ecfdf5", b: "#d1fae5", c: "#a7f3d0" },
  "bg-teal-100": { a: "#f0fdfa", b: "#ccfbf1", c: "#99f6e4" },
  "bg-cyan-100": { a: "#ecfeff", b: "#cffafe", c: "#a5f3fc" },
  "bg-sky-100": { a: "#f0f9ff", b: "#e0f2fe", c: "#bae6fd" },
};

/** Hover sólido na mesma família (sobrescreve hover:bg-primary do Badge). */
const CATALOG_BG_HOVER: Record<string, string> = {
  "bg-slate-200": "hover:bg-slate-300",
  "bg-blue-100": "hover:bg-blue-200",
  "bg-indigo-100": "hover:bg-indigo-200",
  "bg-violet-100": "hover:bg-violet-200",
  "bg-purple-100": "hover:bg-purple-200",
  "bg-pink-100": "hover:bg-pink-200",
  "bg-rose-100": "hover:bg-rose-200",
  "bg-red-100": "hover:bg-red-200",
  "bg-orange-100": "hover:bg-orange-200",
  "bg-amber-100": "hover:bg-amber-200",
  "bg-yellow-100": "hover:bg-yellow-200",
  "bg-lime-100": "hover:bg-lime-200",
  "bg-green-100": "hover:bg-green-200",
  "bg-emerald-100": "hover:bg-emerald-200",
  "bg-teal-100": "hover:bg-teal-200",
  "bg-cyan-100": "hover:bg-cyan-200",
  "bg-sky-100": "hover:bg-sky-200",
};

/** Hover mais claro para a linha da lista (não a badge). */
const CATALOG_BG_SURFACE_HOVER: Record<string, string> = {
  "bg-slate-200": "hover:bg-slate-100",
  "bg-blue-100": "hover:bg-blue-50",
  "bg-indigo-100": "hover:bg-indigo-50",
  "bg-violet-100": "hover:bg-violet-50",
  "bg-purple-100": "hover:bg-purple-50",
  "bg-pink-100": "hover:bg-pink-50",
  "bg-rose-100": "hover:bg-rose-50",
  "bg-red-100": "hover:bg-red-50",
  "bg-orange-100": "hover:bg-orange-50",
  "bg-amber-100": "hover:bg-amber-50",
  "bg-yellow-100": "hover:bg-yellow-50",
  "bg-lime-100": "hover:bg-lime-50",
  "bg-green-100": "hover:bg-green-50",
  "bg-emerald-100": "hover:bg-emerald-50",
  "bg-teal-100": "hover:bg-teal-50",
  "bg-cyan-100": "hover:bg-cyan-50",
  "bg-sky-100": "hover:bg-sky-50",
};

/**
 * Classes de badge de catálogo: texto da cor + hover na mesma família
 * (evita o hover escuro padrão do Badge).
 */
export function catalogColorBadgeClass(
  color: string | null | undefined,
  extra?: string,
): string {
  const bg = catalogColorSwatch(color);
  const text = catalogColorTextClass(color);
  const hover = CATALOG_BG_HOVER[bg] ?? "hover:bg-slate-300";
  return [
    STATUS_CHIP_CLASS,
    "border-transparent bg-transparent shadow-none",
    text,
    hover,
    "hover:[background-image:none]",
    extra ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Degradê discreto para o fundo da badge. */
export function catalogColorBadgeStyle(
  color: string | null | undefined,
): { backgroundImage: string } {
  const bg = catalogColorSwatch(color);
  const stops = CATALOG_BG_SOFT_STOPS[bg] ?? CATALOG_BG_SOFT_STOPS["bg-slate-200"];
  return {
    backgroundImage: `linear-gradient(135deg, ${stops.a} 0%, ${stops.b} 48%, ${stops.c} 100%)`,
  };
}

/** Classes de hover suave para a linha da lista (mesma família da cor). */
export function catalogColorSoftSurfaceClass(
  color: string | null | undefined,
): string {
  const bg = catalogColorSwatch(color);
  const hover = CATALOG_BG_SURFACE_HOVER[bg] ?? "hover:bg-slate-100";
  return ["transition-colors", hover, "hover:[background-image:none]"].join(
    " ",
  );
}

/** Superfície suave (linha da lista) na cor da etapa. */
export function catalogColorSoftSurfaceStyle(
  color: string | null | undefined,
): { backgroundImage: string } {
  const bg = catalogColorSwatch(color);
  const stops = CATALOG_BG_SOFT_STOPS[bg] ?? CATALOG_BG_SOFT_STOPS["bg-slate-200"];
  return {
    backgroundImage: `linear-gradient(90deg, color-mix(in oklab, ${stops.b} 28%, white) 0%, color-mix(in oklab, ${stops.a} 18%, white) 55%, white 100%)`,
  };
}

export function catalogColorToChartHex(
  color: string | null | undefined,
): string {
  const bg = catalogColorSwatch(color);
  return CATALOG_BG_TO_CHART_HEX[bg] ?? "#64748b";
}

/** Tons progressivos derivados do aside (#032b43), da 1ª → última coluna. */
const FUNNEL_COLUMN_ASIDE_SCALE = [
  "bg-[#d0dbe3] dark:bg-[#15202b]",
  "bg-[#c2d0db] dark:bg-[#172430]",
  "bg-[#b3c4d2] dark:bg-[#1a2836]",
  "bg-[#a4b9c9] dark:bg-[#1d2c3c]",
  "bg-[#95adc0] dark:bg-[#203042]",
  "bg-[#86a2b7] dark:bg-[#233448]",
  "bg-[#7796ae] dark:bg-[#26384e]",
  "bg-[#688ba5] dark:bg-[#293c54]",
] as const;

/** Versão mais clara (equipes). */
const FUNNEL_COLUMN_ASIDE_SCALE_LIGHT = [
  "bg-[#eef3f6] dark:bg-[#141c26]",
  "bg-[#e5ecf1] dark:bg-[#16202b]",
  "bg-[#dce5ec] dark:bg-[#182430]",
  "bg-[#d2dee6] dark:bg-[#1a2835]",
  "bg-[#c9d7e1] dark:bg-[#1c2c3a]",
  "bg-[#bfd0db] dark:bg-[#1e3040]",
  "bg-[#b6c9d6] dark:bg-[#203445]",
  "bg-[#adc2d0] dark:bg-[#22384a]",
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
  const size = STATUS_CHIP_CLASS;
  if (!key) {
    return `${size} border-transparent bg-slate-200 text-slate-700 shadow-none hover:bg-slate-200`;
  }

  if (key.includes("facebook") || key === "fb") {
    return `${size} border-transparent bg-[#1877F2]/18 text-[#1877F2] shadow-none hover:bg-[#1877F2]/25`;
  }
  if (key.includes("instagram") || key === "ig") {
    return `${size} border-transparent bg-[#E4405F]/18 text-[#C13584] shadow-none hover:bg-[#E4405F]/25`;
  }
  if (key.includes("whatsapp") || key === "wa" || key === "zap") {
    return `${size} border-transparent bg-[#25D366]/20 text-[#128C7E] shadow-none hover:bg-[#25D366]/28`;
  }
  if (key.includes("google")) {
    return `${size} border-transparent bg-[#4285F4]/18 text-[#4285F4] shadow-none hover:bg-[#4285F4]/25`;
  }
  if (key.includes("tiktok")) {
    return `${size} border-transparent bg-zinc-900/10 text-zinc-900 shadow-none hover:bg-zinc-900/15`;
  }
  if (key.includes("youtube")) {
    return `${size} border-transparent bg-[#FF0000]/15 text-[#FF0000] shadow-none hover:bg-[#FF0000]/22`;
  }
  if (key.includes("linkedin")) {
    return `${size} border-transparent bg-[#0A66C2]/18 text-[#0A66C2] shadow-none hover:bg-[#0A66C2]/25`;
  }
  if (key.includes("twitter") || key === "x" || key.includes("x.com")) {
    return `${size} border-transparent bg-zinc-900/10 text-zinc-900 shadow-none hover:bg-zinc-900/15`;
  }
  if (key.includes("site") || key.includes("landing") || key.includes("web")) {
    return `${size} border-transparent bg-[#079ED4]/18 text-[#079ED4] shadow-none hover:bg-[#079ED4]/25`;
  }
  if (key.includes("indicacao")) {
    return `${size} border-transparent bg-amber-100 text-amber-800 shadow-none hover:bg-amber-100`;
  }
  if (key.includes("campanha")) {
    return `${size} border-transparent bg-violet-100 text-violet-700 shadow-none hover:bg-violet-100`;
  }
  if (key.includes("lista") || key.includes("import")) {
    return `${size} border-transparent bg-sky-100 text-sky-700 shadow-none hover:bg-sky-100`;
  }
  if (key.includes("lead proprio") || key.includes("proprio")) {
    return `${size} border-transparent bg-teal-100 text-teal-700 shadow-none hover:bg-teal-100`;
  }

  return `${size} border-transparent bg-slate-200 text-slate-700 shadow-none hover:bg-slate-200`;
}
