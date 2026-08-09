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
  type Proposta,
  type PropostaListaKey,
  type PropostaSimplesKey,
} from "@/lib/propostas-api";

/** Paleta New Palace — proposta comercial. */
const C = {
  navy: [13, 27, 42] as [number, number, number],
  navySoft: [27, 42, 58] as [number, number, number],
  gold: [197, 160, 89] as [number, number, number],
  goldSoft: [245, 236, 214] as [number, number, number],
  ink: [22, 28, 36] as [number, number, number],
  muted: [110, 118, 128] as [number, number, number],
  line: [220, 224, 230] as [number, number, number],
  band: [241, 243, 245] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export type PropostaPdfBrand = {
  logoUrl?: string | null;
  company?: Pick<
    TenantBranding,
    "name" | "documento" | "creci" | "email" | "telefone" | "endereco" | "cidade"
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
};

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
    const jpeg = /\.jpe?g($|\?)/i.test(url) || url.startsWith("data:image/jpeg");
    return {
      dataUrl: canvas.toDataURL(jpeg ? "image/jpeg" : "image/png"),
      format: jpeg ? "JPEG" : "PNG",
      width: w,
      height: h,
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
  const contentW = pageW - margin * 2;
  const company = brand?.company;
  const companyName = (company?.name ?? "").trim() || "Imobiliária";
  const logo = brand?.logoUrl
    ? await loadLogoForPdf(brand.logoUrl)
    : null;

  // ─── Cabeçalho escuro ───
  const headerH = 118;
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, pageW, headerH, "F");

  // Faixa/diagonais douradas (canto inferior direito do header)
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

  let y = headerH + 28;

  // Título + código + data
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C.gold);
  doc.text("PROPOSTA COMERCIAL", margin, y);

  y += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...C.ink);
  doc.text(p.codigo, margin, y);

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

  y += 26;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...C.ink);
  doc.text(`Prezado(a) ${p.clienteNome},`, margin, y);
  y += 16;
  doc.setFontSize(10);
  doc.setTextColor(...C.muted);
  const intro =
    "Apresentamos a composição financeira desta proposta de aquisição. Os valores abaixo descrevem de forma clara cada etapa do pagamento.";
  const introLines = doc.splitTextToSize(intro, contentW);
  doc.text(introLines, margin, y);
  y += introLines.length * 13 + 18;

  // Card empreendimento / partes
  const cardH = 72;
  y = ensureSpace(doc, y, cardH + 16, margin);
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
    empreendimentoNome(p),
    contentW / 2 - 28,
  );
  doc.text(empLines.slice(0, 2), margin + 16, y + 38);
  if (p.unidade) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text(`Unidade ${p.unidade}`, margin + 16, y + 38 + empLines.slice(0, 2).length * 13);
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
    doc.text(p.construtora.nome, midX + 16 + doc.getTextWidth("CONSTRUTORA: "), rightY);
    rightY += 14;
  }
  if (p.corretor?.name) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.ink);
    doc.text("CORRETOR:", midX + 16, rightY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.muted);
    doc.text(
      p.corretor.name.toUpperCase(),
      midX + 16 + doc.getTextWidth("CORRETOR: "),
      rightY,
    );
  }

  y += cardH + 16;

  // Faixa valor total
  const valorH = 58;
  y = ensureSpace(doc, y, valorH + 16, margin);
  doc.setFillColor(...C.navy);
  roundedRect(doc, margin, y, contentW, valorH, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.text("VALOR TOTAL DA PROPOSTA", margin + 18, y + 20);
  doc.setFontSize(20);
  doc.text(brl(p.valor), margin + 18, y + 44);

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
  y += valorH + 22;

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
    const gap = 10;
    const colW = (contentW - gap) / 2;
    const rowH = 44;
    for (let i = 0; i < lines.length; i += 2) {
      y = ensureSpace(doc, y, rowH + 10, margin);
      const pair = [lines[i], lines[i + 1]].filter(Boolean) as CompositionLine[];
      pair.forEach((line, col) => {
        const x = margin + col * (colW + gap);
        doc.setFillColor(...C.band);
        roundedRect(doc, x, y, colW, rowH, 8, "F");

        // Ícone/marcador dourado
        doc.setFillColor(...C.navy);
        roundedRect(doc, x + 10, y + 12, 18, 18, 4, "F");
        doc.setFillColor(...C.gold);
        doc.circle(x + 19, y + 21, 3, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...C.gold);
        doc.text(line.label, x + 36, y + 18);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...C.ink);
        doc.text(brl(line.value), x + colW - 12, y + 18, { align: "right" });

        if (line.detail) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...C.muted);
          const d = doc.splitTextToSize(line.detail, colW - 48);
          doc.text(d.slice(0, 1), x + 36, y + 32);
        }
      });
      y += rowH + gap;
    }
  }

  // Totais
  const totH = 52;
  y = ensureSpace(doc, y, totH + 12, margin);
  const totalComp = propostaComposicaoTotal(p);
  const diff = propostaDiferenca(p);
  doc.setFillColor(...C.band);
  roundedRect(doc, margin, y, contentW, totH, 10, "F");
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(1);
  doc.line(margin + contentW / 2, y + 12, margin + contentW / 2, y + totH - 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text("TOTAL DA COMPOSIÇÃO", margin + 16, y + 18);
  doc.setFontSize(14);
  doc.setTextColor(...C.navy);
  doc.text(brl(totalComp), margin + 16, y + 38);

  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text(
    "DIFERENÇA EM RELAÇÃO AO VALOR DE VENDA",
    margin + contentW / 2 + 16,
    y + 18,
  );
  doc.setFontSize(14);
  doc.setTextColor(...C.navy);
  doc.text(brl(diff), margin + contentW / 2 + 16, y + 38);
  y += totH + 14;

  // Desconto especial (quando a composição fica abaixo do valor de venda)
  if (diff > 0) {
    const discH = 56;
    y = ensureSpace(doc, y, discH + 12, margin);
    doc.setFillColor(...C.goldSoft);
    roundedRect(doc, margin, y, contentW, discH, 10, "F");
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(1);
    doc.line(margin + contentW * 0.58, y + 12, margin + contentW * 0.58, y + discH - 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.navy);
    doc.text("DESCONTO ESPECIAL PARA VOCÊ!", margin + 16, y + 20);
    doc.setFontSize(16);
    doc.text("DESCONTO ESPECIAL", margin + 16, y + 40);

    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text("VOCÊ ECONOMIZA:", margin + contentW * 0.58 + 14, y + 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...C.navy);
    doc.text(brl(diff), margin + contentW * 0.58 + 14, y + 40);
    y += discH + 14;
  }

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
    doc.text(contactBits.join("  ·  "), pageW - margin - 16, pageH - footH + 8, {
      align: "right",
    });
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
