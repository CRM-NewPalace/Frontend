// Fake data for the CRM demo. All prices in BRL.
export const FUNIL_STAGES = [
  { id: "novo", name: "Novo Lead", color: "bg-slate-200 text-slate-700" },
  { id: "contato", name: "Primeiro Contato", color: "bg-blue-100 text-blue-700" },
  { id: "qualificacao", name: "Qualificação", color: "bg-indigo-100 text-indigo-700" },
  { id: "visita-agendada", name: "Visita Agendada", color: "bg-cyan-100 text-cyan-700" },
  { id: "visita-realizada", name: "Visita Realizada", color: "bg-teal-100 text-teal-700" },
  { id: "proposta", name: "Proposta", color: "bg-amber-100 text-amber-700" },
  { id: "negociacao", name: "Negociação", color: "bg-orange-100 text-orange-700" },
  { id: "contrato", name: "Contrato", color: "bg-emerald-100 text-emerald-700" },
  { id: "venda", name: "Venda", color: "bg-green-200 text-green-800" },
  { id: "perdido", name: "Perdido", color: "bg-red-100 text-red-700" },
] as const;

export type StageId = (typeof FUNIL_STAGES)[number]["id"];

export interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: "Comprar" | "Alugar" | "Investir";
  faixa: string;
  cidade: string;
  bairro: string;
  corretor: string;
  stage: StageId;
  prioridade: "Alta" | "Média" | "Baixa";
  valor: number;
  updatedAt: string;
  tags: string[];
}

const nomes = [
  "João Pereira", "Maria Oliveira", "Ricardo Santos", "Beatriz Costa",
  "Fernando Lima", "Camila Rocha", "Rafael Mendes", "Juliana Dias",
  "Paulo Ribeiro", "Larissa Nunes", "Eduardo Barros", "Patrícia Alves",
  "Lucas Ferreira", "Aline Martins", "Roberto Cunha", "Isabela Melo",
  "Gustavo Andrade", "Renata Faria", "Diego Cardoso", "Bruna Teixeira",
];
const origens = ["Site", "Facebook Ads", "Google Ads", "Indicação", "OLX", "Portal Zap", "WhatsApp", "Instagram"];
const corretores = ["Marina Alves", "Pedro Henrique", "Sofia Ramos", "Diego Cardoso", "Laura Prado"];
const bairros = ["Jardim Europa", "Vila Mariana", "Moema", "Pinheiros", "Itaim Bibi", "Centro", "Perdizes"];
const stages: StageId[] = FUNIL_STAGES.map((s) => s.id);

export const LEADS: Lead[] = nomes.map((n, i) => ({
  id: `L${1000 + i}`,
  nome: n,
  telefone: `(11) 9${String(80000000 + i * 1234).slice(0, 8)}`,
  email: n.toLowerCase().replace(" ", ".") + "@email.com",
  origem: origens[i % origens.length],
  interesse: (["Comprar", "Alugar", "Investir"] as const)[i % 3],
  faixa: ["R$ 300k - 500k", "R$ 500k - 800k", "R$ 800k - 1.2M", "R$ 1.2M+"][i % 4],
  cidade: "São Paulo",
  bairro: bairros[i % bairros.length],
  corretor: corretores[i % corretores.length],
  stage: stages[i % stages.length],
  prioridade: (["Alta", "Média", "Baixa"] as const)[i % 3],
  valor: 350000 + (i % 8) * 120000,
  updatedAt: `${(i % 28) + 1}/07/2026`,
  tags: [["Quente"], ["Retorno"], ["VIP"], []][i % 4],
}));

export interface Imovel {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  finalidade: "Venda" | "Locação";
  valor: number;
  cidade: string;
  bairro: string;
  area: number;
  quartos: number;
  banheiros: number;
  garagem: number;
  status: "Disponível" | "Reservado" | "Vendido" | "Alugado";
}

export const IMOVEIS: Imovel[] = Array.from({ length: 14 }).map((_, i) => ({
  id: `IM${i + 1}`,
  codigo: `IM-${2000 + i}`,
  titulo: [
    "Apartamento 3 dorm com varanda gourmet",
    "Cobertura duplex vista parque",
    "Casa térrea em condomínio fechado",
    "Studio mobiliado próximo ao metrô",
    "Sobrado 4 suítes alto padrão",
  ][i % 5],
  tipo: ["Apartamento", "Casa", "Cobertura", "Studio", "Sobrado"][i % 5],
  finalidade: i % 3 === 0 ? "Locação" : "Venda",
  valor: i % 3 === 0 ? 3500 + i * 400 : 450000 + i * 90000,
  cidade: "São Paulo",
  bairro: bairros[i % bairros.length],
  area: 55 + i * 12,
  quartos: 1 + (i % 4),
  banheiros: 1 + (i % 3),
  garagem: i % 3,
  status: (["Disponível", "Disponível", "Reservado", "Vendido", "Alugado"] as const)[i % 5],
}));

export interface Corretor {
  id: string;
  nome: string;
  creci: string;
  telefone: string;
  email: string;
  equipe: string;
  /** Meta mensal definida pelo gerente/admin */
  meta: number;
  /** Meta pessoal definida pelo próprio corretor */
  metaPessoal: number;
  vendas: number;
  leads: number;
  valorVendido: number;
  status: "Ativo" | "Inativo";
  /** Data de cadastro (YYYY-MM-DD) */
  criadoEm: string;
}

export const CORRETORES: Corretor[] = [
  { id: "c1", nome: "Marina Alves", creci: "CRECI 45678-F", telefone: "(11) 98123-4567", email: "marina@imob.com", equipe: "Time Norte", meta: 3, metaPessoal: 4, vendas: 4, leads: 28, valorVendido: 2450000, status: "Ativo", criadoEm: "2025-11-12" },
  { id: "c2", nome: "Pedro Henrique", creci: "CRECI 41234-F", telefone: "(11) 97654-3210", email: "pedro@imob.com", equipe: "Time Sul", meta: 3, metaPessoal: 3, vendas: 2, leads: 22, valorVendido: 1180000, status: "Ativo", criadoEm: "2026-01-08" },
  { id: "c3", nome: "Sofia Ramos", creci: "CRECI 39876-F", telefone: "(11) 96543-2109", email: "sofia@imob.com", equipe: "Time Norte", meta: 2, metaPessoal: 3, vendas: 3, leads: 19, valorVendido: 1620000, status: "Ativo", criadoEm: "2026-03-22" },
  { id: "c4", nome: "Diego Cardoso", creci: "CRECI 38765-F", telefone: "(11) 95432-1098", email: "diego@imob.com", equipe: "Time Sul", meta: 3, metaPessoal: 2, vendas: 1, leads: 14, valorVendido: 540000, status: "Ativo", criadoEm: "2026-06-05" },
  { id: "c5", nome: "Laura Prado", creci: "CRECI 37654-F", telefone: "(11) 94321-0987", email: "laura@imob.com", equipe: "Time Centro", meta: 2, metaPessoal: 2, vendas: 2, leads: 17, valorVendido: 890000, status: "Inativo", criadoEm: "2025-09-30" },
];

export interface Proposta {
  id: string;
  lead: string;
  imovel: string;
  valor: number;
  entrada: number;
  parcelas: number;
  status: "Rascunho" | "Enviada" | "Em análise" | "Aceita" | "Recusada";
  data: string;
}

export const PROPOSTAS: Proposta[] = [
  { id: "P001", lead: "João Pereira", imovel: "IM-2001", valor: 620000, entrada: 120000, parcelas: 360, status: "Em análise", data: "18/07/2026" },
  { id: "P002", lead: "Beatriz Costa", imovel: "IM-2003", valor: 890000, entrada: 200000, parcelas: 300, status: "Aceita", data: "15/07/2026" },
  { id: "P003", lead: "Ricardo Santos", imovel: "IM-2007", valor: 1250000, entrada: 400000, parcelas: 240, status: "Enviada", data: "20/07/2026" },
  { id: "P004", lead: "Camila Rocha", imovel: "IM-2004", valor: 450000, entrada: 90000, parcelas: 360, status: "Recusada", data: "10/07/2026" },
  { id: "P005", lead: "Fernando Lima", imovel: "IM-2009", valor: 780000, entrada: 180000, parcelas: 300, status: "Rascunho", data: "21/07/2026" },
];

export interface Tarefa {
  id: string;
  titulo: string;
  responsavel: string;
  prioridade: "Alta" | "Média" | "Baixa";
  status: "Aberta" | "Em andamento" | "Concluída";
  prazo: string;
  lead: string;
}

export const TAREFAS: Tarefa[] = [
  { id: "T1", titulo: "Ligar para retomar contato", responsavel: "Marina Alves", prioridade: "Alta", status: "Aberta", prazo: "Hoje 15:00", lead: "João Pereira" },
  { id: "T2", titulo: "Enviar contrato para assinatura", responsavel: "Pedro Henrique", prioridade: "Alta", status: "Em andamento", prazo: "Hoje 17:30", lead: "Beatriz Costa" },
  { id: "T3", titulo: "Preparar documentação de visita", responsavel: "Sofia Ramos", prioridade: "Média", status: "Aberta", prazo: "Amanhã 10:00", lead: "Ricardo Santos" },
  { id: "T4", titulo: "Follow-up proposta", responsavel: "Marina Alves", prioridade: "Média", status: "Aberta", prazo: "23/07 09:00", lead: "Camila Rocha" },
  { id: "T5", titulo: "Confirmar visita ao imóvel IM-2009", responsavel: "Diego Cardoso", prioridade: "Baixa", status: "Concluída", prazo: "20/07", lead: "Fernando Lima" },
];

export interface AgendaEvento {
  id: string;
  titulo: string;
  tipo: "Visita" | "Reunião" | "Ligação" | "Assinatura";
  hora: string;
  dia: string;
  corretor: string;
  lead: string;
}

export const AGENDA: AgendaEvento[] = [
  { id: "A1", titulo: "Visita — Apto Vila Mariana", tipo: "Visita", hora: "10:00", dia: "Hoje", corretor: "Marina Alves", lead: "João Pereira" },
  { id: "A2", titulo: "Reunião de proposta", tipo: "Reunião", hora: "14:30", dia: "Hoje", corretor: "Pedro Henrique", lead: "Beatriz Costa" },
  { id: "A3", titulo: "Assinatura de contrato", tipo: "Assinatura", hora: "17:00", dia: "Hoje", corretor: "Marina Alves", lead: "Beatriz Costa" },
  { id: "A4", titulo: "Visita cobertura Moema", tipo: "Visita", hora: "09:00", dia: "Amanhã", corretor: "Sofia Ramos", lead: "Ricardo Santos" },
  { id: "A5", titulo: "Ligação de retomada", tipo: "Ligação", hora: "11:30", dia: "Amanhã", corretor: "Diego Cardoso", lead: "Fernando Lima" },
];

export const RECEITA_MES = [
  { mes: "Jan", receita: 320, vendas: 6 },
  { mes: "Fev", receita: 410, vendas: 8 },
  { mes: "Mar", receita: 380, vendas: 7 },
  { mes: "Abr", receita: 520, vendas: 10 },
  { mes: "Mai", receita: 610, vendas: 12 },
  { mes: "Jun", receita: 580, vendas: 11 },
  { mes: "Jul", receita: 720, vendas: 14 },
];

export const LEADS_POR_ORIGEM = [
  { origem: "Site", total: 42 },
  { origem: "Facebook", total: 31 },
  { origem: "Google", total: 55 },
  { origem: "Indicação", total: 18 },
  { origem: "Portais", total: 27 },
  { origem: "WhatsApp", total: 12 },
];

export const FINANCEIRO = {
  receitas: 720000,
  despesas: 185000,
  saldo: 535000,
  comissoes: 108000,
  aReceber: 240000,
  aPagar: 62000,
};

export function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function leadsForCorretor(corretorNome: string) {
  return LEADS.filter((l) => l.corretor === corretorNome);
}

export function agendaForCorretor(corretorNome: string) {
  return AGENDA.filter((a) => a.corretor === corretorNome);
}

export function tarefasForCorretor(corretorNome: string) {
  return TAREFAS.filter((t) => t.responsavel === corretorNome);
}
