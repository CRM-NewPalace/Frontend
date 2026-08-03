import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  displayFonte,
  FONTE_LABELS,
  type Documentacao,
} from "@/lib/documentacao-api";
import { formatPhone, isValidPhone, phoneDigits } from "@/lib/phone";

export const DOC_IO_COLUMNS = [
  "Nome",
  "Telefone",
  "Construtora",
  "Empreendimento",
  "Fonte",
  "Status 1",
  "Status 2",
  "Corretor",
  "Gerente",
  "Data Análise",
  "Data Venda",
  "VGV",
  "Observação",
] as const;

export type ParsedImportDoc = {
  nome: string;
  telefone: string;
  construtoraNome: string;
  empreendimentoNome: string;
  fonte: string;
  fonteLabel: string;
  status1: string;
  status2: string;
  corretorNome: string;
  gerenteNome: string;
  dataAnalise: string;
  dataVenda: string;
  vgv: number | null;
  obs: string;
  error?: string;
};

type CellMap = Partial<Record<string, unknown>>;

const HEADER_ALIASES: Record<string, string> = {
  nome: "nome",
  name: "nome",
  cliente: "nome",
  "nome do cliente": "nome",
  telefone: "telefone",
  phone: "telefone",
  celular: "telefone",
  whatsapp: "telefone",
  fone: "telefone",
  construtora: "construtora",
  empreendimento: "empreendimento",
  fonte: "fonte",
  origem: "fonte",
  "status 1": "status1",
  status1: "status1",
  "status 2": "status2",
  status2: "status2",
  corretor: "corretor",
  gerente: "gerente",
  "data analise": "dataAnalise",
  "data análise": "dataAnalise",
  dataanalise: "dataAnalise",
  "data venda": "dataVenda",
  datavenda: "dataVenda",
  vgv: "vgv",
  valor: "vgv",
  observacao: "obs",
  observação: "obs",
  obs: "obs",
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseVgv(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return null;
  return Number(digits);
}

/** Aceita ISO (yyyy-mm-dd) ou BR (dd/mm/yyyy). Retorna yyyy-mm-dd ou "". */
export function parseDocDate(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(value));
    return epoch.toISOString().slice(0, 10);
  }
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (br) {
    const d = br[1].padStart(2, "0");
    const m = br[2].padStart(2, "0");
    let y = br[3];
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m}-${d}`;
  }
  return "";
}

function formatDayBr(iso: string | null | undefined): string {
  if (!iso) return "";
  const day = iso.slice(0, 10);
  return new Date(day + "T12:00:00").toLocaleDateString("pt-BR");
}

export function parseFonteLabel(raw: string): string {
  const n = normalizeHeader(raw);
  if (!n) return "Outro";
  for (const [key, label] of Object.entries(FONTE_LABELS)) {
    if (normalizeHeader(key) === n || normalizeHeader(label) === n) {
      return label;
    }
  }
  return raw.trim() || "Outro";
}

function buildDocFromCells(cells: CellMap): ParsedImportDoc {
  const nome = String(cells.nome ?? "").trim();
  const telefoneRaw = String(cells.telefone ?? "").trim();
  const telefone = telefoneRaw ? formatPhone(telefoneRaw) : "";
  const fonteRaw = String(cells.fonte ?? "").trim();
  const fonte = parseFonteLabel(fonteRaw);
  const status1 = String(cells.status1 ?? "").trim() || "Análise";
  const status2 = String(cells.status2 ?? "").trim() || "Andamento";

  const row: ParsedImportDoc = {
    nome,
    telefone,
    construtoraNome: String(cells.construtora ?? "").trim(),
    empreendimentoNome: String(cells.empreendimento ?? "").trim(),
    fonte,
    fonteLabel: fonteRaw || displayFonte(fonte),
    status1,
    status2,
    corretorNome: String(cells.corretor ?? "").trim(),
    gerenteNome: String(cells.gerente ?? "").trim(),
    dataAnalise: parseDocDate(cells.dataAnalise),
    dataVenda: parseDocDate(cells.dataVenda),
    vgv: parseVgv(cells.vgv),
    obs: String(cells.obs ?? "").trim(),
  };

  if (nome.length < 2) row.error = "Nome inválido";
  else if (telefone && !isValidPhone(telefone)) row.error = "Telefone inválido";

  return row;
}

function mapHeaderKeys(headerRow: unknown[]): (string | null)[] {
  return headerRow.map((h) => {
    const key = HEADER_ALIASES[normalizeHeader(h)];
    return key ?? null;
  });
}

function rowsFromMatrix(matrix: unknown[][]): ParsedImportDoc[] {
  if (matrix.length === 0) return [];

  const mapped = mapHeaderKeys(matrix[0]);
  const hasHeaders = mapped.some(Boolean);
  const start = hasHeaders ? 1 : 0;
  const results: ParsedImportDoc[] = [];

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
      cells.nome = row[0];
      cells.telefone = row[1];
      cells.construtora = row[2];
      cells.empreendimento = row[3];
      cells.fonte = row[4];
      cells.status1 = row[5];
      cells.status2 = row[6];
      cells.corretor = row[7];
      cells.gerente = row[8];
      cells.dataAnalise = row[9];
      cells.dataVenda = row[10];
      cells.vgv = row[11];
      cells.obs = row[12];
    }

    if (!cells.telefone) {
      for (const cell of row) {
        const formatted = formatPhone(String(cell ?? ""));
        if (isValidPhone(formatted)) {
          cells.telefone = formatted;
          break;
        }
      }
    }

    results.push(buildDocFromCells(cells));
  }

  return results;
}

function docsToRows(
  docs: Documentacao[],
  phoneByLeadId?: Record<string, string>,
): string[][] {
  return docs.map((d) => {
    const phoneRaw = phoneByLeadId?.[d.leadId] ?? "";
    return [
      d.nome || "",
      phoneRaw ? formatPhone(phoneRaw) : "",
      d.construtora?.nome ?? "",
      d.empreendimento?.nome ?? "",
      displayFonte(d.fonte),
      d.status1 || "",
      d.status2 || "",
      d.corretor?.name ?? "",
      d.gerente?.name ?? "",
      formatDayBr(d.dataAnalise),
      formatDayBr(d.dataVenda),
      d.vgv != null ? String(d.vgv) : "",
      d.obs ?? "",
    ];
  });
}

function buildDocSheet(rows: string[][]) {
  const aoa = [Array.from(DOC_IO_COLUMNS), ...rows];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      if (!cell) continue;
      const value = String(cell.v ?? "");
      cell.t = "s";
      cell.v = value;
      cell.w = value;
    }
  }
  sheet["!cols"] = DOC_IO_COLUMNS.map((h) => ({
    wch: Math.min(Math.max(h.length + 2, 14), 36),
  }));
  return sheet;
}

export function exportDocumentacoesToExcel(
  docs: Documentacao[],
  filename = "documentacao.xlsx",
  phoneByLeadId?: Record<string, string>,
) {
  const workbook = XLSX.utils.book_new();
  const sheet = buildDocSheet(docsToRows(docs, phoneByLeadId));
  XLSX.utils.book_append_sheet(workbook, sheet, "Documentação");
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

export function exportDocumentacoesToPdf(
  docs: Documentacao[],
  filename = "documentacao.pdf",
  imobiliariaNome = "Imobiliária",
) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  pdf.setFontSize(14);
  pdf.text(`Documentação — ${imobiliariaNome}`, 40, 36);
  pdf.setFontSize(9);
  pdf.setTextColor(100);
  pdf.text(
    `Exportado em ${new Date().toLocaleDateString("pt-BR")} · ${docs.length} ficha(s)`,
    40,
    52,
  );

  autoTable(pdf, {
    startY: 64,
    head: [
      [
        "Nome",
        "Construtora",
        "Empreendimento",
        "Fonte",
        "Status 1",
        "Status 2",
        "Corretor",
        "VGV",
        "Data venda",
      ],
    ],
    body: docs.map((d) => [
      d.nome,
      d.construtora?.nome ?? "—",
      d.empreendimento?.nome ?? "—",
      displayFonte(d.fonte),
      d.status1,
      d.status2,
      d.corretor?.name ?? "—",
      d.vgv != null
        ? d.vgv.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0,
          })
        : "—",
      formatDayBr(d.dataVenda) || "—",
    ]),
    styles: { fontSize: 7, cellPadding: 3 },
    headStyles: { fillColor: [7, 158, 212] },
  });

  pdf.save(filename);
}

export function downloadDocumentacaoImportTemplate() {
  const workbook = XLSX.utils.book_new();
  const sheet = buildDocSheet([
    [
      "Maria Silva",
      "(81) 98888-7777",
      "Cyrela",
      "Torre Aurora",
      "Indicação",
      "Análise",
      "Andamento",
      "Rafael Souza",
      "Juliana Costa",
      "01/08/2026",
      "",
      "850000",
      "Cliente pediu retorno na sexta",
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
    "modelo-importacao-documentacao.xlsx",
  );
}

export function parseDocumentacoesFromExcel(
  buffer: ArrayBuffer,
): ParsedImportDoc[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];
  return rowsFromMatrix(matrix);
}

async function parseDocumentacoesFromPdf(
  buffer: ArrayBuffer,
): Promise<ParsedImportDoc[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const lines: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let current = "";
    let lastY: number | null = null;
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = "transform" in item ? item.transform[5] : 0;
      if (lastY != null && Math.abs(y - lastY) > 2) {
        if (current.trim()) lines.push(current.trim());
        current = item.str;
      } else {
        current = current ? `${current} ${item.str}` : item.str;
      }
      lastY = y;
    }
    if (current.trim()) lines.push(current.trim());
  }

  const matrix: unknown[][] = lines.map((line) =>
    line.split(/\s{2,}|\t|\|/).map((c) => c.trim()),
  );
  return rowsFromMatrix(matrix);
}

export async function parseDocumentacoesFile(
  file: File,
): Promise<ParsedImportDoc[]> {
  const buffer = await file.arrayBuffer();
  const name = file.name.toLowerCase();

  if (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".csv")
  ) {
    return parseDocumentacoesFromExcel(buffer);
  }
  if (name.endsWith(".pdf")) {
    return parseDocumentacoesFromPdf(buffer);
  }
  throw new Error("Formato não suportado. Use Excel (.xlsx) ou PDF.");
}

export function dedupeImportDocs(rows: ParsedImportDoc[]): ParsedImportDoc[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = `${normalizeHeader(r.nome)}|${phoneDigits(r.telefone)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizePersonName(value: string) {
  return normalizeHeader(value);
}
