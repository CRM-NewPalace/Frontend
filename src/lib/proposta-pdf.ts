import { jsPDF } from "jspdf";
import { brl } from "@/lib/crm-types";
import type { TenantBranding } from "@/lib/auth";
import { phoneDigits, formatPhone } from "@/lib/phone";
import { formatCpfCnpj } from "@/lib/utils";
import {
  formatPropostaDate,
  PROPOSTA_COMPOSICAO_LABEL,
  PROPOSTA_LISTA_KEYS,
  PROPOSTA_SIMPLES_KEYS,
  propostaComposicaoTotal,
  propostaDiferenca,
  propostaValorLiquido,
  type Proposta,
  type PropostaListaKey,
  type PropostaSimplesKey,
} from "@/lib/propostas-api";

type Rgb = [number, number, number];

type PdfPalette = {
  navy: Rgb;
  navySoft: Rgb;
  gold: Rgb;
  goldSoft: Rgb;
  ink: Rgb;
  muted: Rgb;
  line: Rgb;
  band: Rgb;
  white: Rgb;
};

/** Fallback quando a logo não carrega / não tem cor útil. */
const DEFAULT_PALETTE: PdfPalette = {
  navy: [13, 27, 42],
  navySoft: [27, 42, 58],
  gold: [197, 160, 89],
  goldSoft: [245, 236, 214],
  ink: [22, 28, 36],
  muted: [110, 118, 128],
  line: [220, 224, 230],
  band: [241, 243, 245],
  white: [255, 255, 255],
};

export type PropostaPdfBrand = {
  logoUrl?: string | null;
  /** Hex opcional do tenant (#RRGGBB) — reforça a paleta se a logo for monocromática. */
  primaryColor?: string | null;
  company?: Pick<
    TenantBranding,
    | "name"
    | "documento"
    | "creci"
    | "email"
    | "telefone"
    | "endereco"
    | "cidade"
  > | null;
};

type CompositionLine = {
  label: string;
  detail?: string;
  value: number;
};

type LoadedLogo = {
  dataUrl: string;
  format: "PNG" | "JPEG";
  width: number;
  height: number;
  /** Cores amostradas da própria logo. */
  dark: Rgb | null;
  accent: Rgb | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
  }
  return [(h / 6) * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const hh = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hh < 60) [rp, gp, bp] = [c, x, 0];
  else if (hh < 120) [rp, gp, bp] = [x, c, 0];
  else if (hh < 180) [rp, gp, bp] = [0, c, x];
  else if (hh < 240) [rp, gp, bp] = [0, x, c];
  else if (hh < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return [
    Math.round((rp + m) * 255),
    Math.round((gp + m) * 255),
    Math.round((bp + m) * 255),
  ];
}

function parseHexColor(hex: string | null | undefined): Rgb | null {
  if (!hex) return null;
  const raw = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  return [
    Number.parseInt(raw.slice(0, 2), 16),
    Number.parseInt(raw.slice(2, 4), 16),
    Number.parseInt(raw.slice(4, 6), 16),
  ];
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** Amostra pixels da logo e elege uma cor escura (fundo) + uma de destaque. */
function extractLogoColors(source: HTMLCanvasElement): {
  dark: Rgb | null;
  accent: Rgb | null;
} {
  const sample = document.createElement("canvas");
  const size = 48;
  sample.width = size;
  sample.height = size;
  const ctx = sample.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { dark: null, accent: null };
  ctx.drawImage(source, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  type Bucket = {
    r: number;
    g: number;
    b: number;
    count: number;
    sat: number;
    light: number;
  };
  const buckets = new Map<string, Bucket>();

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]!;
    if (a < 140) continue;
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    // Ignora branco / quase branco (fundo da logo).
    if (r > 242 && g > 242 && b > 242) continue;
    const qr = Math.round(r / 20) * 20;
    const qg = Math.round(g / 20) * 20;
    const qb = Math.round(b / 20) * 20;
    const key = `${qr},${qg},${qb}`;
    const [, sat, light] = rgbToHsl(qr, qg, qb);
    const cur = buckets.get(key);
    if (cur) cur.count += 1;
    else buckets.set(key, { r: qr, g: qg, b: qb, count: 1, sat, light });
  }

  const entries = [...buckets.values()].filter((e) => e.count >= 2);
  if (!entries.length) return { dark: null, accent: null };

  // Escura: prioriza baixa luminosidade e presença.
  const darkScore = (e: Bucket) => e.count * (1.2 - e.light) * (0.5 + e.sat);
  const dark = [...entries]
    .filter((e) => e.light < 0.55)
    .sort((a, b) => darkScore(b) - darkScore(a))[0];

  // Destaque: saturada / média-clara, diferente da escura.
  const accentScore = (e: Bucket) =>
    e.count * (0.4 + e.sat) * (1 - Math.abs(e.light - 0.5));
  const accent = [...entries]
    .filter((e) => {
      if (e.light < 0.18 || e.light > 0.88) return false;
      if (e.sat < 0.12) return false;
      if (!dark) return true;
      const dr = e.r - dark.r;
      const dg = e.g - dark.g;
      const db = e.b - dark.b;
      return dr * dr + dg * dg + db * db > 40 * 40;
    })
    .sort((a, b) => accentScore(b) - accentScore(a))[0];

  return {
    dark: dark ? [dark.r, dark.g, dark.b] : null,
    accent: accent ? [accent.r, accent.g, accent.b] : null,
  };
}

function buildPaletteFromLogo(
  dark: Rgb | null,
  accent: Rgb | null,
  primaryHex?: string | null,
): PdfPalette {
  const fallbackPrimary = parseHexColor(primaryHex);
  const seed = dark ?? fallbackPrimary ?? DEFAULT_PALETTE.navy;

  let [h, s] = rgbToHsl(...seed);
  // Cabeçalho sempre escuro o bastante para texto branco.
  const navy = hslToRgb(h, clamp(Math.max(s, 0.28), 0, 0.75), 0.16);
  const navySoft = hslToRgb(h, clamp(Math.max(s, 0.22), 0, 0.65), 0.26);

  let accentRgb = accent;
  if (!accentRgb && fallbackPrimary) {
    const [ph, ps, pl] = rgbToHsl(...fallbackPrimary);
    // Se a primária for clara/média, usa como destaque; se for escura, deriva.
    accentRgb =
      pl > 0.35
        ? fallbackPrimary
        : hslToRgb((ph + 35) % 360, clamp(Math.max(ps, 0.45), 0, 0.8), 0.55);
  }
  if (!accentRgb) {
    accentRgb = hslToRgb((h + 42) % 360, 0.55, 0.55);
  }

  let [ah, as, al] = rgbToHsl(...accentRgb);
  // Garante destaque visível (evita cinza / quase preto).
  const gold = hslToRgb(
    ah,
    clamp(Math.max(as, 0.42), 0, 0.85),
    clamp(al < 0.35 ? 0.52 : al > 0.72 ? 0.58 : al, 0.4, 0.68),
  );
  const goldSoft = mixRgb(gold, DEFAULT_PALETTE.white, 0.86);

  return {
    navy,
    navySoft,
    gold,
    goldSoft,
    ink: DEFAULT_PALETTE.ink,
    muted: DEFAULT_PALETTE.muted,
    line: DEFAULT_PALETTE.line,
    band: DEFAULT_PALETTE.band,
    white: DEFAULT_PALETTE.white,
  };
}

function compositionLines(p: Proposta): CompositionLine[] {
  const lines: CompositionLine[] = [];

  for (const key of PROPOSTA_SIMPLES_KEYS) {
    const value = p[key as PropostaSimplesKey];
    if (value == null) continue;
    lines.push({
      label: PROPOSTA_COMPOSICAO_LABEL[key].toUpperCase(),
      value,
    });
  }

  for (const key of PROPOSTA_LISTA_KEYS) {
    const values = p[key as PropostaListaKey] ?? [];
    if (!values.length) continue;
    const subtotal = values.reduce((sum, n) => sum + n, 0);
    const equal = values.every((n) => n === values[0]);
    const detail = equal
      ? `${values.length} × ${brl(values[0] ?? 0)}`
      : values
          .map((value, index) => `${index + 1}ª · ${brl(value)}`)
          .join("  ·  ");
    lines.push({
      label: PROPOSTA_COMPOSICAO_LABEL[key].toUpperCase(),
      detail,
      value: subtotal,
    });
  }

  return lines;
}

function empreendimentoNome(p: Proposta) {
  return p.empreendimento?.nome ?? "Empreendimento a definir";
}

function safeFilename(codigo: string) {
  return codigo.replace(/[^\w.-]+/g, "_");
}

/** jsPDF rejeita valores null/undefined em `text`, mesmo quando o dado é opcional. */
function pdfText(value: unknown, fallback = "—"): string {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  return fallback;
}

function absoluteAssetUrl(src: string) {
  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:")
  ) {
    return src;
  }
  if (typeof window === "undefined") return src;
  return new URL(src, window.location.origin).href;
}

async function loadLogoForPdf(src: string): Promise<LoadedLogo | null> {
  if (typeof window === "undefined" || !src.trim()) return null;
  const url = absoluteAssetUrl(src.trim());
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("logo load failed"));
      image.src = url;
    });
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const jpeg =
      /\.jpe?g($|\?)/i.test(url) || url.startsWith("data:image/jpeg");
    const { dark, accent } = extractLogoColors(canvas);
    return {
      dataUrl: canvas.toDataURL(jpeg ? "image/jpeg" : "image/png"),
      format: jpeg ? "JPEG" : "PNG",
      width: w,
      height: h,
      dark,
      accent,
    };
  } catch {
    return null;
  }
}

function ensureSpace(doc: jsPDF, y: number, need: number, margin = 40) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + need > pageH - 56) {
    doc.addPage();
    return margin;
  }
  return y;
}

function roundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  style: "F" | "S" | "FD" = "F",
) {
  doc.roundedRect(x, y, w, h, r, r, style);
}

export function buildPropostaShareMessage(p: Proposta): string {
  const linhas = [
    `Olá${p.clienteNome ? `, ${p.clienteNome}` : ""}!`,
    "",
    `Segue a proposta comercial ${p.codigo}.`,
    `Empreendimento: ${empreendimentoNome(p)}${p.unidade ? ` · Unidade ${p.unidade}` : ""}`,
    `Valor: ${brl(p.valor)}`,
  ];
  if (p.validade) {
    linhas.push(`Validade: ${formatPropostaDate(p.validade)}`);
  }
  if (p.corretor?.name) {
    linhas.push(`Corretor: ${p.corretor.name}`);
  }
  linhas.push("", "O PDF completo foi baixado — anexe-o nesta conversa.");
  return linhas.join("\n");
}

/** Converte telefone BR (10/11 dígitos) para wa.me com DDI 55. */
export function propostaWhatsAppDigits(telefone: string | null | undefined) {
  const digits = phoneDigits(telefone ?? "");
  if (!digits) return null;
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length >= 10) return `55${digits}`;
  return null;
}

export function getPropostaWhatsAppUrl(
  p: Proposta,
  phoneOverride?: string | null,
) {
  const digits =
    propostaWhatsAppDigits(phoneOverride) ??
    propostaWhatsAppDigits(p.clienteTelefone);
  if (!digits) return null;
  const url = new URL(`https://wa.me/${digits}`);
  url.searchParams.set("text", buildPropostaShareMessage(p));
  return url.toString();
}

export function getPropostaMailtoUrl(p: Proposta) {
  const subject = `Proposta comercial ${p.codigo}`;
  const body = buildPropostaShareMessage(p);
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function buildPropostaPdfDescritivo(
  p: Proposta,
  filename: string,
  brand?: PropostaPdfBrand,
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;
  const rawText = doc.text.bind(doc) as (...args: unknown[]) => unknown;
  (
    doc as unknown as {
      text: (...args: unknown[]) => unknown;
    }
  ).text = (text, x, y, ...rest) => {
    const normalizedText = Array.isArray(text)
      ? text
          .filter((line): line is string | number => typeof line === "string" || typeof line === "number")
          .map((line) => pdfText(line))
      : pdfText(text);
    return rawText(
      Array.isArray(normalizedText) && normalizedText.length === 0
        ? ["—"]
        : normalizedText,
      typeof x === "number" && Number.isFinite(x) ? x : margin,
      typeof y === "number" && Number.isFinite(y) ? y : margin,
      ...rest,
    );
  };
  const contentW = pageW - margin * 2;
  const company = brand?.company;
  const companyName = (company?.name ?? "").trim() || "Imobiliária";
  const logo = brand?.logoUrl ? await loadLogoForPdf(brand.logoUrl) : null;
  const C = buildPaletteFromLogo(
    logo?.dark ?? null,
    logo?.accent ?? null,
    brand?.primaryColor,
  );

  // ─── Cabeçalho (cor escura da logo) ───
  const headerH = 92;
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, pageW, headerH, "F");

  // Faixa/diagonais de destaque (canto inferior direito do header)
  doc.setFillColor(...C.gold);
  doc.triangle(pageW - 120, headerH, pageW, headerH - 28, pageW, headerH, "F");
  doc.setFillColor(...C.navySoft);
  doc.triangle(pageW - 70, headerH, pageW, headerH - 16, pageW, headerH, "F");

  // Logo à esquerda
  const logoMaxW = 88;
  const logoMaxH = 64;
  let logoDrawnW = 0;
  if (logo) {
    const scale = Math.min(logoMaxW / logo.width, logoMaxH / logo.height, 1);
    logoDrawnW = Math.max(36, logo.width * scale);
    const logoH = Math.max(28, logo.height * scale);
    doc.addImage(
      logo.dataUrl,
      logo.format,
      margin,
      (headerH - logoH) / 2 - 2,
      logoDrawnW,
      logoH,
    );
    // Divisor dourado vertical
    const dividerX = margin + logoDrawnW + 16;
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(1.2);
    doc.line(dividerX, 28, dividerX, headerH - 28);
  }

  // Dados da imobiliária
  const infoX = logo ? margin + logoDrawnW + 30 : margin;
  const infoMaxW = pageW - infoX - margin - 8;
  let infoY = 30;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...C.gold);
  const nameLines = doc.splitTextToSize(companyName.toUpperCase(), infoMaxW);
  doc.text(nameLines.slice(0, 2), infoX, infoY);
  infoY += nameLines.slice(0, 2).length * 13 + 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...C.white);

  const metaLines: string[] = [];
  if (company?.documento?.trim()) {
    metaLines.push(`CNPJ: ${formatCpfCnpj(company.documento)}`);
  }
  if (company?.creci?.trim()) {
    metaLines.push(`CRECI: ${company.creci.trim()}`);
  }
  if (company?.endereco?.trim()) {
    metaLines.push(company.endereco.trim());
  }
  if (company?.email?.trim()) {
    metaLines.push(company.email.trim());
  }
  for (const line of metaLines) {
    const wrapped = doc.splitTextToSize(line, infoMaxW);
    doc.text(wrapped.slice(0, 2), infoX, infoY);
    infoY += wrapped.slice(0, 2).length * 11 + 2;
    if (infoY > headerH - 14) break;
  }

  let y = headerH + 18;

  // Título + código + data
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C.gold);
  doc.text("PROPOSTA COMERCIAL", margin, y);

  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...C.ink);
  doc.text(pdfText(p.codigo, "PROPOSTA"), margin, y);

  // Badge "Emitida em"
  const emitted = new Date().toLocaleDateString("pt-BR");
  const badgeText = `Emitida em: ${emitted}`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const badgeW = doc.getTextWidth(badgeText) + 22;
  const badgeH = 22;
  const badgeX = pageW - margin - badgeW;
  const badgeY = y - 16;
  doc.setFillColor(...C.navy);
  roundedRect(doc, badgeX, badgeY, badgeW, badgeH, 6, "F");
  doc.setTextColor(...C.white);
  doc.text(badgeText, badgeX + 11, badgeY + 14);

  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...C.ink);
  doc.text(`Prezado(a) ${p.clienteNome},`, margin, y);
  y += 12;
  doc.setFontSize(10);
  doc.setTextColor(...C.muted);
  const intro =
    "Apresentamos a composição financeira desta proposta de aquisição. Os valores abaixo descrevem de forma clara cada etapa do pagamento.";
  const introLines = doc.splitTextToSize(intro, contentW);
  doc.text(introLines, margin, y);
  y += introLines.length * 11 + 12;

  // Card empreendimento / partes
  const cardH = 64;
  y = ensureSpace(doc, y, cardH + 10, margin);
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.line);
  doc.setLineWidth(1);
  roundedRect(doc, margin, y, contentW, cardH, 10, "FD");

  const midX = margin + contentW / 2;
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(1);
  doc.line(midX, y + 14, midX, y + cardH - 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.gold);
  doc.text("EMPREENDIMENTO", margin + 16, y + 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...C.ink);
  const empLines = doc.splitTextToSize(
    pdfText(empreendimentoNome(p), "Empreendimento a definir"),
    contentW / 2 - 28,
  );
  doc.text(empLines.slice(0, 2), margin + 16, y + 38);
  if (p.unidade) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text(
      `Unidade ${p.unidade}`,
      margin + 16,
      y + 38 + empLines.slice(0, 2).length * 13,
    );
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.gold);
  doc.text("PARTES", midX + 16, y + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  let rightY = y + 36;
  if (p.construtora?.nome) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.ink);
    doc.text("CONSTRUTORA:", midX + 16, rightY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.muted);
    doc.text(
      pdfText(p.construtora.nome),
      midX + 16 + doc.getTextWidth("CONSTRUTORA: "),
      rightY,
    );
    rightY += 14;
  }
  if (p.corretor?.name) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.ink);
    doc.text("CORRETOR:", midX + 16, rightY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.muted);
    doc.text(
      pdfText(p.corretor.name).toUpperCase(),
      midX + 16 + doc.getTextWidth("CORRETOR: "),
      rightY,
    );
  }

  y += cardH + 10;

  const desconto = p.desconto ?? 0;
  const valorLiquido = propostaValorLiquido(p);

  // Faixa valor de venda / total
  const valorH = 48;
  y = ensureSpace(doc, y, valorH + 10, margin);
  doc.setFillColor(...C.navy);
  roundedRect(doc, margin, y, contentW, valorH, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.text(
    desconto > 0 ? "VALOR DE VENDA" : "VALOR TOTAL DA PROPOSTA",
    margin + 18,
    y + 16,
  );
  doc.setFontSize(20);
  doc.text(brl(p.valor), margin + 36);

  if (p.validade) {
    doc.setDrawColor(...C.white);
    doc.setLineWidth(0.6);
    const splitX = pageW - margin - 150;
    doc.line(splitX, y + 14, splitX, y + valorH - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.gold);
    doc.text("Validade até:", splitX + 14, y + 24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...C.white);
    doc.text(formatPropostaDate(p.validade), splitX + 14, y + 42);
  }
  y += valorH + 10;

  // Destaque do desconto do empreendimento
  if (desconto > 0) {
    const discH = 52;
    y = ensureSpace(doc, y, discH + valorH + 12, margin);
    doc.setFillColor(...C.goldSoft);
    roundedRect(doc, margin, y, contentW, discH, 10, "F");
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(2);
    doc.line(margin, y, margin + contentW, y);
    doc.setLineWidth(1);
    doc.line(
      margin + contentW * 0.58,
      y + 14,
      margin + contentW * 0.58,
      y + discH - 14,
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.navy);
    doc.text("CONDIÇÃO ESPECIAL DO EMPREENDIMENTO", margin + 16, y + 18);
    doc.setFontSize(15);
    doc.text("DESCONTO DO EMPREENDIMENTO", margin + 16, y + 38);

    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text("VOCÊ ECONOMIZA:", margin + contentW * 0.58 + 14, y + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...C.navy);
    doc.text(brl(desconto), margin + contentW * 0.58 + 14, y + 38);
    y += discH + 8;

    // Valor total com desconto
    doc.setFillColor(...C.navy);
    roundedRect(doc, margin, y, contentW, valorH, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.gold);
    doc.text("VALOR TOTAL DA PROPOSTA", margin + 18, y + 16);
    doc.setFontSize(20);
    doc.setTextColor(...C.white);
    doc.text(brl(valorLiquido), margin + 18, y + 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.gold);
    doc.text(
      `já com desconto de ${brl(desconto)}`,
      margin + contentW - 16,
      y + 30,
      { align: "right" },
    );
    y += valorH + 10;
  } else {
    y += 8;
  }

  // Composição
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.ink);
  doc.text("COMO O VALOR É COMPOSTO", pageW / 2, y, { align: "center" });
  y += 16;

  const lines = compositionLines(p);
  if (!lines.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...C.muted);
    doc.text("Nenhuma composição de pagamento informada.", margin, y + 10);
    y += 28;
  } else {
    const gap = 6;
    const colW = (contentW - gap) / 2;
    const rowH = 36;
    for (let i = 0; i < lines.length; i += 2) {
      y = ensureSpace(doc, y, rowH + 10, margin);
      const pair = [lines[i], lines[i + 1]].filter(
        Boolean,
      ) as CompositionLine[];
      pair.forEach((line, col) => {
        const x = margin + col * (colW + gap);
        doc.setFillColor(...C.band);
        roundedRect(doc, x, y, colW, rowH, 8, "F");

        // Ícone/marcador dourado
        doc.setFillColor(...C.navy);
        roundedRect(doc, x + 10, y + 9, 16, 16, 4, "F");
        doc.setFillColor(...C.gold);
        doc.circle(x + 18, y + 17, 3, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...C.gold);
        doc.text(line.label, x + 34, y + 15);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...C.ink);
        doc.text(brl(line.value), x + colW - 12, y + 15, { align: "right" });

        if (line.detail) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...C.muted);
          const d = doc.splitTextToSize(line.detail, colW - 48);
          doc.text(d.slice(0, 1), x + 34, y + 27);
        }
      });
      y += rowH + gap;
    }
  }

  // Totais
  const totH = 42;
  y = ensureSpace(doc, y, totH + 8, margin);
  const totalComp = propostaComposicaoTotal(p);
  const diff = propostaDiferenca(p);
  doc.setFillColor(...C.band);
  roundedRect(doc, margin, y, contentW, totH, 10, "F");
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(1);
  doc.line(margin + contentW / 2, y + 9, margin + contentW / 2, y + totH - 9);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text("TOTAL DA COMPOSIÇÃO", margin + 16, y + 14);
  doc.setFontSize(14);
  doc.setTextColor(...C.navy);
  doc.text(brl(totalComp), margin + 16, y + 30);

  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text(
    desconto > 0
      ? "DIFERENÇA EM RELAÇÃO AO VALOR COM DESCONTO"
      : "DIFERENÇA EM RELAÇÃO AO VALOR DE VENDA",
    margin + contentW / 2 + 16,
    y + 14,
  );
  doc.setFontSize(14);
  doc.setTextColor(...C.navy);
  doc.text(brl(diff), margin + contentW / 2 + 16, y + 30);
  y += totH + 8;

  if (p.observacao?.trim()) {
    y = ensureSpace(doc, y, 50, margin);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C.ink);
    doc.text("Observações", margin, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    const obs = doc.splitTextToSize(p.observacao.trim(), contentW);
    doc.text(obs, margin, y);
    y += obs.length * 12 + 10;
  }

  // Rodapé
  const footH = 44;
  const footY = pageH - footH - 16;
  if (y > footY - 8) {
    doc.addPage();
  }
  doc.setFillColor(...C.navy);
  roundedRect(doc, margin, pageH - footH - 16, contentW, footH, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.text(
    "REALIZANDO SONHOS, CONSTRUINDO HISTÓRIAS!",
    margin + 16,
    pageH - footH + 8,
  );

  const contactBits: string[] = [];
  if (company?.telefone?.trim()) {
    contactBits.push(formatPhone(company.telefone));
  }
  if (company?.email?.trim()) {
    contactBits.push(company.email.trim());
  }
  if (contactBits.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.gold);
    doc.text(
      contactBits.join("  ·  "),
      pageW - margin - 16,
      pageH - footH + 8,
      {
        align: "right",
      },
    );
  }

  doc.save(filename);
}

export async function downloadPropostaPdfCliente(
  p: Proposta,
  brand?: PropostaPdfBrand,
) {
  await buildPropostaPdfDescritivo(
    p,
    `proposta-cliente-${safeFilename(p.codigo)}.pdf`,
    brand,
  );
}

export async function downloadPropostaPdfCorretor(
  p: Proposta,
  brand?: PropostaPdfBrand,
) {
  await buildPropostaPdfDescritivo(
    p,
    `proposta-corretor-${safeFilename(p.codigo)}.pdf`,
    brand,
  );
}
