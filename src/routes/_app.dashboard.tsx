import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PageHeader } from "@/components/app-shell";
import { EvolucaoBadge, FinanceKpiCard } from "@/components/finance-kpi-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { canAccessRoute, isCorretorLike } from "@/lib/permissions";
import { hasUserModule } from "@/lib/user-permissions";
import { catalogColorToChartHex } from "@/lib/catalog-colors";
import { useCatalog, type FunnelStage } from "@/lib/catalog-store";
import {
  fetchDashboardAdmin,
  fetchDashboardCorretor,
  type DashboardAdmin,
  type DashboardCorretor,
} from "@/lib/dashboard-api";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Banknote,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileCheck2,
  Goal,
  Loader2,
  Percent,
  TrendingUp,
  UserRound,
  UserX,
  UsersRound,
  Wallet,
  XCircle,
} from "lucide-react";
import { SemConexao } from "@/components/sem-conexao";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { SOFT_BTN } from "@/lib/soft-btn";
import { cn } from "@/lib/utils";

const chartConfig = {
  total: { label: "Leads", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

function buildFunnelChartData(
  funil: { etapa: string; total: number }[],
  funnelStages: FunnelStage[],
) {
  const totals = new Map(funil.map((item) => [item.etapa, item.total]));
  const known = new Set(funnelStages.map((stage) => stage.id));
  const fromFunil = funnelStages
    .filter((stage) => stage.papel !== "perdido")
    .map((stage) => ({
      etapa: stage.name,
      total: totals.get(stage.id) ?? 0,
      fill: catalogColorToChartHex(stage.color),
    }))
    .filter((row) => row.total > 0);
  const extras = funil
    .filter((item) => item.total > 0 && !known.has(item.etapa))
    .map((item) => ({
      etapa: item.etapa,
      total: item.total,
      fill: "hsl(var(--primary))",
    }));
  return [...fromFunil, ...extras];
}

function FunnelBarChart({
  data,
}: {
  data: { etapa: string; total: number; fill?: string }[];
}) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nenhum lead ativo no funil.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]">
      <ChartContainer
        config={chartConfig}
        className="aspect-auto! h-72 w-full min-w-120"
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 4, right: 40, top: 4, bottom: 0 }}
        >
          <CartesianGrid horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            domain={[
              0,
              (dataMax: number) => Math.max(Math.ceil(dataMax * 1.12), 1),
            ]}
          />
          <YAxis
            dataKey="etapa"
            type="category"
            width={136}
            tickLine={false}
            axisLine={false}
            interval={0}
            tick={{ fontSize: 11 }}
          />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="total" radius={4}>
            {data.map((entry, index) => (
              <Cell
                key={`${entry.etapa}-${index}`}
                fill={entry.fill ?? "hsl(var(--primary))"}
              />
            ))}
            <LabelList
              dataKey="total"
              position="right"
              className="fill-foreground"
              offset={8}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Zone Connection" }] }),
  component: Page,
});

const ANALISE_LABELS = {
  pendente: "Pendente",
  em_analise: "Em análise",
  aprovado: "Aprovada",
  reprovado: "Reprovada",
} as const;

const META_TIPO_LABEL: Record<string, string> = {
  vendas: "Vendas",
  documentacoes: "Documentações",
  vgv: "VGV",
};

const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const KPI_EMBED = "shadow-none border-border/50 bg-muted/35";

function DashboardPanel({
  title,
  description,
  action,
  children,
  className,
  guia,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  guia?: string;
}) {
  return (
    <section
      data-guia={guia}
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/50 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-module-title">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}

type PanelHref =
  | "/leads"
  | "/leads-perdidos"
  | "/clientes"
  | "/vendas"
  | "/documentacao"
  | "/financeiro/comissao"
  | "/agenda"
  | "/metas"
  | "/funil"
  | "/corretores";

function PanelLink({
  to,
  children,
}: {
  to: PanelHref;
  children: ReactNode;
}) {
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className={cn("h-8 text-xs", SOFT_BTN)}
    >
      <Link to={to}>{children}</Link>
    </Button>
  );
}

/** Ano/mês corrente no fuso de Brasília (UTC−3). */
function agoraBrasil() {
  const brasil = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return {
    ano: brasil.getUTCFullYear(),
    mes: brasil.getUTCMonth() + 1,
  };
}

function Page() {
  const user = getSession();
  const dashboardLiberado = Boolean(
    user &&
      hasUserModule(
        user.role,
        user.permissions,
        "dashboard",
        user.tenant?.plano,
      ),
  );

  if (isCorretorLike(user?.role) && !dashboardLiberado) {
    return <DashboardCorretorView />;
  }

  if (
    user?.role === "admin" ||
    user?.role === "gerente" ||
    dashboardLiberado
  ) {
    return <DashboardAdminView />;
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Painel gerencial disponível para admin e gerente."
      />
      <SemConexao
        title="Sem painel para este perfil"
        description="Peça ao administrador para liberar o módulo Dashboard nas permissões do seu usuário."
      />
    </div>
  );
}

function DashboardAdminView() {
  const user = getSession();
  const { funnelStages, origens } = useCatalog();
  const agora = useMemo(() => agoraBrasil(), []);
  const [mes, setMes] = useState(agora.mes);
  const [ano, setAno] = useState(agora.ano);
  const [origemFilter, setOrigemFilter] = useState("all");
  const [summary, setSummary] = useState<DashboardAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const isGerente = user?.role === "gerente";
  const isSolo = user?.tenant?.plano === "solo";

  const anosDisponiveis = useMemo(() => {
    const list: number[] = [];
    for (let y = agora.ano; y >= agora.ano - 5; y -= 1) list.push(y);
    return list;
  }, [agora.ano]);

  const load = useCallback(async () => {
    setLoading(true);
    setSummary(null);
    try {
      setSummary(
        await fetchDashboardAdmin({
          mes,
          ano,
          origem: origemFilter === "all" ? undefined : origemFilter,
        }),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, [mes, ano, origemFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const funnelData = useMemo(() => {
    if (!summary) return [];
    return buildFunnelChartData(summary.funil, funnelStages);
  }, [summary, funnelStages]);

  const mesLabel = useMemo(
    () =>
      new Date(Date.UTC(ano, mes - 1, 1)).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
    [mes, ano],
  );

  const filtros = (
    <div className="flex w-full flex-wrap items-end gap-2">
      <div className="min-w-28 flex-1 space-y-1 sm:flex-none">
        <Label className="text-[11px] text-muted-foreground">Mês</Label>
        <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
          <SelectTrigger className="h-9 w-full bg-background sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MESES_PT.map((nome, idx) => (
              <SelectItem key={nome} value={String(idx + 1)}>
                {nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-20 flex-1 space-y-1 sm:flex-none">
        <Label className="text-[11px] text-muted-foreground">Ano</Label>
        <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
          <SelectTrigger className="h-9 w-full bg-background sm:w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {anosDisponiveis.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-32 flex-1 space-y-1 sm:min-w-40 sm:flex-none">
        <Label className="text-[11px] text-muted-foreground">Origem</Label>
        <Select value={origemFilter} onValueChange={setOrigemFilter}>
          <SelectTrigger className="h-9 w-full bg-background sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {origens.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (loading && !summary) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          description="Visão gerencial da imobiliária."
          actions={filtros}
        />
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando indicadores…
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div>
        <PageHeader title="Dashboard" actions={filtros} />
        <SemConexao
          title="Indicadores indisponíveis"
          description="Não foi possível carregar os dados do dashboard."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        description={`Visão gerencial · ${mesLabel} · comparação com o mês anterior.`}
        actions={filtros}
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Atualizando indicadores…
        </div>
      ) : null}

      <DashboardPanel
        guia="dashboard-kpis"
        title="Entrada do mês"
        description={`Novos leads e VGV em ${mesLabel}.`}
        action={<PanelLink to="/leads">Ver leads</PanelLink>}
      >
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          <FinanceKpiCard
            label="Novos leads (mês)"
            value={summary.entradas.mes.valor}
            evolucaoPct={summary.entradas.mes.evolucaoPct}
            valorMesAnterior={summary.entradas.mes.valorMesAnterior}
            icon={TrendingUp}
            tone="teal"
            format="number"
            compact
            className={KPI_EMBED}
          />
          <FinanceKpiCard
            label="Novos hoje"
            value={summary.entradas.hoje}
            icon={UsersRound}
            tone="blue"
            format="number"
            compact
            className={KPI_EMBED}
          />
          <FinanceKpiCard
            label="Novos na semana"
            value={summary.entradas.semana}
            icon={ClipboardList}
            tone="violet"
            format="number"
            compact
            className={KPI_EMBED}
          />
          <FinanceKpiCard
            label="VGV vendido (mês)"
            value={summary.conversao.vgv.valor}
            evolucaoPct={summary.conversao.vgv.evolucaoPct}
            valorMesAnterior={summary.conversao.vgv.valorMesAnterior}
            icon={Wallet}
            tone="emerald"
            compact
            className={KPI_EMBED}
          />
        </div>
      </DashboardPanel>

      <DashboardPanel
        title="Precisa de atenção"
        description="Leads sem dono, parados e perdidos neste período."
        action={<PanelLink to="/leads">Ver leads</PanelLink>}
      >
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          <FinanceKpiCard
            label="Sem corretor atribuído"
            value={summary.atencao.semDono}
            icon={UserX}
            tone="orange"
            format="number"
            compact
            className={KPI_EMBED}
          />
          <FinanceKpiCard
            label={`Parados (${summary.atencao.diasParado}d)`}
            value={summary.atencao.parados}
            icon={AlertTriangle}
            tone="rose"
            format="number"
            compact
            className={KPI_EMBED}
          />
          <FinanceKpiCard
            label="Perdidos no mês"
            value={summary.perdidos.mes.valor}
            evolucaoPct={summary.perdidos.mes.evolucaoPct}
            valorMesAnterior={summary.perdidos.mes.valorMesAnterior}
            invertEvolucao
            icon={UserX}
            tone="red"
            format="number"
            compact
            className={KPI_EMBED}
          />
          <FinanceKpiCard
            label="Conversão (doc → venda)"
            value={summary.conversao.taxa.valor}
            evolucaoPct={summary.conversao.taxa.evolucaoPct}
            valorMesAnterior={summary.conversao.taxa.valorMesAnterior}
            icon={Goal}
            tone="teal"
            format="percent"
            compact
            className={KPI_EMBED}
          />
        </div>
      </DashboardPanel>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel
          title="Pipeline de documentação"
          description={`Processos cadastrados em ${mesLabel}.`}
          action={<PanelLink to="/documentacao">Ver documentação</PanelLink>}
        >
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <FinanceKpiCard
              label="Aprovadas"
              value={summary.documentacaoPipeline.aprovadas.valor}
              evolucaoPct={summary.documentacaoPipeline.aprovadas.evolucaoPct}
              valorMesAnterior={
                summary.documentacaoPipeline.aprovadas.valorMesAnterior
              }
              icon={CheckCircle2}
              tone="emerald"
              format="number"
              compact
              className={KPI_EMBED}
            />
            <FinanceKpiCard
              label="Reprovadas"
              value={summary.documentacaoPipeline.reprovadas.valor}
              evolucaoPct={summary.documentacaoPipeline.reprovadas.evolucaoPct}
              valorMesAnterior={
                summary.documentacaoPipeline.reprovadas.valorMesAnterior
              }
              invertEvolucao
              icon={XCircle}
              tone="red"
              format="number"
              compact
              className={KPI_EMBED}
            />
            <FinanceKpiCard
              label="Em análise"
              value={summary.documentacaoPipeline.emAnalise.valor}
              evolucaoPct={summary.documentacaoPipeline.emAnalise.evolucaoPct}
              valorMesAnterior={
                summary.documentacaoPipeline.emAnalise.valorMesAnterior
              }
              icon={Clock3}
              tone="orange"
              format="number"
              compact
              className={KPI_EMBED}
            />
          </div>
        </DashboardPanel>

        <DashboardPanel
          guia="dashboard-comissao"
          title={isGerente ? "Sua comissão do mês" : "Comissões do mês"}
          description={
            isGerente
              ? `Valor a receber nas vendas de ${mesLabel} (sua fatia de gerente).`
              : `Comissão líquida lançada nas vendas de ${mesLabel}.`
          }
          action={<PanelLink to="/financeiro/comissao">Ver comissões</PanelLink>}
        >
          <div className="grid grid-cols-2 gap-2.5">
            <FinanceKpiCard
              label={isGerente ? "A receber" : "Total líquido"}
              value={
                isGerente
                  ? summary.comissao.aReceber.valor
                  : summary.comissao.total.valor
              }
              evolucaoPct={
                isGerente
                  ? summary.comissao.aReceber.evolucaoPct
                  : summary.comissao.total.evolucaoPct
              }
              valorMesAnterior={
                isGerente
                  ? summary.comissao.aReceber.valorMesAnterior
                  : summary.comissao.total.valorMesAnterior
              }
              icon={Percent}
              tone="violet"
              compact
              className={KPI_EMBED}
            />
            <FinanceKpiCard
              label="Pendentes"
              value={summary.comissao.pendente.valor}
              evolucaoPct={summary.comissao.pendente.evolucaoPct}
              valorMesAnterior={summary.comissao.pendente.valorMesAnterior}
              icon={Clock3}
              tone="orange"
              compact
              className={KPI_EMBED}
            />
            <FinanceKpiCard
              label="Liberadas"
              value={summary.comissao.liberada.valor}
              evolucaoPct={summary.comissao.liberada.evolucaoPct}
              valorMesAnterior={summary.comissao.liberada.valorMesAnterior}
              icon={Banknote}
              tone="blue"
              compact
              className={KPI_EMBED}
            />
            <FinanceKpiCard
              label="Pagas"
              value={summary.comissao.paga.valor}
              evolucaoPct={summary.comissao.paga.evolucaoPct}
              valorMesAnterior={summary.comissao.paga.valorMesAnterior}
              icon={CheckCircle2}
              tone="emerald"
              compact
              className={KPI_EMBED}
            />
          </div>
        </DashboardPanel>
      </div>

      <section
        data-guia="dashboard-funil"
        className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]"
      >
        <DashboardPanel
          title="Funil geral"
          description="Leads ativos nas etapas do funil de vendas."
          action={<PanelLink to="/funil">Ver funil</PanelLink>}
        >
          <FunnelBarChart data={funnelData} />
        </DashboardPanel>

        <DashboardPanel
          title="Conversão do mês"
          description="% das documentações do mês que viraram venda (vs mês anterior)."
          action={<PanelLink to="/documentacao">Ver documentação</PanelLink>}
        >
          <div className="space-y-4">
            <div className="rounded-xl border bg-secondary/40 p-3 text-center sm:p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                Taxa de conversão
              </div>
              <div className="mt-1 text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                {summary.conversao.taxa.valor.toLocaleString("pt-BR", {
                  maximumFractionDigits: 1,
                })}
                %
              </div>
              <EvolucaoBadge
                value={summary.conversao.taxa.evolucaoPct}
                previous={summary.conversao.taxa.valorMesAnterior}
                className="mt-2 justify-center"
              />
              <p className="mt-2 px-1 text-xs leading-relaxed text-muted-foreground">
                {summary.conversao.vendas.valor} venda
                {summary.conversao.vendas.valor === 1 ? "" : "s"} de{" "}
                {summary.conversao.documentacoes.valor}{" "}
                {summary.conversao.documentacoes.valor === 1
                  ? "documentação"
                  : "documentações"}{" "}
                do mês
              </p>
              {summary.entradas.semana > summary.entradas.mes.valor ? (
                <p className="mt-1 px-1 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                  Nesta semana há {summary.entradas.semana} novos — parte pode
                  ser de dias do mês passado (a semana começa na segunda).
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">Documentações</div>
                  <EvolucaoBadge
                    value={summary.conversao.documentacoes.evolucaoPct}
                    previous={summary.conversao.documentacoes.valorMesAnterior}
                    className="mt-0.5"
                  />
                </div>
                <span className="shrink-0 pt-0.5 font-semibold tabular-nums">
                  {summary.conversao.documentacoes.valor}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">Viraram venda</div>
                  <EvolucaoBadge
                    value={summary.conversao.vendas.evolucaoPct}
                    previous={summary.conversao.vendas.valorMesAnterior}
                    className="mt-0.5"
                  />
                </div>
                <span className="shrink-0 pt-0.5 font-semibold tabular-nums">
                  {summary.conversao.vendas.valor}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">VGV do mês</div>
                  <EvolucaoBadge
                    value={summary.conversao.vgv.evolucaoPct}
                    previous={summary.conversao.vgv.valorMesAnterior}
                    className="mt-0.5"
                  />
                </div>
                <span className="max-w-[45%] shrink-0 break-all pt-0.5 text-right text-sm font-semibold tabular-nums">
                  {money(summary.conversao.vgv.valor)}
                </span>
              </div>
            </div>
          </div>
        </DashboardPanel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel
          title="Leads perdidos — motivos"
          description={`Motivos registrados em ${mesLabel}.`}
          action={<PanelLink to="/leads-perdidos">Ver perdidos</PanelLink>}
        >
          <div className="space-y-2">
            {summary.perdidos.motivos.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Nenhum lead perdido neste mês.
              </p>
            ) : (
              summary.perdidos.motivos.map((m) => (
                <div
                  key={m.motivo}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {m.motivo}
                    </div>
                    <EvolucaoBadge value={m.evolucaoPct} invert />
                  </div>
                  <span className="font-semibold tabular-nums">{m.valor}</span>
                </div>
              ))
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Agenda de hoje"
          description={`${summary.agenda.totalHoje} compromisso${summary.agenda.totalHoje === 1 ? "" : "s"} · ${summary.agenda.atrasados} atrasado${summary.agenda.atrasados === 1 ? "" : "s"}`}
          action={<PanelLink to="/agenda">Abrir agenda</PanelLink>}
        >
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-secondary px-2.5 py-1">
              {summary.agenda.pendentesHoje} pendente
              {summary.agenda.pendentesHoje === 1 ? "" : "s"}
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">
              {summary.agenda.concluidosHoje} concluído
              {summary.agenda.concluidosHoje === 1 ? "" : "s"}
            </span>
            <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-rose-700 dark:text-rose-300">
              {summary.agenda.atrasados} atrasado
              {summary.agenda.atrasados === 1 ? "" : "s"}
            </span>
          </div>
          {summary.agenda.itens.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Nenhum compromisso hoje.
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {summary.agenda.itens.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  {item.status === "concluido" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Clock3 className="h-4 w-4 shrink-0 text-amber-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.titulo}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.contato ?? item.tipo}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {new Date(item.startsAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>
      </section>

      {isSolo ? null : (
      <section className="grid min-w-0 gap-4 xl:grid-cols-2">
        <DashboardPanel
          title="Ranking de corretores"
          description="Ordenado por VGV do mês."
          action={<PanelLink to="/corretores">Ver corretores</PanelLink>}
        >
          {summary.ranking.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Nenhum corretor ativo.
            </p>
          ) : (
            <div className="-mx-1 overflow-x-auto overscroll-x-contain touch-pan-x">
              <table className="w-full min-w-140 text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium whitespace-nowrap">
                      Corretor
                    </th>
                    <th className="pb-2 pr-3 text-right font-medium whitespace-nowrap">
                      Leads
                    </th>
                    <th className="pb-2 pr-3 text-right font-medium whitespace-nowrap">
                      Visitas
                    </th>
                    <th className="pb-2 pr-3 text-right font-medium whitespace-nowrap">
                      Vendas
                    </th>
                    <th className="pb-2 text-right font-medium whitespace-nowrap">
                      VGV
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.ranking.slice(0, 10).map((r) => (
                    <tr
                      key={r.corretorId}
                      className="border-b last:border-0 hover:bg-muted/40"
                    >
                      <td className="max-w-48 py-2.5 pr-3">
                        <div className="truncate font-medium">{r.nome}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {r.equipe ?? "Sem equipe"}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums whitespace-nowrap">
                        {r.leads}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums whitespace-nowrap">
                        {r.visitas}
                      </td>
                      <td className="py-2.5 pr-3 text-right whitespace-nowrap">
                        <div className="font-medium tabular-nums">
                          {r.vendas.valor}
                        </div>
                        <EvolucaoBadge value={r.vendas.evolucaoPct} />
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <div className="font-medium tabular-nums">
                          {money(r.vgv.valor)}
                        </div>
                        <EvolucaoBadge value={r.vgv.evolucaoPct} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel title="Carteira por equipe">
          <div className="space-y-3">
            {summary.equipes.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Nenhuma equipe cadastrada.
              </p>
            ) : (
              summary.equipes.map((eq) => (
                <div
                  key={eq.equipeId}
                  className="rounded-lg border px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{eq.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {eq.corretores} corretor
                        {eq.corretores === 1 ? "" : "es"}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold tabular-nums">
                        {eq.total}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {eq.leads} leads · {eq.clientes} clientes
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DashboardPanel>
      </section>
      )}

      <DashboardPanel
        title="Metas vs realizado"
        description={
          isSolo
            ? "Metas ativas do período · tipo, valor e progresso."
            : "Metas mensais ativas · imobiliária, equipes e corretores."
        }
        action={<PanelLink to="/metas">Ver metas</PanelLink>}
      >
        <div className="space-y-5">
          {isSolo ? (
            summary.metas.corretores.length > 0 ? (
              <div className="space-y-3">
                {summary.metas.corretores.map((m) => (
                  <div key={m.id}>
                    <div className="mb-1 flex justify-between gap-3 text-sm">
                      <span className="font-medium">
                        {META_TIPO_LABEL[m.tipo] ?? m.tipo}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {m.tipo === "vgv"
                          ? `${money(m.atual)} / ${money(m.valor)}`
                          : `${m.atual.toLocaleString("pt-BR")} / ${m.valor.toLocaleString("pt-BR")}`}{" "}
                        ({m.percentual}%)
                      </span>
                    </div>
                    <Progress value={m.percentual} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma meta mensal ativa. Cadastre em Metas.
              </p>
            )
          ) : (
            <>
          <div className="rounded-xl border bg-secondary/40 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="font-semibold text-primary">Imobiliária</div>
              <div className="text-sm tabular-nums">
                {summary.metas.imobiliaria.atual.toLocaleString("pt-BR")} /{" "}
                {summary.metas.imobiliaria.meta.toLocaleString("pt-BR")} (
                {summary.metas.imobiliaria.percentual}%)
              </div>
            </div>
            <Progress value={summary.metas.imobiliaria.percentual} />
          </div>

          {summary.metas.equipes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-primary">Por equipe</h3>
              {summary.metas.equipes.map((eq) => (
                <div key={eq.equipeId}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{eq.nome}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {eq.percentual}%
                    </span>
                  </div>
                  <Progress value={eq.percentual} />
                </div>
              ))}
            </div>
          )}

          {summary.metas.corretores.length > 0 ? (
            <div className="overflow-x-auto">
              <h3 className="mb-2 text-sm font-semibold text-primary">
                Por corretor
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Corretor</th>
                    <th className="pb-2 font-medium">Tipo</th>
                    <th className="pb-2 text-right font-medium">Progresso</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.metas.corretores.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-2">
                        <div className="font-medium">{m.corretorNome}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.equipeNome ?? "Sem equipe"}
                        </div>
                      </td>
                      <td className="py-2">
                        {META_TIPO_LABEL[m.tipo] ?? m.tipo}
                      </td>
                      <td className="py-2 text-right">
                        <div className="font-medium tabular-nums">
                          {m.tipo === "vgv"
                            ? `${money(m.atual)} / ${money(m.valor)}`
                            : `${m.atual} / ${m.valor}`}
                        </div>
                        <div className="mb-1 text-xs text-muted-foreground">
                          {m.percentual}%
                        </div>
                        <Progress value={m.percentual} className="h-1.5" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma meta mensal ativa. Cadastre em Metas.
            </p>
          )}
            </>
          )}
        </div>
      </DashboardPanel>
    </div>
  );
}

function DashboardCorretorView() {
  const user = getSession();
  const canOpenDocumentacao = user
    ? canAccessRoute(
        user.role,
        "/documentacao",
        user.tenant?.modules ?? null,
        user.tenant?.plano ?? null,
        user.permissions ?? null,
      )
    : false;
  const { funnelStages, stageByPapel } = useCatalog();
  const [summary, setSummary] = useState<DashboardCorretor | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await fetchDashboardCorretor());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os indicadores.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const funnelData = useMemo(() => {
    if (!summary) return [];
    return buildFunnelChartData(summary.funil, funnelStages);
  }, [summary, funnelStages]);

  const analiseData = useMemo(
    () =>
      summary?.analises.map((item) => ({
        label: ANALISE_LABELS[item.status],
        total: item.total,
      })) ?? [],
    [summary],
  );
  const agendaPessoal = useMemo(
    () =>
      summary?.agenda.itens.filter((item) => item.categoria === "pessoal") ??
      [],
    [summary],
  );
  const agendaCompartilhada = useMemo(
    () =>
      summary?.agenda.itens.filter(
        (item) => item.categoria === "compartilhada",
      ) ?? [],
    [summary],
  );

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          description="Visão geral da sua operação."
        />
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando indicadores…
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          description="Visão geral da sua operação."
        />
        <SemConexao
          title="Indicadores indisponíveis"
          description="Não foi possível carregar os dados do dashboard."
        />
      </div>
    );
  }

  const analiseSlug = stageByPapel("analise") ?? "em-analise";
  const emAnalise =
    summary.funil.find((item) => item.etapa === analiseSlug)?.total ?? 0;
  const mesLabel = new Date(summary.periodo.inicio).toLocaleDateString(
    "pt-BR",
    { month: "long", year: "numeric" },
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        description={`Visão da sua carteira em ${mesLabel}.`}
      />

      <DashboardPanel
        guia="dashboard-kpis"
        title="Sua carteira"
        description={`Resumo operacional em ${mesLabel}.`}
        action={<PanelLink to="/leads">Ver leads</PanelLink>}
      >
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          <FinanceKpiCard
            label="Leads ativos"
            value={summary.carteira.leads}
            icon={UsersRound}
            tone="teal"
            format="number"
            compact
            className={KPI_EMBED}
          />
          <FinanceKpiCard
            label="Clientes na carteira"
            value={summary.carteira.clientes}
            icon={UserRound}
            tone="blue"
            format="number"
            compact
            className={KPI_EMBED}
          />
          <FinanceKpiCard
            label="Novos contatos no mês"
            value={summary.carteira.novosContatos}
            icon={TrendingUp}
            tone="orange"
            format="number"
            compact
            className={KPI_EMBED}
          />
          <FinanceKpiCard
            label="Em análise"
            value={emAnalise}
            icon={ClipboardList}
            tone="violet"
            format="number"
            compact
            className={KPI_EMBED}
          />
        </div>
      </DashboardPanel>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel
          title="Documentação e vendas"
          description={`Resultado da sua carteira em ${mesLabel}.`}
          action={
            canOpenDocumentacao ? (
              <PanelLink to="/documentacao">Ver documentação</PanelLink>
            ) : undefined
          }
        >
          <div className="grid grid-cols-2 gap-2.5">
            <FinanceKpiCard
              label="Documentações registradas"
              value={summary.documentacao.registrados}
              icon={BriefcaseBusiness}
              tone="blue"
              format="number"
              compact
              className={KPI_EMBED}
            />
            <FinanceKpiCard
              label="Em andamento"
              value={summary.documentacao.emAndamento}
              icon={FileCheck2}
              tone="orange"
              format="number"
              compact
              className={KPI_EMBED}
            />
            <FinanceKpiCard
              label="Vendas registradas"
              value={summary.documentacao.vendidos}
              icon={FileCheck2}
              tone="emerald"
              format="number"
              compact
              className={KPI_EMBED}
            />
            <FinanceKpiCard
              label="VGV vendido no mês"
              value={summary.documentacao.vgvVendidoMes}
              icon={Wallet}
              tone="teal"
              compact
              className={KPI_EMBED}
            />
          </div>
        </DashboardPanel>

        <DashboardPanel
          guia="dashboard-comissao"
          title="Sua comissão do mês"
          description={`Quanto você recebe nas vendas de ${mesLabel}.`}
          action={<PanelLink to="/financeiro/comissao">Ver comissões</PanelLink>}
        >
          <div className="grid grid-cols-2 gap-2.5">
            <FinanceKpiCard
              label="A receber"
              value={summary.comissao.aReceber}
              icon={Percent}
              tone="violet"
              compact
              className={KPI_EMBED}
            />
            <FinanceKpiCard
              label="Pendentes"
              value={summary.comissao.pendente}
              icon={Clock3}
              tone="orange"
              compact
              className={KPI_EMBED}
            />
            <FinanceKpiCard
              label="Liberadas"
              value={summary.comissao.liberada}
              icon={Banknote}
              tone="blue"
              compact
              className={KPI_EMBED}
            />
            <FinanceKpiCard
              label="Pagas"
              value={summary.comissao.paga}
              icon={CheckCircle2}
              tone="emerald"
              compact
              className={KPI_EMBED}
            />
          </div>
        </DashboardPanel>
      </div>

      <section
        data-guia="dashboard-funil"
        className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,1fr)]"
      >
        <DashboardPanel
          title="Funil atual"
          description="Seus leads ativos nas etapas do funil de vendas."
          action={
            user &&
            canAccessRoute(
              user.role,
              "/funil",
              user.tenant?.modules ?? null,
              user.tenant?.plano ?? null,
              user.permissions ?? null,
            ) ? (
              <PanelLink to="/funil">Ver funil</PanelLink>
            ) : (
              <PanelLink to="/leads">Ver leads</PanelLink>
            )
          }
        >
          <FunnelBarChart data={funnelData} />
        </DashboardPanel>
        <DashboardPanel title="Status das análises">
          <div className="space-y-3">
            {analiseData.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
              >
                <span className="text-sm text-muted-foreground">
                  {item.label}
                </span>
                <span className="font-semibold tabular-nums">{item.total}</span>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </section>

      <DashboardPanel
        title="Minha agenda de hoje"
        description={`${summary.agenda.totalHoje} compromisso${summary.agenda.totalHoje === 1 ? "" : "s"} marcado${summary.agenda.totalHoje === 1 ? "" : "s"} para hoje.`}
        action={<PanelLink to="/agenda">Abrir agenda</PanelLink>}
      >
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
            {summary.agenda.pendentesHoje} pendente
            {summary.agenda.pendentesHoje === 1 ? "" : "s"}
          </span>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">
            {summary.agenda.concluidosHoje} concluído
            {summary.agenda.concluidosHoje === 1 ? "" : "s"}
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <AgendaCategoria
            title="Atividades pessoais"
            items={agendaPessoal}
            emptyMessage="Nenhuma atividade pessoal marcada para hoje."
          />
          <AgendaCategoria
            title="Com gerente ou superior"
            items={agendaCompartilhada}
            emptyMessage="Nenhuma atividade compartilhada marcada para hoje."
          />
        </div>
      </DashboardPanel>
    </div>
  );
}

function AgendaCategoria({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: DashboardCorretor["agenda"]["itens"];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <>
          <div className="divide-y rounded-md border">
            {items.slice(0, 7).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                {item.status === "concluido" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <Clock3 className="h-4 w-4 shrink-0 text-amber-600" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.titulo}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.contato ?? item.tipo}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {new Date(item.startsAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            ))}
          </div>
          {items.length > 7 && (
            <Button
              asChild
              type="button"
              variant="outline"
              size="sm"
              className={`mt-3 ${SOFT_BTN}`}
            >
              <Link to="/agenda">Exibir mais</Link>
            </Button>
          )}
        </>
      )}
    </div>
  );
}
