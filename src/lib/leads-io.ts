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

const HEADER_ALIASES: Record<string, keyof ParsedImportLead | "skip"> = {
  nome: "nome",
  name: "nome",
  lead: "nome",
  cliente: "nome",
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
  interesse: "interesse",
  cidade: "cidade",
  city: "cidade",
  bairro: "bairro",
  prioridade: "prioridade",
  priority: "prioridade",
  renda: "renda",
  income: "renda",
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

function parsePrioridade(value: unknown): "Alta" | "Média" | "Baixa" {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (raw.startsWith("alt") || raw === "high") return "Alta";
  if (raw.startsWith("baix") || raw === "low") return "Baixa";
  return "Média";
}

function buildLeadFromCells(
  cells: Partial<Record<string, unknown>>,
  defaults: { origem: string },
): ParsedImportLead {
  const nome = String(cells.nome ?? "").trim();
  const telefoneRaw = String(cells.telefone ?? "").trim();
  const telefone = telefoneRaw ? formatPhone(telefoneRaw) : "";
  const email = String(cells.email ?? "").trim();
  const origem = String(cells.origem ?? "").trim() || defaults.origem;
  const cidade = String(cells.cidade ?? "").trim();
  const bairro = String(cells.bairro ?? "").trim();
  const prioridade = parsePrioridade(cells.prioridade);
  const renda = parseRenda(cells.renda);

  const lead: ParsedImportLead = {
    nome,
    telefone,
    email,
    origem,
    interesse: "Comprar",
    cidade,
    bairro,
    prioridade,
    renda,
  };

  if (nome.length < 2) lead.error = "Nome inválido";
  else if (!isValidPhone(telefone)) lead.error = "Telefone inválido";

  return lead;
}

function rowsFromMatrix(
  matrix: unknown[][],
  defaults: { origem: string },
): ParsedImportLead[] {
  if (matrix.length === 0) return [];

  const headerRow = matrix[0].map(normalizeHeader);
  const mapped = headerRow.map((h) => HEADER_ALIASES[h]);
  const hasHeaders = mapped.some((m) => m && m !== "skip");

  const start = hasHeaders ? 1 : 0;
  const results: ParsedImportLead[] = [];

  for (let i = start; i < matrix.length; i++) {
    const row = matrix[i] ?? [];
    if (row.every((c) => String(c ?? "").trim() === "")) continue;

    const cells: Partial<Record<string, unknown>> = {};
    if (hasHeaders) {
      mapped.forEach((key, idx) => {
        if (!key || key === "skip") return;
        cells[key] = row[idx];
      });
    } else {
      // Sem cabeçalho: nome | telefone | email | origem | cidade | bairro
      cells.nome = row[0];
      cells.telefone = row[1];
      cells.email = row[2];
      cells.origem = row[3];
      cells.cidade = row[4];
      cells.bairro = row[5];
      cells.prioridade = row[6];
      cells.renda = row[7];
    }

    // Se não achou telefone em coluna, tenta achar em qualquer célula
    if (!cells.telefone) {
      for (const cell of row) {
        const formatted = formatPhone(String(cell ?? ""));
        if (isValidPhone(formatted)) {
          cells.telefone = formatted;
          break;
        }
      }
    }

    results.push(buildLeadFromCells(cells, defaults));
  }

  return results;
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

function parseTextLines(
  text: string,
  defaults: { origem: string },
): ParsedImportLead[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const results: ParsedImportLead[] = [];
  const phoneRe = /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}/g;
  const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

  for (const line of lines) {
    const phones = line.match(phoneRe);
    if (!phones?.length) continue;
    const telefone = formatPhone(phones[0]);
    if (!isValidPhone(telefone)) continue;

    const emailMatch = line.match(emailRe);
    let nome = line
      .replace(phones[0], " ")
      .replace(emailMatch?.[0] ?? "", " ")
      .replace(/[|,;]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Remove restos numéricos soltos
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

  // Dedup por telefone
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = phoneDigits(r.telefone);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  const chunks: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    chunks.push(pageText);
  }
  return parseTextLines(chunks.join("\n"), defaults);
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

export function exportLeadsToExcel(leads: Lead[], filename = "leads.xlsx") {
  const rows = leads.map((l) => ({
    Nome: l.nome,
    Telefone: l.telefone,
    Email: l.email,
    Origem: l.origem,
    Interesse: l.interesse,
    Etapa: l.stage,
    Corretor: l.corretor,
    Cidade: l.cidade,
    Bairro: l.bairro,
    Renda: l.renda ?? "",
    Prioridade: l.prioridade,
    Atualizado: l.updatedAt,
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Leads");
  const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
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
    `Exportado em ${new Date().toLocaleString("pt-BR")} · ${leads.length} lead(s)`,
    40,
    52,
  );

  autoTable(doc, {
    startY: 64,
    head: [
      [
        "Nome",
        "Telefone",
        "Origem",
        "Etapa",
        "Corretor",
        "Renda",
        "Prioridade",
        "Atualizado",
      ],
    ],
    body: leads.map((l) => [
      l.nome,
      l.telefone,
      l.origem,
      l.stage,
      l.corretor,
      l.renda != null
        ? l.renda.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0,
          })
        : "—",
      l.prioridade,
      l.updatedAt,
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [7, 158, 212] },
  });

  doc.save(filename);
}

export function downloadImportTemplate() {
  const sheet = XLSX.utils.aoa_to_sheet([
    [
      "Nome",
      "Telefone",
      "Email",
      "Origem",
      "Cidade",
      "Bairro",
      "Prioridade",
      "Renda",
    ],
    [
      "Maria Silva",
      "(81) 98888-7777",
      "maria@email.com",
      "WhatsApp",
      "Recife",
      "Boa Viagem",
      "Alta",
      "8000",
    ],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Modelo");
  const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "modelo-importacao-leads.xlsx",
  );
}
