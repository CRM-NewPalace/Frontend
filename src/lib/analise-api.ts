import { apiFetch } from "@/lib/api";
import type { ContatoTipo, Lead, StageId } from "@/lib/crm-types";

export type AnaliseStatus = "pendente" | "aprovado" | "reprovado";

export interface Analise {
  id: string;
  leadId: string;
  tipoContato: ContatoTipo;
  stageSituacao: StageId;
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: Lead["interesse"];
  cidade: string;
  bairro: string;
  prioridade: Lead["prioridade"];
  renda: number | null;
  tags: string[];
  temFgts: boolean;
  valorFgts: number | null;
  temEntrada: boolean;
  valorEntrada: number | null;
  temDependente: boolean;
  status: AnaliseStatus;
  parecer: string | null;
  createdAt: string;
  updatedAt: string;
  autor: { id: string; name: string };
  lead: {
    id: string;
    tipo: ContatoTipo;
    nome: string;
    stage: StageId;
    corretorId: string | null;
    corretor: { id: string; name: string; whatsapp?: string | null } | null;
  };
}

export type UpdateAnaliseInput = {
  status?: AnaliseStatus;
  parecer?: string | null;
};

export async function fetchAnalises(corretorId?: string): Promise<Analise[]> {
  const qs = new URLSearchParams();
  if (corretorId) qs.set("corretorId", corretorId);
  const query = qs.toString();
  return apiFetch<Analise[]>(`/analise${query ? `?${query}` : ""}`);
}

export async function fetchAnalise(id: string): Promise<Analise> {
  return apiFetch<Analise>(`/analise/${id}`);
}

export async function updateAnalise(
  id: string,
  input: UpdateAnaliseInput,
): Promise<Analise> {
  return apiFetch<Analise>(`/analise/${id}`, {
    method: "PATCH",
    body: input,
  });
}
