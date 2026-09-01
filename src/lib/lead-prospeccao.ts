export type LeadProspeccao = {
  endereco?: string | null;
  instagram?: string | null;
  site?: string | null;
  linkedin?: string | null;
  atuacao?: string | null;
  lancamentos?: string | null;
  usados?: string | null;
  locacao?: string | null;
  administracao?: string | null;
  crmIdentificado?: string | null;
  tecnologia?: string | null;
  sinais?: string | null;
  quemAbordar?: string | null;
  produtoIndicado?: string | null;
  fit?: number | null;
  motivoFit?: string | null;
};

export const EMPTY_PROSPECCAO: LeadProspeccao = {
  endereco: "",
  instagram: "",
  site: "",
  linkedin: "",
  atuacao: "",
  lancamentos: "",
  usados: "",
  locacao: "",
  administracao: "",
  crmIdentificado: "",
  tecnologia: "",
  sinais: "",
  quemAbordar: "",
  produtoIndicado: "",
  fit: null,
  motivoFit: "",
};

export const PROSPECCAO_SIM_NAO = [
  "Sim",
  "Não",
  "Não identificado",
  "Não identificado publicamente",
] as const;

export function hasProspeccao(value?: LeadProspeccao | null): boolean {
  if (!value) return false;
  return Object.values(value).some((v) => v != null && String(v).trim() !== "");
}

export function compactProspeccao(
  value?: LeadProspeccao | null,
): LeadProspeccao | undefined {
  if (!value) return undefined;
  const out: LeadProspeccao = {};
  (Object.keys(value) as Array<keyof LeadProspeccao>).forEach((key) => {
    const raw = value[key];
    if (raw == null || raw === "") return;
    if (typeof raw === "number") {
      if (Number.isFinite(raw)) out[key] = raw as never;
      return;
    }
    const text = String(raw).trim();
    if (text) (out[key] as string) = text;
  });
  return hasProspeccao(out) ? out : undefined;
}
