/**
 * Tipos e helpers compartilhados das telas conectadas à API.
 * Dados mock foram removidos — use a API ou o componente SemConexao.
 */

export type StageId = string;

export type ContatoTipo = "lead" | "cliente";

export type AnaliseStatus = "pendente" | "aprovado" | "reprovado";

export interface Lead {
  id: string;
  /** lead = captação; cliente = carteira pessoal do corretor. */
  tipo: ContatoTipo;
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: "Comprar" | "Alugar" | "Investir";
  cidade: string;
  bairro: string;
  /** Nome do corretor (exibição). */
  corretor: string;
  /** UUID do corretor no backend. */
  corretorId?: string | null;
  stage: StageId;
  prioridade: "Alta" | "Média" | "Baixa";
  /** Renda mensal do cliente (opcional). */
  renda: number | null;
  updatedAt: string;
  tags: string[];
  /** Ficha de análise, se existir. */
  analise?: { status: AnaliseStatus; parecer: string | null } | null;
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

