/**
 * Tipos e helpers compartilhados das telas conectadas à API.
 * Dados mock foram removidos — use a API ou o componente SemConexao.
 */

export type StageId = string;

export type ContatoTipo = "lead" | "cliente";

export type AnaliseStatus =
  "pendente" | "em_analise" | "aprovado" | "reprovado";

export interface Lead {
  id: string;
  /** lead = captação; cliente = carteira pessoal do corretor. */
  tipo: ContatoTipo;
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: "Comprar";
  cidade: string;
  bairro: string;
  /** Nome do corretor (exibição). */
  corretor: string;
  /** UUID do corretor no backend. */
  corretorId?: string | null;
  /** UUID da equipe (pool ou herdada). */
  equipeId?: string | null;
  /** Nome da equipe para exibição. */
  equipe?: string | null;
  construtoraId?: string | null;
  construtora?: { id: string; nome: string } | null;
  empreendimentoId?: string | null;
  empreendimento?: { id: string; nome: string; cidade?: string | null } | null;
  stage: StageId;
  prioridade: "Alta" | "Média" | "Baixa";
  /** Renda mensal do cliente (opcional). */
  renda: number | null;
  /** Estado civil do cliente (opcional). */
  estadoCivil: string | null;
  /** Data de cadastro (ISO). */
  createdAt?: string;
  updatedAt: string;
  tags: string[];
  /** Ficha de análise, se existir. */
  analise?: {
    id?: string;
    status: AnaliseStatus;
    parecer: string | null;
    analistaId?: string | null;
  } | null;
}

export function brl(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

/** Classes Tailwind para badge/chip de prioridade do lead. */
export function prioridadeBadgeClass(prioridade: Lead["prioridade"]): string {
  switch (prioridade) {
    case "Alta":
      return "border-transparent bg-destructive/15 text-destructive hover:bg-destructive/20";
    case "Média":
      return "border-transparent bg-warning/20 text-warning-foreground hover:bg-warning/25";
    case "Baixa":
      return "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20";
    default:
      return "border-transparent bg-secondary text-secondary-foreground";
  }
}
