import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { LostLead } from "@/lib/lost-leads-cache";

export const LOST_LEAD_IO_COLUMNS = ["Nome", "Telefone"] as const;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function lostLeadToRow(lead: LostLead): string[] {
  return [lead.nome || "", lead.telefone || ""];
}

function buildSheet(rows: string[][]) {
  const aoa = [Array.from(LOST_LEAD_IO_COLUMNS), ...rows];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);

  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      if (!cell) continue;
      sheet[addr] = { t: "s", v: String(cell.v ?? "") };
    }
  }

  sheet["!cols"] = LOST_LEAD_IO_COLUMNS.map((header, index) => {
    const maxLen = Math.max(
      header.length,
      ...rows.map((row) => String(row[index] ?? "").length),
      10,
    );
    return { wch: Math.min(maxLen + 2, 48) };
  });

  return sheet;
}

export function exportLostLeadsToExcel(
  leads: LostLead[],
  filename = "leads-perdidos.xlsx",
) {
  const workbook = XLSX.utils.book_new();
  const sheet = buildSheet(leads.map((l) => lostLeadToRow(l)));
  XLSX.utils.book_append_sheet(workbook, sheet, "Leads perdidos");
  const data = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    cellStyles: false,
  });
  downloadBlob(
    new Blob([data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

export function exportLostLeadsToPdf(
  leads: LostLead[],
  filename = "leads-perdidos.pdf",
  imobiliariaNome = "Imobiliária",
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text(`Leads Perdidos — ${imobiliariaNome}`, 40, 36);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `Exportado em ${new Date().toLocaleDateString("pt-BR")} · ${leads.length} lead(s)`,
    40,
    52,
  );

  autoTable(doc, {
    startY: 64,
    head: [Array.from(LOST_LEAD_IO_COLUMNS)],
    body: leads.map((l) => lostLeadToRow(l)),
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [220, 38, 38] },
  });

  doc.save(filename);
}
