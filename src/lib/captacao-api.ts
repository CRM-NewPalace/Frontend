import { apiFetch } from "@/lib/api";

export type PessoaTipo = "fisica" | "juridica";

export type CaptacaoImovelTipo =
  | "apartamento"
  | "casa"
  | "terreno"
  | "sala_comercial"
  | "loja"
  | "galpao"
  | "fazenda"
  | "chacara"
  | "outro";

export const CAPTACAO_IMOVEL_TIPOS: CaptacaoImovelTipo[] = [
  "apartamento",
  "casa",
  "terreno",
  "sala_comercial",
  "loja",
  "galpao",
  "fazenda",
  "chacara",
  "outro",
];

export const CAPTACAO_IMOVEL_TIPO_LABEL: Record<CaptacaoImovelTipo, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  terreno: "Terreno",
  sala_comercial: "Sala comercial",
  loja: "Loja",
  galpao: "Galpão",
  fazenda: "Fazenda",
  chacara: "Chácara",
  outro: "Outro",
};

export const CAPTACAO_ORIGENS_PADRAO = [
  "indicação",
  "site",
  "instagram",
  "facebook",
  "portal",
  "telefone",
  "whatsapp",
  "prospecção",
  "cliente existente",
  "outro",
];

export type Proprietario = {
  id: string;
  nome: string;
  tipoPessoa: PessoaTipo;
  cpfCnpj: string;
  telefone: string;
  email: string;
  observacoes: string;
  createdAt: string;
  updatedAt: string;
  _count?: { imoveis: number; captacoes: number };
  imoveis?: Imovel[];
};

export type Imovel = {
  id: string;
  proprietarioId: string;
  tipo: CaptacaoImovelTipo;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  area: number | null;
  areaConstruida: number | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  observacoes: string;
  titulo: string;
  valor: number | null;
  captacao: { id: string; etapa: string | null } | null;
  proprietario?: { id: string; nome: string; telefone?: string; email?: string };
  captacoes?: Array<{
    id: string;
    funilEtapa?: { id: string; label: string };
    responsavel?: { id: string; name: string };
  }>;
};

export type CaptacaoHistorico = {
  id: string;
  tipo: string;
  texto: string;
  createdAt: string;
  autor?: { id: string; name: string } | null;
};

export type Captacao = {
  id: string;
  proprietarioId: string;
  imovelId: string;
  responsavelId: string;
  origem: string;
  exclusividade: boolean;
  valorPretendido: number | null;
  valorAvaliacao: number | null;
  funilId: string;
  funilEtapaId: string;
  createdAt: string;
  updatedAt: string;
  proprietario: { id: string; nome: string; telefone?: string; email?: string };
  imovel: Imovel;
  responsavel: { id: string; name: string; email?: string };
  funil: { id: string; name: string; tipo: string };
  funilEtapa: {
    id: string;
    label: string;
    slug: string;
    color: string;
    papel: string | null;
  };
  historicos?: CaptacaoHistorico[];
};

export type CaptacaoResumo = {
  proprietarios: number;
  imoveis: number;
  captacoes: number;
  captacoesAtivas: number;
  imoveisCaptados: number;
  porEtapa: Array<{
    funilEtapaId: string;
    label: string;
    papel: string | null;
    color: string | null;
    total: number;
  }>;
};

export type CaptacaoResponsavel = {
  id: string;
  name: string;
  email: string;
  role: string;
};

function qs(params?: Record<string, string | boolean | undefined>) {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const raw = search.toString();
  return raw ? `?${raw}` : "";
}

export function fetchProprietarios(params?: { search?: string }) {
  return apiFetch<Proprietario[]>(
    `/captacao/proprietarios${qs({ search: params?.search })}`,
  );
}

export function fetchProprietario(id: string) {
  return apiFetch<Proprietario>(`/captacao/proprietarios/${id}`);
}

export function createProprietario(body: {
  nome: string;
  tipoPessoa?: PessoaTipo;
  cpfCnpj?: string;
  telefone?: string;
  email?: string;
  observacoes?: string;
}) {
  return apiFetch<Proprietario>("/captacao/proprietarios", {
    method: "POST",
    body,
  });
}

export function updateProprietario(
  id: string,
  body: Partial<{
    nome: string;
    tipoPessoa: PessoaTipo;
    cpfCnpj: string;
    telefone: string;
    email: string;
    observacoes: string;
  }>,
) {
  return apiFetch<Proprietario>(`/captacao/proprietarios/${id}`, {
    method: "PATCH",
    body,
  });
}

export function fetchCaptacaoImoveis(params?: {
  proprietarioId?: string;
  tipo?: string;
  cidade?: string;
  search?: string;
}) {
  return apiFetch<Imovel[]>(`/captacao/imoveis${qs(params)}`);
}

export function fetchCaptacaoImovel(id: string) {
  return apiFetch<Imovel>(`/captacao/imoveis/${id}`);
}

export function createCaptacaoImovel(body: Record<string, unknown>) {
  return apiFetch<Imovel>("/captacao/imoveis", { method: "POST", body });
}

export function updateCaptacaoImovel(id: string, body: Record<string, unknown>) {
  return apiFetch<Imovel>(`/captacao/imoveis/${id}`, { method: "PATCH", body });
}

export function fetchCaptacoes(params?: Record<string, string | boolean | undefined>) {
  return apiFetch<Captacao[]>(`/captacao${qs(params)}`);
}

export function fetchCaptacao(id: string) {
  return apiFetch<Captacao>(`/captacao/${id}`);
}

export function createCaptacao(body: Record<string, unknown>) {
  return apiFetch<Captacao>("/captacao", { method: "POST", body });
}

export function updateCaptacao(id: string, body: Record<string, unknown>) {
  return apiFetch<Captacao>(`/captacao/${id}`, { method: "PATCH", body });
}

export function fetchCaptacaoResumo() {
  return apiFetch<CaptacaoResumo>("/captacao/resumo");
}

export function fetchCaptacaoResponsaveis() {
  return apiFetch<CaptacaoResponsavel[]>("/captacao/responsaveis");
}

export function formatBrl(value: number | null | undefined) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
