import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { brl } from "@/lib/crm-types";
import {
  empreendimentoLocalidadeNome,
  empreendimentoStatusLabel,
  empreendimentoTipoLabel,
  type Empreendimento,
} from "@/lib/empreendimentos-api";

export const PDF_ORDEM_IMOVEIS = [
  "alfabetica",
  "construtora",
  "localidade",
] as const;

export type PdfOrdemImoveis = (typeof PDF_ORDEM_IMOVEIS)[number];

export const PDF_ORDEM_IMOVEIS_LABEL: Record<PdfOrdemImoveis, string> = {
  alfabetica: "Ordem alfabética",
  construtora: "Construtora",
  localidade: "Localidade",
};

function formatPrevisao(iso: string | null | undefined) {
  if (!iso) return "—";
  const [year, month] = iso.slice(0, 7).split("-");
  if (!year || !month) return iso;
  return `${month}/${year}`;
}

function statusLabel(item: Empreendimento) {
  const parts = [
    empreendimentoTipoLabel(item.tipo),
    empreendimentoStatusLabel(item.status),
  ].filter(Boolean);
  return parts.join(" · ") || "—";
}

function comparePt(a: string, b: string) {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
}

function groupLabel(item: Empreendimento, ordem: PdfOrdemImoveis) {
  if (ordem === "construtora") {
    return item.construtora?.nome?.trim() || "Sem construtora";
  }
  if (ordem === "localidade") {
    return empreendimentoLocalidadeNome(item) || "Sem localidade";
  }
  return "";
}

function sortEmpreendimentos(
  items: Empreendimento[],
  ordem: PdfOrdemImoveis,
): Empreendimento[] {
  return [...items].sort((a, b) => {
    if (ordem !== "alfabetica") {
      const cmp = comparePt(groupLabel(a, ordem), groupLabel(b, ordem));
      if (cmp !== 0) return cmp;
    }
    return comparePt(a.nome, b.nome);
  });
}

function groupedEmpreendimentos(
  items: Empreendimento[],
  ordem: PdfOrdemImoveis,
): Array<{ title: string; items: Empreendimento[] }> {
  const sorted = sortEmpreendimentos(items, ordem);
  if (ordem === "alfabetica") return [{ title: "", items: sorted }];

  const groups: Array<{ title: string; items: Empreendimento[] }> = [];
  for (const item of sorted) {
    const title = groupLabel(item, ordem);
    const last = groups[groups.length - 1];
    if (last && last.title === title) last.items.push(item);
    else groups.push({ title, items: [item] });
  }
  return groups;
}

function tableRow(item: Empreendimento, ordem: PdfOrdemImoveis): string[] {
  const row = [
    item.nome,
    item.construtora?.nome ?? "—",
    empreendimentoLocalidadeNome(item) || "—",
    statusLabel(item),
    formatPrevisao(item.previsaoEntrega),
    item.quartos != null ? String(item.quartos) : "—",
    item.areaM2 != null ? `${item.areaM2} m²` : "—",
    item.valorReferencia != null ? brl(item.valorReferencia) : "—",
  ];
  if (ordem === "construtora") row.splice(1, 1);
  if (ordem === "localidade") row.splice(2, 1);
  return row;
}

function tableHead(ordem: PdfOrdemImoveis): string[] {
  const head = [
    "Empreendimento",
    "Construtora",
    "Localidade",
    "Status",
    "Previsão",
    "Quartos",
    "Metragem",
    "A partir de",
  ];
  if (ordem === "construtora") head.splice(1, 1);
  if (ordem === "localidade") head.splice(2, 1);
  return head;
}

function lastTableY(pdf: jsPDF) {
  const last = (pdf as jsPDF & { lastAutoTable?: { finalY: number } })
    .lastAutoTable;
  return last?.finalY ?? 64;
}

export function exportEmpreendimentosToPdf(
  items: Empreendimento[],
  options?: {
    filename?: string;
    imobiliariaNome?: string;
    filtros?: string[];
    ordem?: PdfOrdemImoveis;
  },
) {
  const ordem = options?.ordem ?? "alfabetica";
  const imobiliaria = options?.imobiliariaNome?.trim() || "Imobiliária";
  const filename =
    options?.filename ??
    `imoveis-${new Date().toISOString().slice(0, 10)}.pdf`;
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const groups = groupedEmpreendimentos(items, ordem);
  const head = tableHead(ordem);

  pdf.setFontSize(14);
  pdf.setTextColor(20);
  pdf.text(`Imóveis — ${imobiliaria}`, 40, 36);
  pdf.setFontSize(9);
  pdf.setTextColor(100);
  const meta = [
    `Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
    `${items.length} empreendimento${items.length === 1 ? "" : "s"}`,
    PDF_ORDEM_IMOVEIS_LABEL[ordem],
    ...(options?.filtros?.length ? options.filtros : []),
  ].join(" · ");
  pdf.text(meta, 40, 52);

  let startY = 64;
  for (const group of groups) {
    if (group.title) {
      if (startY > 520) {
        pdf.addPage();
        startY = 40;
      }
      pdf.setFontSize(11);
      pdf.setTextColor(30);
      pdf.text(group.title, 40, startY);
      startY += 10;
    }

    autoTable(pdf, {
      startY,
      head: [head],
      body: group.items.map((item) => tableRow(item, ordem)),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [7, 158, 212] },
      columnStyles: {
        0: { cellWidth: ordem === "alfabetica" ? 140 : 160 },
        [head.length - 1]: { halign: "right" },
      },
    });
    startY = lastTableY(pdf) + 22;
  }

  pdf.save(filename);
}
