/**
 * Paleta de cores das badges de catálogo (etapas, origens, tags, motivos).
 * Valores = classes Tailwind persistidas em CatalogItem.color.
 * Tons 500: saturados, para leitura em chips e no seletor de Configurações.
 */
export const CATALOG_COLORS = [
  "bg-slate-500 text-white",
  "bg-blue-500 text-white",
  "bg-indigo-500 text-white",
  "bg-violet-500 text-white",
  "bg-purple-500 text-white",
  "bg-fuchsia-500 text-white",
  "bg-pink-500 text-white",
  "bg-rose-500 text-white",
  "bg-red-500 text-white",
  "bg-orange-500 text-white",
  "bg-amber-500 text-amber-950",
  "bg-yellow-400 text-yellow-950",
  "bg-lime-500 text-lime-950",
  "bg-green-500 text-white",
  "bg-emerald-500 text-white",
  "bg-teal-500 text-white",
  "bg-cyan-500 text-white",
  "bg-sky-500 text-white",
] as const;

export type CatalogColor = (typeof CATALOG_COLORS)[number];

/** Itens gravados na paleta pastel antiga passam a renderizar no tom vivo. */
const LEGACY_CATALOG_COLORS: Record<string, CatalogColor> = {
  "bg-slate-200 text-slate-700": "bg-slate-500 text-white",
  "bg-blue-100 text-blue-700": "bg-blue-500 text-white",
  "bg-indigo-100 text-indigo-700": "bg-indigo-500 text-white",
  "bg-violet-100 text-violet-700": "bg-violet-500 text-white",
  "bg-purple-100 text-purple-700": "bg-purple-500 text-white",
  "bg-pink-100 text-pink-700": "bg-pink-500 text-white",
  "bg-rose-100 text-rose-700": "bg-rose-500 text-white",
  "bg-red-100 text-red-700": "bg-red-500 text-white",
  "bg-orange-100 text-orange-700": "bg-orange-500 text-white",
  "bg-amber-100 text-amber-700": "bg-amber-500 text-amber-950",
  "bg-yellow-100 text-yellow-800": "bg-yellow-400 text-yellow-950",
  "bg-lime-100 text-lime-800": "bg-lime-500 text-lime-950",
  "bg-green-100 text-green-700": "bg-green-500 text-white",
  "bg-emerald-100 text-emerald-700": "bg-emerald-500 text-white",
  "bg-teal-100 text-teal-700": "bg-teal-500 text-white",
  "bg-cyan-100 text-cyan-700": "bg-cyan-500 text-white",
  "bg-sky-100 text-sky-700": "bg-sky-500 text-white",
};

const LEGACY_BG_TO_COLOR: Record<string, CatalogColor> = {
  "bg-slate-200": "bg-slate-500 text-white",
  "bg-blue-100": "bg-blue-500 text-white",
  "bg-indigo-100": "bg-indigo-500 text-white",
  "bg-violet-100": "bg-violet-500 text-white",
  "bg-purple-100": "bg-purple-500 text-white",
  "bg-pink-100": "bg-pink-500 text-white",
  "bg-rose-100": "bg-rose-500 text-white",
  "bg-red-100": "bg-red-500 text-white",
  "bg-orange-100": "bg-orange-500 text-white",
  "bg-amber-100": "bg-amber-500 text-amber-950",
  "bg-yellow-100": "bg-yellow-400 text-yellow-950",
  "bg-lime-100": "bg-lime-500 text-lime-950",
  "bg-green-100": "bg-green-500 text-white",
  "bg-emerald-100": "bg-emerald-500 text-white",
  "bg-teal-100": "bg-teal-500 text-white",
  "bg-cyan-100": "bg-cyan-500 text-white",
  "bg-sky-100": "bg-sky-500 text-white",
};

export function normalizeCatalogColor(
  color: string | null | undefined,
): string {
  if (!color?.trim()) return DEFAULT_CATALOG_COLOR;
  if (isHexColor(color)) return color;
  const key = color.trim();
  if (LEGACY_CATALOG_COLORS[key]) return LEGACY_CATALOG_COLORS[key];
  const bg = key.split(/\s+/).find((c) => c.startsWith("bg-"));
  if (bg && LEGACY_BG_TO_COLOR[bg]) return LEGACY_BG_TO_COLOR[bg];
  return key;
}

export function sameCatalogColor(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return normalizeCatalogColor(a) === normalizeCatalogColor(b);
}

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

export const DEFAULT_CATALOG_COLOR: CatalogColor = "bg-slate-500 text-white";

/** Extrai a classe de fundo para o swatch (ex.: bg-blue-500). */
export function catalogColorSwatch(color: string | null | undefined): string {
  const bg = normalizeCatalogColor(color)
    .split(/\s+/)
    .find((c) => c.startsWith("bg-"));
  return bg ?? "bg-slate-500";
}

/** Extrai a classe de texto (ex.: text-white). */
export function catalogColorTextClass(
  color: string | null | undefined,
): string {
  const text = normalizeCatalogColor(color)
    .split(/\s+/)
    .find((c) => c.startsWith("text-"));
  return text ?? "text-white";
}

/**
 * Hex para gráficos (barras/pie) a partir da classe Tailwind do catálogo.
 * Usa tom médio/saturado para ficar legível nas barras.
 */
const CATALOG_BG_TO_CHART_HEX: Record<string, string> = {
  "bg-slate-500": "#64748b",
  "bg-blue-500": "#3b82f6",
  "bg-indigo-500": "#6366f1",
  "bg-violet-500": "#8b5cf6",
  "bg-purple-500": "#a855f7",
  "bg-fuchsia-500": "#d946ef",
  "bg-pink-500": "#ec4899",
  "bg-rose-500": "#f43f5e",
  "bg-red-500": "#ef4444",
  "bg-orange-500": "#f97316",
  "bg-amber-500": "#f59e0b",
  "bg-yellow-400": "#eab308",
  "bg-lime-500": "#84cc16",
  "bg-green-500": "#22c55e",
  "bg-emerald-500": "#10b981",
  "bg-teal-500": "#14b8a6",
  "bg-cyan-500": "#06b6d4",
  "bg-sky-500": "#0ea5e9",
};

/** Degradê saturado (claro → vivo → escuro) nas badges e no seletor. */
const CATALOG_BG_SOFT_STOPS: Record<
  string,
  { a: string; b: string; c: string }
> = {
  "bg-slate-500": { a: "#cbd5e1", b: "#64748b", c: "#334155" },
  "bg-blue-500": { a: "#93c5fd", b: "#3b82f6", c: "#1d4ed8" },
  "bg-indigo-500": { a: "#a5b4fc", b: "#6366f1", c: "#4338ca" },
  "bg-violet-500": { a: "#c4b5fd", b: "#8b5cf6", c: "#6d28d9" },
  "bg-purple-500": { a: "#d8b4fe", b: "#a855f7", c: "#7e22ce" },
  "bg-fuchsia-500": { a: "#f0abfc", b: "#d946ef", c: "#a21caf" },
  "bg-pink-500": { a: "#f9a8d4", b: "#ec4899", c: "#be185d" },
  "bg-rose-500": { a: "#fda4af", b: "#f43f5e", c: "#be123c" },
  "bg-red-500": { a: "#fca5a5", b: "#ef4444", c: "#b91c1c" },
  "bg-orange-500": { a: "#fdba74", b: "#f97316", c: "#c2410c" },
  "bg-amber-500": { a: "#fcd34d", b: "#f59e0b", c: "#b45309" },
  "bg-yellow-400": { a: "#fde047", b: "#eab308", c: "#a16207" },
  "bg-lime-500": { a: "#bef264", b: "#84cc16", c: "#4d7c0f" },
  "bg-green-500": { a: "#86efac", b: "#22c55e", c: "#15803d" },
  "bg-emerald-500": { a: "#6ee7b7", b: "#10b981", c: "#047857" },
  "bg-teal-500": { a: "#5eead4", b: "#14b8a6", c: "#0f766e" },
  "bg-cyan-500": { a: "#67e8f9", b: "#06b6d4", c: "#0e7490" },
  "bg-sky-500": { a: "#7dd3fc", b: "#0ea5e9", c: "#0369a1" },
};

/** Hover mais claro para a linha da lista (não a badge). */
const CATALOG_BG_SURFACE_HOVER: Record<string, string> = {
  "bg-slate-500": "hover:bg-slate-100",
  "bg-blue-500": "hover:bg-blue-50",
  "bg-indigo-500": "hover:bg-indigo-50",
  "bg-violet-500": "hover:bg-violet-50",
  "bg-purple-500": "hover:bg-purple-50",
  "bg-fuchsia-500": "hover:bg-fuchsia-50",
  "bg-pink-500": "hover:bg-pink-50",
  "bg-rose-500": "hover:bg-rose-50",
  "bg-red-500": "hover:bg-red-50",
  "bg-orange-500": "hover:bg-orange-50",
  "bg-amber-500": "hover:bg-amber-50",
  "bg-yellow-400": "hover:bg-yellow-50",
  "bg-lime-500": "hover:bg-lime-50",
  "bg-green-500": "hover:bg-green-50",
  "bg-emerald-500": "hover:bg-emerald-50",
  "bg-teal-500": "hover:bg-teal-50",
  "bg-cyan-500": "hover:bg-cyan-50",
  "bg-sky-500": "hover:bg-sky-50",
};

/**
 * Classes de badge de catálogo: texto da cor, fundo via degradê em
 * `catalogColorBadgeStyle` (evita o hover sólido padrão do Badge).
 */
export function catalogColorBadgeClass(
  color: string | null | undefined,
  extra?: string,
): string {
  const text = catalogColorTextClass(color);
  return [
    STATUS_CHIP_CLASS,
    "border-transparent bg-transparent shadow-none",
    text,
    "hover:brightness-110",
    extra ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Texto legível (tom escuro) a partir da cor de catálogo — não usa branco. */
const CATALOG_BG_TO_SOFT_TEXT: Record<string, string> = {
  "bg-slate-500": "text-slate-700 dark:text-slate-300",
  "bg-blue-500": "text-blue-700 dark:text-blue-300",
  "bg-indigo-500": "text-indigo-700 dark:text-indigo-300",
  "bg-violet-500": "text-violet-700 dark:text-violet-300",
  "bg-purple-500": "text-purple-700 dark:text-purple-300",
  "bg-fuchsia-500": "text-fuchsia-700 dark:text-fuchsia-300",
  "bg-pink-500": "text-pink-700 dark:text-pink-300",
  "bg-rose-500": "text-rose-700 dark:text-rose-300",
  "bg-red-500": "text-red-700 dark:text-red-300",
  "bg-orange-500": "text-orange-700 dark:text-orange-300",
  "bg-amber-500": "text-amber-800 dark:text-amber-300",
  "bg-yellow-400": "text-yellow-800 dark:text-yellow-300",
  "bg-lime-500": "text-lime-800 dark:text-lime-300",
  "bg-green-500": "text-green-700 dark:text-green-300",
  "bg-emerald-500": "text-emerald-700 dark:text-emerald-300",
  "bg-teal-500": "text-teal-700 dark:text-teal-300",
  "bg-cyan-500": "text-cyan-700 dark:text-cyan-300",
  "bg-sky-500": "text-sky-700 dark:text-sky-300",
};

/**
 * Badge suave (origem etc.): sem fundo cinza, texto colorido legível,
 * hover com a cor principal do tema.
 */
export function catalogColorSoftBadgeClass(
  color: string | null | undefined,
  extra?: string,
): string {
  const bg = catalogColorSwatch(color);
  const text = CATALOG_BG_TO_SOFT_TEXT[bg] ?? "text-foreground";
  return [
    STATUS_CHIP_CLASS,
    "border-transparent bg-transparent shadow-none",
    text,
    "hover:bg-primary hover:text-primary-foreground",
    extra ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

function catalogGradientStops(color: string | null | undefined) {
  const bg = catalogColorSwatch(color);
  return CATALOG_BG_SOFT_STOPS[bg] ?? CATALOG_BG_SOFT_STOPS["bg-slate-500"];
}

/** Degradê vivo para o fundo da badge. */
export function catalogColorBadgeStyle(
  color: string | null | undefined,
): { backgroundImage: string } {
  const stops = catalogGradientStops(color);
  return {
    backgroundImage: `linear-gradient(135deg, ${stops.a} 0%, ${stops.b} 46%, ${stops.c} 100%)`,
  };
}

/** Degradê com brilho para o círculo do seletor de cor. */
export function catalogColorSwatchStyle(
  color: string | null | undefined,
): { backgroundImage: string } {
  const stops = catalogGradientStops(color);
  return {
    backgroundImage: `linear-gradient(145deg, rgba(255,255,255,0.42) 0%, transparent 38%), linear-gradient(135deg, ${stops.a} 0%, ${stops.b} 48%, ${stops.c} 100%)`,
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
  const stops = CATALOG_BG_SOFT_STOPS[bg] ?? CATALOG_BG_SOFT_STOPS["bg-slate-500"];
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
