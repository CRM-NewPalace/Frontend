import { apiFetch } from "@/lib/api";
import type { CaptacaoImovelTipo, Imovel } from "@/lib/captacao-api";
import { formatBrl } from "@/lib/captacao-api";

export type VendaUsadoStatus =
  | "disponivel"
  | "reservado"
  | "vendido"
  | "indisponivel";

export type InteresseUsadoStatus =
  | "novo"
  | "em_contato"
  | "interessado"
  | "sem_interesse"
  | "descartado";

export const VENDA_STATUS_LABEL: Record<VendaUsadoStatus, string> = {
  disponivel: "Disponível",
  reservado: "Reservado",
  vendido: "Vendido",
  indisponivel: "Indisponível",
};

export const INTERESSE_STATUS_LABEL: Record<InteresseUsadoStatus, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  interessado: "Interessado",
  sem_interesse: "Sem interesse",
  descartado: "Descartado",
};

export type InteressadoUsado = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  observacoes: string;
  tipoDesejado: CaptacaoImovelTipo | null;
  cidade: string;
  bairros: string;
  precoMin: number | null;
  precoMax: number | null;
  quartosMin: number | null;
  banheirosMin: number | null;
  vagasMin: number | null;
  areaMin: number | null;
};

export type VendaUsadoVinculo = {
  id: string;
  interesse: InteresseUsadoStatus;
  observacoes: string;
  interessado: InteressadoUsado;
};

export type VendaUsado = {
  id: string;
  status: VendaUsadoStatus;
  precoVenda: number | null;
  dataDisponibilizacao: string;
  observacoes: string;
  imovel: Imovel & { proprietario?: { id: string; nome: string } };
  responsavel: { id: string; name: string };
  funil: { id: string; name: string };
  funilEtapa: { id: string; label: string };
  _count?: { vinculos: number };
  vinculos?: VendaUsadoVinculo[];
  historicos?: Array<{
    id: string;
    texto: string;
    createdAt: string;
    autor?: { name: string } | null;
  }>;
};

function qs(params?: Record<string, string | undefined>) {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) search.set(k, v);
  }
  const raw = search.toString();
  return raw ? `?${raw}` : "";
}

export function fetchVendasUsado(params?: Record<string, string | undefined>) {
  return apiFetch<VendaUsado[]>(`/imoveis-usados${qs(params)}`);
}

export function fetchVendaUsado(id: string) {
  return apiFetch<VendaUsado>(`/imoveis-usados/${id}`);
}

export function createVendaUsado(body: Record<string, unknown>) {
  return apiFetch<VendaUsado>("/imoveis-usados", { method: "POST", body });
}

export function updateVendaUsado(id: string, body: Record<string, unknown>) {
  return apiFetch<VendaUsado>(`/imoveis-usados/${id}`, { method: "PATCH", body });
}

export function fetchUsadosResumo() {
  return apiFetch<{
    disponiveis: number;
    reservados: number;
    vendidos: number;
    interessados: number;
  }>("/imoveis-usados/resumo");
}

export function fetchUsadosResponsaveis() {
  return apiFetch<Array<{ id: string; name: string }>>(
    "/imoveis-usados/responsaveis",
  );
}

export function fetchImoveisCaptados() {
  return apiFetch<Array<Imovel & { precoSugerido: number | null }>>(
    "/imoveis-usados/imoveis-captados",
  );
}

export function fetchInteressadosUsado() {
  return apiFetch<InteressadoUsado[]>("/imoveis-usados/interessados");
}

export function createInteressadoUsado(body: Record<string, unknown>) {
  return apiFetch<InteressadoUsado>("/imoveis-usados/interessados", {
    method: "POST",
    body,
  });
}

export function fetchMatching(vendaId: string) {
  return apiFetch<InteressadoUsado[]>(`/imoveis-usados/${vendaId}/matching`);
}

export function fetchVinculos(vendaId: string) {
  return apiFetch<VendaUsadoVinculo[]>(
    `/imoveis-usados/${vendaId}/interessados`,
  );
}

export function vincularInteressado(
  vendaId: string,
  body: { interessadoId: string },
) {
  return apiFetch<VendaUsado>(`/imoveis-usados/${vendaId}/interessados`, {
    method: "POST",
    body,
  });
}

export function updateVinculo(
  vendaId: string,
  vinculoId: string,
  body: { interesse?: InteresseUsadoStatus; observacoes?: string },
) {
  return apiFetch<VendaUsado>(
    `/imoveis-usados/${vendaId}/interessados/${vinculoId}`,
    { method: "PATCH", body },
  );
}

export function removerVinculo(vendaId: string, vinculoId: string) {
  return apiFetch<VendaUsado>(
    `/imoveis-usados/${vendaId}/interessados/${vinculoId}`,
    { method: "DELETE" },
  );
}

export { formatBrl };
