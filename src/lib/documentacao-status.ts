/** Remove acentos, caixa e caracteres não alfanuméricos. */
export function normalizeDocStatus(
  status: string | null | undefined,
): string {
  if (!status) return "";
  return status
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export type DocStatus1Group =
  | "aprovado"
  | "reprovado"
  | "pre_analise"
  | "analise";
export type DocStatus2Group = "vendido" | "andamento" | "bacen";

export function status1Group(
  status: string | null | undefined,
): DocStatus1Group | null {
  const n = normalizeDocStatus(status);
  if (!n) return null;
  if (n.startsWith("reprov")) return "reprovado";
  if (
    n === "aprovado" ||
    n === "aprovada" ||
    n === "aprovados" ||
    n === "aprovadas"
  ) {
    return "aprovado";
  }
  // Antes de "analise": "preanalise" contém a substring "analise".
  if (
    n.startsWith("preanalise") ||
    n.includes("preanalise") ||
    n === "preanalise"
  ) {
    return "pre_analise";
  }
  if (n.includes("analise")) return "analise";
  return null;
}

export function status2Group(
  status: string | null | undefined,
): DocStatus2Group | null {
  const n = normalizeDocStatus(status);
  if (!n) return null;
  if (
    n === "vendido" ||
    n === "venda" ||
    n === "vendidos" ||
    n === "vendida" ||
    n === "vendidas" ||
    n.startsWith("vendid")
  ) {
    return "vendido";
  }
  if (n.includes("andamento")) return "andamento";
  if (n.includes("bacen")) return "bacen";
  return null;
}

export function isStatusVendido(
  status: string | null | undefined,
): boolean {
  return status2Group(status) === "vendido";
}

export function isStatusAnalise(
  status: string | null | undefined,
): boolean {
  const g = status1Group(status);
  return g === "analise" || g === "pre_analise";
}

export function isStatusPreAnalise(
  status: string | null | undefined,
): boolean {
  return status1Group(status) === "pre_analise";
}

/** Parecer final do Status 1 (aprovado ou reprovado). */
export function isStatusParecerFinal(
  status: string | null | undefined,
): boolean {
  const g = status1Group(status);
  return g === "aprovado" || g === "reprovado";
}

/** Status 1 de documentação aprovado (inclui "Aprovado c/ restrição"). */
export function isStatusAprovadoDoc(
  status: string | null | undefined,
): boolean {
  if (!status) return false;
  const raw = status
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return raw.startsWith("aprov");
}

/** Compara status considerando variantes semânticas (VENDIDO/venda, etc.). */
export function statusesMatch(a: string, b: string): boolean {
  const na = normalizeDocStatus(a);
  const nb = normalizeDocStatus(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const g1a = status1Group(a);
  const g1b = status1Group(b);
  if (g1a && g1b && g1a === g1b) return true;
  const g2a = status2Group(a);
  const g2b = status2Group(b);
  if (g2a && g2b && g2a === g2b) return true;
  return false;
}

export function canonicalizeStatus1(status: string): string {
  const g = status1Group(status);
  if (g === "aprovado") return "Aprovado";
  if (g === "reprovado") return "Reprovado";
  if (g === "pre_analise") return "Pré-análise";
  if (g === "analise") return "Em análise";
  return status.trim();
}

export function canonicalizeStatus2(status: string): string {
  const g = status2Group(status);
  if (g === "vendido") return "Vendido";
  if (g === "andamento") return "Andamento";
  if (g === "bacen") return "Bacen";
  return status.trim();
}

const STATUS1_PREFERRED: Record<DocStatus1Group, string> = {
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  pre_analise: "Pré-análise",
  analise: "Em análise",
};

const STATUS2_PREFERRED: Record<DocStatus2Group, string> = {
  vendido: "Vendido",
  andamento: "Andamento",
  bacen: "Bacen",
};

/** Deduplica opções de filtro/form, preferindo labels canônicos. */
export function dedupeStatusOptions(
  labels: string[],
  kind: "status1" | "status2",
): string[] {
  const byKey = new Map<string, string>();
  for (const label of labels) {
    if (!label?.trim()) continue;
    if (kind === "status1") {
      const group = status1Group(label);
      const key = group ?? normalizeDocStatus(label);
      byKey.set(key, group ? STATUS1_PREFERRED[group] : label.trim());
    } else {
      const group = status2Group(label);
      const key = group ?? normalizeDocStatus(label);
      byKey.set(key, group ? STATUS2_PREFERRED[group] : label.trim());
    }
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
