import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import mammoth from "mammoth";
import type { Lead } from "@/lib/crm-types";
import {
  formatPhone,
  isValidPhone,
  phoneDigits,
} from "@/lib/phone";

/** Formato único de import/export (SupremoCRM simplificado). */
export const LEAD_IO_COLUMNS = [
  "Data Captura",
  "Nome do Cliente",
  "Telefone",
  "E-mail",
  "Origem",
] as const;

export type ParsedImportLead = {
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: "Comprar";
  cidade: string;
  bairro: string;
  prioridade: "Alta" | "Média" | "Baixa";
  renda: number | null;
  /** Linha inválida: motivo. */
  error?: string;
};

type CellMap = Partial<Record<string, unknown>>;

const HEADER_ALIASES: Record<string, string> = {
  // formato unificado / Supremo
  "data captura": "data",
  data: "data",
  "hora captura": "hora",
  hora: "hora",
  "nome do cliente": "nome",
  nome: "nome",
  name: "nome",
  lead: "nome",
  cliente: "nome",
  ddd: "ddd",
  telefone: "telefone",
  phone: "telefone",
  celular: "telefone",
  whatsapp: "telefone",
  fone: "telefone",
  email: "email",
  "e-mail": "email",
  mail: "email",
  origem: "origem",
  source: "origem",
  // ignorados no mapeamento útil (não importamos)
  "imovel seminovo de interesse": "skip",
  "imóvel seminovo de interesse": "skip",
  "empreendimento de interesse": "empreendimento",
  empreendimento: "empreendimento",
  "mensagem inicial da captura do lead": "skip",
  mensagem: "skip",
  // legado nosso
  interesse: "skip",
  cidade: "cidade",
  city: "cidade",
  bairro: "bairro",
  prioridade: "skip",
  priority: "skip",
  renda: "renda",
  income: "renda",
  etapa: "skip",
  corretor: "skip",
  atualizado: "skip",
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function parseRenda(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return null;
  return Number(digits);
}

/** Remove hora colada no nome (ex.: "13:56 Fernando" → "Fernando"). */
function stripTimePrefix(nome: string): string {
  return nome.replace(/^\d{1,2}:\d{2}\s+/, "").trim();
}

/** Junta DDD + telefone em um único número formatado. */
function mergePhone(ddd: unknown, telefone: unknown): string {
  const dddDigits = String(ddd ?? "").replace(/\D/g, "").slice(0, 2);
  const phoneDigitsOnly = String(telefone ?? "").replace(/\D/g, "");
  // Se o telefone já traz DDD (10–11 dígitos), usa direto
  if (phoneDigitsOnly.length >= 10) {
    return formatPhone(phoneDigitsOnly);
  }
  const combined = `${dddDigits}${phoneDigitsOnly}`;
  return combined ? formatPhone(combined) : "";
}

function buildLeadFromCells(
  cells: CellMap,
  defaults: { origem: string },
): ParsedImportLead {
  let nome = stripTimePrefix(String(cells.nome ?? "").trim());
  const telefone = mergePhone(cells.ddd, cells.telefone);
  const email = String(cells.email ?? "").trim();
  const empreendimento = String(cells.empreendimento ?? "").trim();
  const origem =
    String(cells.origem ?? "").trim() ||
    (empreendimento && !empreendimento.startsWith("[")
      ? empreendimento
      : "") ||
    defaults.origem;
  const cidade = String(cells.cidade ?? "").trim();
  const bairro = String(cells.bairro ?? "").trim();
  const renda = parseRenda(cells.renda);

  const lead: ParsedImportLead = {
    nome,
    telefone,
    email,
    origem,
    interesse: "Comprar",
    cidade,
    bairro,
    prioridade: "Média",
    renda,
  };

  if (nome.length < 2) lead.error = "Nome inválido";
  else if (!isValidPhone(telefone)) lead.error = "Telefone inválido";

  return lead;
}

function mapHeaderKeys(headerRow: unknown[]): (string | null)[] {
  return headerRow.map((h) => {
    const key = HEADER_ALIASES[normalizeHeader(h)];
    if (!key || key === "skip") return null;
    return key;
  });
}

function rowsFromMatrix(
  matrix: unknown[][],
  defaults: { origem: string },
): ParsedImportLead[] {
  if (matrix.length === 0) return [];

  const mapped = mapHeaderKeys(matrix[0]);
  const hasHeaders = mapped.some(Boolean);

  const start = hasHeaders ? 1 : 0;
  const results: ParsedImportLead[] = [];

  for (let i = start; i < matrix.length; i++) {
    const row = matrix[i] ?? [];
    if (row.every((c) => String(c ?? "").trim() === "")) continue;

    const cells: CellMap = {};
    if (hasHeaders) {
      mapped.forEach((key, idx) => {
        if (!key) return;
        cells[key] = row[idx];
      });
    } else {
      // Formato unificado sem cabeçalho:
      // Data | Nome | Telefone | E-mail | Origem
      cells.data = row[0];
      cells.nome = row[1];
      cells.telefone = row[2];
      cells.email = row[3];
      cells.origem = row[4];
    }

    // Fallback: achar telefone em qualquer célula
    if (!mergePhone(cells.ddd, cells.telefone) || !isValidPhone(mergePhone(cells.ddd, cells.telefone))) {
      for (const cell of row) {
        const formatted = formatPhone(String(cell ?? ""));
        if (isValidPhone(formatted)) {
          cells.telefone = formatted;
          cells.ddd = "";
          break;
        }
      }
    }

    results.push(buildLeadFromCells(cells, defaults));
  }

  return dedupeByPhone(results);
}

function dedupeByPhone(rows: ParsedImportLead[]): ParsedImportLead[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = phoneDigits(r.telefone);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseLeadsFromExcel(
  buffer: ArrayBuffer,
  defaults: { origem: string },
): ParsedImportLead[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];
  return rowsFromMatrix(matrix, defaults);
}

function parseHtmlTables(
  html: string,
  defaults: { origem: string },
): ParsedImportLead[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const tables = [...doc.querySelectorAll("table")];
  const all: ParsedImportLead[] = [];
  for (const table of tables) {
    const matrix: unknown[][] = [];
    table.querySelectorAll("tr").forEach((tr) => {
      const cells = [...tr.querySelectorAll("th,td")].map((td) =>
        (td.textContent ?? "").trim(),
      );
      if (cells.length) matrix.push(cells);
    });
    all.push(...rowsFromMatrix(matrix, defaults));
  }
  return all;
}

/**
 * Parser do PDF SupremoCRM (e similares):
 * Data | (Hora+)Nome | Telefone(com DDD) | E-mail? | tags...
 */
function parseSupremoPdfLines(
  lines: string[],
  defaults: { origem: string },
): ParsedImportLead[] {
  const results: ParsedImportLead[] = [];
  const dateRe = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
  const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const phoneRe = /\b\d{2}\s*\d{4,5}[-\s]?\d{4}\b/;

  for (const line of lines) {
    const parts = line
      .split(/\s{2,}|\t|\|/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length < 2) continue;
    if (normalizeHeader(parts[0]).includes("data captura")) continue;

    let idx = 0;
    if (dateRe.test(parts[0])) idx = 1;
    if (idx >= parts.length) continue;

    let nome = stripTimePrefix(parts[idx] ?? "");
    idx += 1;

    let telefone = "";
    let email = "";
    for (; idx < parts.length; idx++) {
      const part = parts[idx];
      if (!telefone && phoneRe.test(part)) {
        telefone = formatPhone(part);
        continue;
      }
      if (!email && emailRe.test(part)) {
        email = part.match(emailRe)?.[0] ?? "";
        continue;
      }
    }

    if (!telefone) {
      const m = line.match(phoneRe);
      if (m) telefone = formatPhone(m[0]);
    }
    if (!email) {
      const m = line.match(emailRe);
      if (m) email = m[0];
    }

    if (nome.length < 2 || !isValidPhone(telefone)) continue;

    results.push(
      buildLeadFromCells(
        { nome, telefone, email, origem: defaults.origem },
        defaults,
      ),
    );
  }

  return dedupeByPhone(results);
}

function parseTextLines(
  text: string,
  defaults: { origem: string },
): ParsedImportLead[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const supremo = parseSupremoPdfLines(lines, defaults);
  if (supremo.length > 0) return supremo;

  // Fallback genérico: linhas com telefone
  const results: ParsedImportLead[] = [];
  const phoneRe = /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}/g;
  const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

  for (const line of lines) {
    const phones = line.match(phoneRe);
    if (!phones?.length) continue;
    const telefone = formatPhone(phones[0]);
    if (!isValidPhone(telefone)) continue;

    const emailMatch = line.match(emailRe);
    let nome = stripTimePrefix(
      line
        .replace(phones[0], " ")
        .replace(emailMatch?.[0] ?? "", " ")
        .replace(/[|,;]+/g, " ")
        .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );
    nome = nome.replace(/\b\d{2,}\b/g, "").replace(/\s+/g, " ").trim();
    if (nome.length < 2) continue;

    results.push(
      buildLeadFromCells(
        {
          nome,
          telefone,
          email: emailMatch?.[0] ?? "",
          origem: defaults.origem,
        },
        defaults,
      ),
    );
  }

  return dedupeByPhone(results);
}

export async function parseLeadsFromWord(
  buffer: ArrayBuffer,
  defaults: { origem: string },
): Promise<ParsedImportLead[]> {
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  const fromTables = parseHtmlTables(result.value, defaults);
  if (fromTables.length > 0) return fromTables;

  const text = await mammoth.extractRawText({ arrayBuffer: buffer });
  return parseTextLines(text.value, defaults);
}

export async function parseLeadsFromPdf(
  buffer: ArrayBuffer,
  defaults: { origem: string },
): Promise<ParsedImportLead[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const lineBuckets: string[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const byY = new Map<number, Array<{ x: number; str: string }>>();

    for (const item of content.items) {
      if (!("str" in item) || !item.str?.trim()) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      const list = byY.get(y) ?? [];
      list.push({ x, str: item.str.trim() });
      byY.set(y, list);
    }

    const sortedYs = [...byY.keys()].sort((a, b) => b - a);
    for (const y of sortedYs) {
      const parts = (byY.get(y) ?? [])
        .sort((a, b) => a.x - b.x)
        .map((p) => p.str);
      lineBuckets.push(parts.join("  "));
    }
  }

  return parseTextLines(lineBuckets.join("\n"), defaults);
}

export async function parseLeadsFromFile(
  file: File,
  defaults: { origem: string },
): Promise<ParsedImportLead[]> {
  const buffer = await file.arrayBuffer();
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
    return parseLeadsFromExcel(buffer, defaults);
  }
  if (name.endsWith(".docx") || name.endsWith(".doc")) {
    if (name.endsWith(".doc") && !name.endsWith(".docx")) {
      throw new Error(
        "Arquivos .doc antigos não são suportados. Salve como .docx ou Excel.",
      );
    }
    return parseLeadsFromWord(buffer, defaults);
  }
  if (name.endsWith(".pdf")) {
    return parseLeadsFromPdf(buffer, defaults);
  }
  throw new Error("Formato não suportado. Use Excel, PDF ou Word (.docx).");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Monta planilha forçando texto (evita Excel/Sheets interpretar telefone como fórmula/número). */
function buildLeadsSheet(rows: string[][]) {
  const aoa = [Array.from(LEAD_IO_COLUMNS), ...rows];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);

  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      if (!cell) continue;
      const value = String(cell.v ?? "");
      sheet[addr] = { t: "s", v: value };
    }
  }

  sheet["!cols"] = LEAD_IO_COLUMNS.map((header, index) => {
    const maxLen = Math.max(
      header.length,
      ...rows.map((row) => String(row[index] ?? "").length),
      10,
    );
    return { wch: Math.min(maxLen + 2, 48) };
  });

  return sheet;
}

function leadsToSheetRows(leads: Lead[]): string[][] {
  return leads.map((l) => [
    l.updatedAt || "",
    l.nome || "",
    l.telefone || "",
    l.email || "",
    l.origem || "",
  ]);
}

export function exportLeadsToExcel(leads: Lead[], filename = "leads.xlsx") {
  const workbook = XLSX.utils.book_new();
  const sheet = buildLeadsSheet(leadsToSheetRows(leads));
  XLSX.utils.book_append_sheet(workbook, sheet, "Leads");
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

export function exportLeadsToPdf(
  leads: Lead[],
  filename = "leads.pdf",
  imobiliariaNome = "Imobiliária",
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text(`Leads — ${imobiliariaNome}`, 40, 36);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `Exportado em ${new Date().toLocaleDateString("pt-BR")} · ${leads.length} lead(s)`,
    40,
    52,
  );

  autoTable(doc, {
    startY: 64,
    head: [Array.from(LEAD_IO_COLUMNS)],
    body: leads.map((l) => [
      l.updatedAt,
      l.nome,
      l.telefone,
      l.email || "—",
      l.origem || "—",
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [7, 158, 212] },
  });

  doc.save(filename);
}

export function downloadImportTemplate() {
  const workbook = XLSX.utils.book_new();
  const sheet = buildLeadsSheet([
    [
      "02/08/2026",
      "Maria Silva",
      "(81) 98888-7777",
      "maria@email.com",
      "WhatsApp",
    ],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Modelo");
  const data = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    cellStyles: false,
  });
  downloadBlob(
    new Blob([data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "modelo-importacao-leads.xlsx",
  );
}
