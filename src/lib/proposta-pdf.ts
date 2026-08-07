import { jsPDF } from "jspdf";
import { brl } from "@/lib/crm-types";
import { phoneDigits } from "@/lib/phone";
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

const INK = {
  ink: [28, 32, 38] as [number, number, number],
  muted: [100, 108, 118] as [number, number, number],
  accent: [14, 116, 144] as [number, number, number],
  accentSoft: [224, 242, 247] as [number, number, number],
  line: [210, 216, 222] as [number, number, number],
  band: [245, 247, 249] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

type CompositionLine = {
  label: string;
  detail?: string;
  value: number;
};

function compositionLines(p: Proposta): CompositionLine[] {
  const lines: CompositionLine[] = [];

  for (const key of PROPOSTA_SIMPLES_KEYS) {
    const value = p[key as PropostaSimplesKey];
    if (value == null) continue;
    lines.push({
      label: PROPOSTA_COMPOSICAO_LABEL[key],
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
      label: `${PROPOSTA_COMPOSICAO_LABEL[key]} (${values.length} parcela${values.length > 1 ? "s" : ""})`,
      detail,
      value: subtotal,
    });
  }

  return lines;
}

function empreendimentoLabel(p: Proposta) {
  const nome = p.empreendimento?.nome ?? "Empreendimento a definir";
  const unidade = p.unidade ? ` · Unidade ${p.unidade}` : "";
  return `${nome}${unidade}`;
}

function safeFilename(codigo: string) {
  return codigo.replace(/[^\w.-]+/g, "_");
}

export function buildPropostaShareMessage(p: Proposta): string {
  const linhas = [
    `Olá${p.clienteNome ? `, ${p.clienteNome}` : ""}!`,
    "",
    `Segue a proposta comercial ${p.codigo}.`,
    `Empreendimento: ${empreendimentoLabel(p)}`,
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

function buildPropostaPdfDescritivo(p: Proposta, filename: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = 0;

  doc.setFillColor(...INK.accent);
  doc.rect(0, 0, pageW, 8, "F");

  y = 48;
  doc.setTextColor(...INK.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("PROPOSTA COMERCIAL", margin, y);

  y += 22;
  doc.setTextColor(...INK.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(p.codigo, margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK.muted);
  const emitted = new Date().toLocaleDateString("pt-BR");
  doc.text(`Emitida em ${emitted}`, pageW - margin, y - 4, { align: "right" });

  y += 18;
  doc.setDrawColor(...INK.line);
  doc.setLineWidth(1);
  doc.line(margin, y, pageW - margin, y);

  y += 28;
  doc.setTextColor(...INK.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const intro = [
    `Prezado(a) ${p.clienteNome},`,
    "",
    "Apresentamos a composição financeira desta proposta de aquisição.",
    "Os valores abaixo descrevem de forma clara cada etapa do pagamento.",
  ].join("\n");
  const introLines = doc.splitTextToSize(intro, contentW);
  doc.text(introLines, margin, y);
  y += introLines.length * 15 + 18;

  const cardH = 78;
  doc.setFillColor(...INK.band);
  doc.roundedRect(margin, y, contentW, cardH, 8, 8, "F");
  doc.setDrawColor(...INK.line);
  doc.roundedRect(margin, y, contentW, cardH, 8, 8, "S");

  doc.setFontSize(9);
  doc.setTextColor(...INK.muted);
  doc.text("Empreendimento", margin + 16, y + 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK.ink);
  const empLines = doc.splitTextToSize(empreendimentoLabel(p), contentW - 32);
  doc.text(empLines.slice(0, 2), margin + 16, y + 38);

  const metaRight = [
    p.construtora?.nome ? `Construtora: ${p.construtora.nome}` : null,
    p.corretor?.name ? `Corretor: ${p.corretor.name}` : null,
  ].filter(Boolean) as string[];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK.muted);
  metaRight.forEach((line, i) => {
    doc.text(line, pageW - margin - 16, y + 22 + i * 14, { align: "right" });
  });

  y += cardH + 20;

  doc.setFillColor(...INK.accentSoft);
  doc.roundedRect(margin, y, contentW, 56, 8, 8, "F");
  doc.setFontSize(9);
  doc.setTextColor(...INK.accent);
  doc.text("Valor total da proposta", margin + 16, y + 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...INK.accent);
  doc.text(brl(p.valor), margin + 16, y + 44);
  if (p.validade) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK.muted);
    doc.text(
      `Validade até ${formatPropostaDate(p.validade)}`,
      pageW - margin - 16,
      y + 34,
      { align: "right" },
    );
  }
  y += 72;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK.ink);
  doc.text("Como o valor é composto", margin, y);
  y += 14;

  const lines = compositionLines(p);
  if (!lines.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK.muted);
    doc.text("Nenhuma composição de pagamento informada.", margin, y + 12);
    y += 28;
  } else {
    for (const line of lines) {
      const blockH = line.detail ? 44 : 32;
      if (y + blockH > pageH - 72) {
        doc.addPage();
        y = 48;
      }
      doc.setFillColor(...INK.white);
      doc.setDrawColor(...INK.line);
      doc.roundedRect(margin, y, contentW, blockH, 6, 6, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...INK.ink);
      doc.text(line.label, margin + 14, y + 18);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(brl(line.value), pageW - margin - 14, y + 18, {
        align: "right",
      });

      if (line.detail) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...INK.muted);
        const detailLines = doc.splitTextToSize(line.detail, contentW - 28);
        doc.text(detailLines.slice(0, 1), margin + 14, y + 34);
      }
      y += blockH + 8;
    }
  }

  if (y + 70 > pageH - 56) {
    doc.addPage();
    y = 48;
  }

  const totalComp = propostaComposicaoTotal(p);
  doc.setFillColor(...INK.band);
  doc.roundedRect(margin, y, contentW, 52, 8, 8, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK.muted);
  doc.text("Total da composição", margin + 16, y + 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK.ink);
  doc.text(brl(totalComp), pageW - margin - 16, y + 20, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK.muted);
  doc.text("Diferença em relação ao valor de venda", margin + 16, y + 40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INK.ink);
  doc.text(brl(propostaDiferenca(p)), pageW - margin - 16, y + 40, {
    align: "right",
  });
  y += 68;

  if (p.observacao) {
    if (y + 60 > pageH - 56) {
      doc.addPage();
      y = 48;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK.ink);
    doc.text("Observações", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK.muted);
    const obs = doc.splitTextToSize(p.observacao, contentW);
    doc.text(obs, margin, y);
  }

  const footerY = pageH - 28;
  doc.setDrawColor(...INK.line);
  doc.line(margin, footerY - 10, pageW - margin, footerY - 10);
  doc.setFontSize(8);
  doc.setTextColor(...INK.muted);
  doc.text(
    "Documento gerado automaticamente · valores sujeitos a confirmação comercial",
    margin,
    footerY,
  );
  doc.text(p.codigo, pageW - margin, footerY, { align: "right" });

  doc.save(filename);
}

export function downloadPropostaPdfCliente(p: Proposta) {
  buildPropostaPdfDescritivo(
    p,
    `proposta-cliente-${safeFilename(p.codigo)}.pdf`,
  );
}

export function downloadPropostaPdfCorretor(p: Proposta) {
  buildPropostaPdfDescritivo(
    p,
    `proposta-corretor-${safeFilename(p.codigo)}.pdf`,
  );
}
