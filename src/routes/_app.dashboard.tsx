import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Phone, CalendarCheck, FileText, HandshakeIcon, TrendingUp,
  DollarSign, Wallet, ArrowUp, ArrowDown, Plus, CheckSquare,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  LEADS_POR_ORIGEM, RECEITA_MES, TAREFAS,
  tarefasForCorretor, brl, type Tarefa,
} from "@/lib/mock-data";
import { getSession } from "@/lib/mock-auth";
import { canViewFinancial, canViewTeamData } from "@/lib/permissions";
import { useLeads } from "@/lib/leads-store";
import { useAgenda } from "@/lib/agenda-store";
import { useCorretores } from "@/lib/corretores-store";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FINANCIAL_CARD_LABELS = new Set([
  "Receita do mês",
  "Receita gerada",
  "Comissão prevista",
]);

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Imob CRM" }] }),
  component: Dashboard,
});

const PIE_COLORS = ["var(--color-primary)", "var(--color-destructive)"];

const ADMIN_CARDS = [
  { label: "Novos Leads", value: 47, delta: "+12%", up: true, icon: Users },
  { label: "Em Atendimento", value: 128, delta: "+4%", up: true, icon: Phone },
  { label: "Visitas Hoje", value: 9, delta: "-2", up: false, icon: CalendarCheck },
  { label: "Propostas", value: 22, delta: "+8%", up: true, icon: FileText },
  { label: "Negociações", value: 14, delta: "+3", up: true, icon: HandshakeIcon },
  { label: "Vendas do mês", value: 14, delta: "+27%", up: true, icon: TrendingUp },
  { label: "Receita do mês", value: brl(720000), delta: "+15%", up: true, icon: DollarSign },
  { label: "Comissão prevista", value: brl(108000), delta: "+9%", up: true, icon: Wallet },
];

const FUNIL_CONV = [
  { etapa: "Lead", total: 240 },
  { etapa: "Contato", total: 180 },
  { etapa: "Qualif.", total: 132 },
  { etapa: "Visita", total: 86 },
  { etapa: "Proposta", total: 48 },
  { etapa: "Venda", total: 22 },
];

const VENDAS_CORRETOR = [
  { nome: "Marina", vendas: 4 },
  { nome: "Sofia", vendas: 3 },
  { nome: "Pedro", vendas: 2 },
  { nome: "Diego", vendas: 1 },
  { nome: "Laura", vendas: 2 },
];

const GANHOS = [
  { name: "Ganhos", value: 22 },
  { name: "Perdidos", value: 8 },
];

function Dashboard() {
  const user = getSession();
  const canSeeTeam = user ? canViewTeamData(user.role) : false;
  const isCorretor = !canSeeTeam;
  const showFinancial = user ? canViewFinancial(user.role) || isCorretor : false;
  const nome = user?.name ?? "";
  const { leads: allLeads } = useLeads();
  const { events } = useAgenda();
  const { corretores } = useCorretores();

  const myLeads = isCorretor ? allLeads.filter((l) => l.corretor === nome) : allLeads;
  const myAgenda = isCorretor ? events.filter((e) => e.corretor === nome) : events;
  const myCorretor = isCorretor ? corretores.find((c) => c.nome === nome) : null;

  const [tarefas, setTarefas] = useState<Tarefa[]>(() =>
    isCorretor && nome ? tarefasForCorretor(nome) : [...TAREFAS],
  );
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    titulo: "",
    lead: "",
    prioridade: "Média" as Tarefa["prioridade"],
    prazo: "Hoje 15:00",
  });

  const leadOptions = myLeads.map((l) => l.nome);
  const responsaveis = isCorretor
    ? [nome]
    : corretores.filter((c) => c.status === "Ativo").map((c) => c.nome);
  const [taskResponsavel, setTaskResponsavel] = useState(nome || responsaveis[0] || "");

  function openNewTask() {
    setTaskForm({
      titulo: "",
      lead: leadOptions[0] ?? "",
      prioridade: "Média",
      prazo: "Hoje 15:00",
    });
    setTaskResponsavel(isCorretor ? nome : responsaveis[0] ?? "");
    setTaskOpen(true);
  }

  function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    const titulo = taskForm.titulo.trim();
    if (!titulo) {
      toast.error("Informe o título da tarefa.");
      return;
    }

    const nova: Tarefa = {
      id: `T${Date.now()}`,
      titulo,
      responsavel: isCorretor ? nome : taskResponsavel,
      prioridade: taskForm.prioridade,
      status: "Aberta",
      prazo: taskForm.prazo.trim() || "Hoje",
      lead: taskForm.lead.trim() || "—",
    };

    setTarefas((prev) => [nova, ...prev]);
    setTaskOpen(false);
    toast.success("Tarefa adicionada ao dia.");
  }

  const allCards = isCorretor
    ? [
        { label: "Meus leads", value: myLeads.length, delta: "ativos", up: true, icon: Users },
        {
          label: "Em atendimento",
          value: myLeads.filter((l) => !["venda", "perdido", "novo"].includes(l.stage)).length,
          delta: "no funil",
          up: true,
          icon: Phone,
        },
        {
          label: "Visitas hoje",
          value: myAgenda.filter((a) => a.dia === "Hoje" && a.tipo === "Visita").length,
          delta: "agendadas",
          up: true,
          icon: CalendarCheck,
        },
        {
          label: "Propostas",
          value: myLeads.filter((l) => l.stage === "proposta" || l.stage === "negociacao").length,
          delta: "em andamento",
          up: true,
          icon: FileText,
        },
        {
          label: "Negociações",
          value: myLeads.filter((l) => l.stage === "negociacao").length,
          delta: "ativas",
          up: true,
          icon: HandshakeIcon,
        },
        {
          label: "Vendas do mês",
          value: myCorretor?.vendas ?? myLeads.filter((l) => l.stage === "venda").length,
          delta: "suas",
          up: true,
          icon: TrendingUp,
        },
        {
          label: "Receita gerada",
          value: brl(
            myCorretor?.valorVendido ??
              myLeads.filter((l) => l.stage === "venda").reduce((s, l) => s + l.valor, 0),
          ),
          delta: "no mês",
          up: true,
          icon: DollarSign,
        },
        {
          label: "Comissão prevista",
          value: brl(Math.round((myCorretor?.valorVendido ?? 0) * 0.03)),
          delta: "estimada",
          up: true,
          icon: Wallet,
        },
      ]
    : ADMIN_CARDS;

  const cards = showFinancial
    ? allCards
    : allCards.filter((c) => !FINANCIAL_CARD_LABELS.has(c.label));

  const leadsOrigem = isCorretor
    ? Object.entries(
        myLeads.reduce<Record<string, number>>((acc, l) => {
          acc[l.origem] = (acc[l.origem] ?? 0) + 1;
          return acc;
        }, {}),
      ).map(([origem, total]) => ({ origem, total }))
    : LEADS_POR_ORIGEM;

  const funilConv = isCorretor
    ? [
        { etapa: "Lead", total: myLeads.length },
        { etapa: "Contato", total: myLeads.filter((l) => ["contato", "qualificacao", "visita-agendada", "visita-realizada", "proposta", "negociacao", "contrato", "venda"].includes(l.stage)).length },
        { etapa: "Qualif.", total: myLeads.filter((l) => ["qualificacao", "visita-agendada", "visita-realizada", "proposta", "negociacao", "contrato", "venda"].includes(l.stage)).length },
        { etapa: "Visita", total: myLeads.filter((l) => ["visita-agendada", "visita-realizada", "proposta", "negociacao", "contrato", "venda"].includes(l.stage)).length },
        { etapa: "Proposta", total: myLeads.filter((l) => ["proposta", "negociacao", "contrato", "venda"].includes(l.stage)).length },
        { etapa: "Venda", total: myLeads.filter((l) => l.stage === "venda").length },
      ]
    : FUNIL_CONV;

  const ganhos = isCorretor
    ? [
        { name: "Ganhos", value: myLeads.filter((l) => l.stage === "venda").length },
        { name: "Perdidos", value: myLeads.filter((l) => l.stage === "perdido").length },
      ]
    : GANHOS;

  const vendasCorretor = isCorretor
    ? [{ nome: nome.split(" ")[0], vendas: myCorretor?.vendas ?? 0 }]
    : VENDAS_CORRETOR;

  const receitaMes = isCorretor
    ? RECEITA_MES.map((m) => ({
        ...m,
        receita: Math.round(m.receita * ((myCorretor?.vendas ?? 1) / 14)),
        vendas: Math.max(0, Math.round(m.vendas * ((myCorretor?.vendas ?? 1) / 14))),
      }))
    : RECEITA_MES;

  const agendaList = myAgenda;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={
          isCorretor
            ? `Visão da sua operação, ${nome.split(" ")[0]}.`
            : "Visão geral da operação de todos os corretores."
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => {
          const Icon = c.icon;
          const showTrend = typeof c.delta === "string" && (c.delta.startsWith("+") || c.delta.startsWith("-"));
          return (
            <Card key={c.label} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-xs flex items-center gap-0.5 ${c.up ? "text-success" : "text-destructive"}`}>
                    {showTrend ? (
                      <>
                        {c.up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {c.delta}
                      </>
                    ) : (
                      c.delta
                    )}
                  </span>
                </div>
                <div className="mt-3 text-2xl font-semibold">{c.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className={cn("grid gap-4 mb-6", showFinancial ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1")}>
        {showFinancial && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                {isCorretor ? "Sua receita mensal" : "Receita mensal"}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer>
                <LineChart data={receitaMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }} />
                  <Line type="monotone" dataKey="receita" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        <Card className={showFinancial ? undefined : "max-w-md"}>
          <CardHeader><CardTitle className="text-base">Ganhos x Perdidos</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={ganhos} innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                  {ganhos.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isCorretor ? "Seus leads por origem" : "Leads por origem"}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer>
              <BarChart data={leadsOrigem}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="origem" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip />
                <Bar dataKey="total" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Conversão do funil</CardTitle></CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer>
              <BarChart data={funilConv} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis type="category" dataKey="etapa" stroke="var(--color-muted-foreground)" fontSize={11} width={70} />
                <Tooltip />
                <Bar dataKey="total" fill="var(--color-chart-2)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isCorretor ? "Suas vendas" : "Vendas por corretor"}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer>
              <BarChart data={vendasCorretor}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="nome" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip />
                <Bar dataKey="vendas" fill="var(--color-chart-3)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              {isCorretor ? "Suas tarefas do dia" : "Tarefas do dia"}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={openNewTask}>
              <Plus className="w-4 h-4" />
              Nova tarefa
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {tarefas.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-6 py-3 border-t first:border-t-0">
                <div className={`w-2 h-2 rounded-full ${
                  t.prioridade === "Alta" ? "bg-destructive" : t.prioridade === "Média" ? "bg-warning" : "bg-muted-foreground"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.titulo}</div>
                  <div className="text-xs text-muted-foreground">{t.responsavel} • {t.lead}</div>
                </div>
                <Badge variant="outline" className="text-xs">{t.prazo}</Badge>
              </div>
            ))}
            {tarefas.length === 0 && (
              <div className="px-6 py-8 text-sm text-muted-foreground text-center">
                Nenhuma tarefa no momento. Adicione a primeira.
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isCorretor ? "Suas próximas visitas" : "Próximas visitas"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {agendaList.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-6 py-3 border-t first:border-t-0">
                <div className="w-10 text-center">
                  <div className="text-xs text-muted-foreground">{a.dia}</div>
                  <div className="text-sm font-semibold">{a.hora}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.titulo}</div>
                  <div className="text-xs text-muted-foreground">{a.corretor} • {a.lead}</div>
                </div>
                <Badge className="bg-primary/10 text-primary hover:bg-primary/10">{a.tipo}</Badge>
              </div>
            ))}
            {isCorretor && agendaList.length === 0 && (
              <div className="px-6 py-8 text-sm text-muted-foreground text-center">
                Nenhum evento seu na agenda.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-primary/10 via-background to-background">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div className="space-y-1 pr-6">
                <DialogTitle className="text-lg tracking-tight">Nova tarefa</DialogTitle>
                <DialogDescription>Adicione uma tarefa para o seu dia.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-titulo" className="text-xs text-muted-foreground">Título</Label>
              <Input
                id="task-titulo"
                value={taskForm.titulo}
                onChange={(e) => setTaskForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex.: Ligar para retomar contato"
                className="h-10"
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Lead relacionado</Label>
              {leadOptions.length > 0 ? (
                <Select
                  value={taskForm.lead || leadOptions[0]}
                  onValueChange={(v) => setTaskForm((f) => ({ ...f, lead: v }))}
                >
                  <SelectTrigger className="h-10"><SelectValue placeholder="Selecione o lead" /></SelectTrigger>
                  <SelectContent>
                    {leadOptions.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={taskForm.lead}
                  onChange={(e) => setTaskForm((f) => ({ ...f, lead: e.target.value }))}
                  placeholder="Nome do lead"
                  className="h-10"
                />
              )}
            </div>
            {!isCorretor && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Responsável</Label>
                <Select value={taskResponsavel} onValueChange={setTaskResponsavel}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {responsaveis.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Prioridade</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["Alta", "Média", "Baixa"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTaskForm((f) => ({ ...f, prioridade: p }))}
                      className={cn(
                        "h-9 rounded-lg border text-xs font-medium transition-colors",
                        taskForm.prioridade === p
                          ? p === "Alta"
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : p === "Média"
                              ? "border-warning/50 bg-warning/15 text-warning-foreground"
                              : "border-primary/30 bg-secondary text-secondary-foreground"
                          : "bg-background text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="task-prazo" className="text-xs text-muted-foreground">Prazo</Label>
                <Input
                  id="task-prazo"
                  value={taskForm.prazo}
                  onChange={(e) => setTaskForm((f) => ({ ...f, prazo: e.target.value }))}
                  placeholder="Hoje 15:00"
                  className="h-10"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setTaskOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Plus className="w-4 h-4" />
                Adicionar tarefa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
