import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { EvolucaoBadge, FinanceKpiCard } from "@/components/finance-kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useCatalog } from "@/lib/catalog-store";
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
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileCheck2,
  Goal,
  Loader2,
  TrendingUp,
  UserRound,
  UserX,
  UsersRound,
  Wallet,
} from "lucide-react";
import { SemConexao } from "@/components/sem-conexao";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const chartConfig = {
  total: { label: "Processos", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

function FunnelBarChart({
  data,
}: {
  data: { etapa: string; total: number }[];
}) {
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
          <Bar dataKey="total" fill="var(--color-total)" radius={4}>
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

  if (user?.role === "corretor") {
    return <DashboardCorretorView />;
  }

  if (user?.role === "admin" || user?.role === "gerente") {
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
        description="O dashboard gerencial é para admin/gerente. Corretores têm o painel operacional."
      />
    </div>
  );
}

function DashboardAdminView() {
  const { funnelStages, origens } = useCatalog();
  const agora = useMemo(() => agoraBrasil(), []);
  const [mes, setMes] = useState(agora.mes);
  const [ano, setAno] = useState(agora.ano);
  const [origemFilter, setOrigemFilter] = useState("all");
  const [summary, setSummary] = useState<DashboardAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  const anosDisponiveis = useMemo(() => {
    const list: number[] = [];
    for (let y = agora.ano; y >= agora.ano - 5; y -= 1) list.push(y);
    return list;
  }, [agora.ano]);

  const load = useCallback(async () => {
    setLoading(true);
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
    const totals = new Map(summary.funil.map((i) => [i.etapa, i.total]));
    const fromCatalog = funnelStages.map((stage) => ({
      etapa: stage.name,
      total: totals.get(stage.id) ?? 0,
    }));
    if (fromCatalog.some((i) => i.total > 0) || funnelStages.length > 0) {
      return fromCatalog;
    }
    return summary.funil.map((i) => ({ etapa: i.etapa, total: i.total }));
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
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Mês</Label>
        <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
          <SelectTrigger className="h-9 w-[9.5rem] bg-background">
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
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Ano</Label>
        <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
          <SelectTrigger className="h-9 w-[5.5rem] bg-background">
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
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Origem</Label>
        <Select value={origemFilter} onValueChange={setOrigemFilter}>
          <SelectTrigger className="h-9 w-44 bg-background">
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
    <div>
      <PageHeader
        title="Dashboard"
        description={`Visão gerencial · ${mesLabel} · comparação com o mês anterior.`}
        actions={filtros}
      />

      {loading ? (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Atualizando indicadores…
        </div>
      ) : null}

      <section className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        <FinanceKpiCard
          label="Novos leads (mês)"
          value={summary.entradas.mes.valor}
          evolucaoPct={summary.entradas.mes.evolucaoPct}
          valorMesAnterior={summary.entradas.mes.valorMesAnterior}
          icon={TrendingUp}
          tone="teal"
          format="number"
          href="/leads"
        />
        <FinanceKpiCard
          label="Novos hoje"
          value={summary.entradas.hoje}
          icon={UsersRound}
          tone="blue"
          format="number"
          href="/leads"
        />
        <FinanceKpiCard
          label="Novos na semana"
          value={summary.entradas.semana}
          icon={ClipboardList}
          tone="violet"
          format="number"
        />
        <FinanceKpiCard
          label="VGV vendido (mês)"
          value={summary.conversao.vgv.valor}
          evolucaoPct={summary.conversao.vgv.evolucaoPct}
          valorMesAnterior={summary.conversao.vgv.valorMesAnterior}
          icon={Wallet}
          tone="emerald"
        />
      </section>

      <section className="mt-5 grid gap-3 grid-cols-2 xl:grid-cols-4">
        <FinanceKpiCard
          label="Sem corretor"
          value={summary.atencao.semDono}
          icon={UserX}
          tone="orange"
          format="number"
          href="/leads"
        />
        <FinanceKpiCard
          label={`Parados (${summary.atencao.diasParado}d)`}
          value={summary.atencao.parados}
          icon={AlertTriangle}
          tone="rose"
          format="number"
          href="/leads"
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
          href="/leads-perdidos"
        />
        <FinanceKpiCard
          label="Conversão (entrada → venda)"
          value={summary.conversao.taxa.valor}
          evolucaoPct={summary.conversao.taxa.evolucaoPct}
          valorMesAnterior={summary.conversao.taxa.valorMesAnterior}
          icon={Goal}
          tone="teal"
          format="percent"
        />
      </section>

      <section className="mt-5 grid gap-4 min-w-0 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Funil geral</CardTitle>
            <p className="text-sm text-muted-foreground">
              Leads ativos da imobiliária por etapa.
            </p>
          </CardHeader>
          <CardContent>
            <FunnelBarChart data={funnelData} />
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-base">Conversão do mês</CardTitle>
            <p className="text-sm text-muted-foreground">
              % dos leads que entraram e viraram venda (vs mês anterior).
            </p>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            <div className="rounded-xl border bg-secondary/40 p-3 sm:p-4 text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-brand-accent">
                Taxa de conversão
              </div>
              <div className="mt-1 text-3xl sm:text-4xl font-bold tabular-nums text-foreground">
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
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed px-1">
                {summary.conversao.vendas.valor} venda
                {summary.conversao.vendas.valor === 1 ? "" : "s"} de{" "}
                {summary.conversao.entradas.valor} lead
                {summary.conversao.entradas.valor === 1 ? "" : "s"} que entraram
                no mês calendário
              </p>
              {summary.entradas.semana > summary.entradas.mes.valor ? (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300 leading-relaxed px-1">
                  Nesta semana há {summary.entradas.semana} novos — parte pode
                  ser de dias do mês passado (a semana começa na segunda).
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">Leads que entraram</div>
                  <EvolucaoBadge
                    value={summary.conversao.entradas.evolucaoPct}
                    previous={summary.conversao.entradas.valorMesAnterior}
                    className="mt-0.5"
                  />
                </div>
                <span className="shrink-0 font-semibold tabular-nums pt-0.5">
                  {summary.conversao.entradas.valor}
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
                <span className="shrink-0 font-semibold tabular-nums pt-0.5">
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
                <span className="shrink-0 max-w-[45%] text-right font-semibold tabular-nums text-sm pt-0.5 break-all">
                  {money(summary.conversao.vgv.valor)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Leads perdidos — motivos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.perdidos.motivos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Agenda de hoje</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {summary.agenda.totalHoje} compromisso
                  {summary.agenda.totalHoje === 1 ? "" : "s"} ·{" "}
                  {summary.agenda.atrasados} atrasado
                  {summary.agenda.atrasados === 1 ? "" : "s"}
                </p>
              </div>
              <CalendarCheck className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
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
              <p className="text-sm text-muted-foreground py-4">
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
            <Button
              asChild
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
            >
              <Link to="/agenda">Abrir agenda</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ranking de corretores</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ordenado por VGV do mês.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {summary.ranking.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Nenhum corretor ativo.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-2 font-medium">Corretor</th>
                    <th className="pb-2 pr-2 font-medium text-right">Leads</th>
                    <th className="pb-2 pr-2 font-medium text-right">
                      Visitas
                    </th>
                    <th className="pb-2 pr-2 font-medium text-right">Vendas</th>
                    <th className="pb-2 font-medium text-right">VGV</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.ranking.slice(0, 10).map((r) => (
                    <tr key={r.corretorId} className="border-b last:border-0">
                      <td className="py-2.5 pr-2">
                        <div className="font-medium">{r.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.equipe ?? "Sem equipe"}
                        </div>
                      </td>
                      <td className="py-2.5 pr-2 text-right tabular-nums">
                        {r.leads}
                      </td>
                      <td className="py-2.5 pr-2 text-right tabular-nums">
                        {r.visitas}
                      </td>
                      <td className="py-2.5 pr-2 text-right">
                        <div className="tabular-nums font-medium">
                          {r.vendas.valor}
                        </div>
                        <EvolucaoBadge value={r.vendas.evolucaoPct} />
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="tabular-nums font-medium">
                          {money(r.vgv.valor)}
                        </div>
                        <EvolucaoBadge value={r.vgv.evolucaoPct} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Carteira por equipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.equipes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
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
          </CardContent>
        </Card>
      </section>

      <section className="mt-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metas vs realizado</CardTitle>
            <p className="text-sm text-muted-foreground">
              Metas mensais ativas · imobiliária, equipes e corretores.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border bg-secondary/40 p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="font-semibold">Imobiliária</div>
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
                <h3 className="text-sm font-semibold">Por equipe</h3>
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
                <h3 className="text-sm font-semibold mb-2">Por corretor</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Corretor</th>
                      <th className="pb-2 font-medium">Tipo</th>
                      <th className="pb-2 font-medium text-right">Progresso</th>
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
                          <div className="tabular-nums font-medium">
                            {m.tipo === "vgv"
                              ? `${money(m.atual)} / ${money(m.valor)}`
                              : `${m.atual} / ${m.valor}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {m.percentual}%
                          </div>
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
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function DashboardCorretorView() {
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
    const totals = new Map(
      summary.funil.map((item) => [item.etapa, item.total]),
    );
    return funnelStages.map((stage) => ({
      etapa: stage.name,
      total: totals.get(stage.id) ?? 0,
    }));
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
    <div>
      <PageHeader
        title="Dashboard"
        description={`Visão da sua carteira em ${mesLabel}.`}
      />

      <section className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        <FinanceKpiCard
          label="Leads ativos"
          value={summary.carteira.leads}
          icon={UsersRound}
          tone="teal"
          format="number"
          href="/leads"
        />
        <FinanceKpiCard
          label="Clientes na carteira"
          value={summary.carteira.clientes}
          icon={UserRound}
          tone="blue"
          format="number"
          href="/clientes"
        />
        <FinanceKpiCard
          label="Novos contatos no mês"
          value={summary.carteira.novosContatos}
          icon={TrendingUp}
          tone="orange"
          format="number"
        />
        <FinanceKpiCard
          label="Em análise"
          value={emAnalise}
          icon={ClipboardList}
          tone="violet"
          format="number"
          href="/funil"
        />
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funil atual</CardTitle>
            <p className="text-sm text-muted-foreground">
              {summary.conversaoEmAnalise}% da carteira está em análise.
            </p>
          </CardHeader>
          <CardContent>
            <FunnelBarChart data={funnelData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status das análises</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analiseData.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <span className="text-sm text-muted-foreground">
                  {item.label}
                </span>
                <span className="font-semibold tabular-nums">{item.total}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-3 grid-cols-2 xl:grid-cols-4">
        <FinanceKpiCard
          label="Documentações registradas"
          value={summary.documentacao.registrados}
          icon={BriefcaseBusiness}
          tone="blue"
          format="number"
          href="/documentacao"
        />
        <FinanceKpiCard
          label="Em andamento"
          value={summary.documentacao.emAndamento}
          icon={FileCheck2}
          tone="orange"
          format="number"
          href="/documentacao"
        />
        <FinanceKpiCard
          label="Vendas registradas"
          value={summary.documentacao.vendidos}
          icon={FileCheck2}
          tone="emerald"
          format="number"
          href="/documentacao"
        />
        <FinanceKpiCard
          label="VGV vendido no mês"
          value={summary.documentacao.vgvVendidoMes}
          icon={Wallet}
          tone="teal"
        />
      </section>

      <section className="mt-5">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  Minha agenda de hoje
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {summary.agenda.totalHoje} compromisso
                  {summary.agenda.totalHoje === 1 ? "" : "s"} marcado
                  {summary.agenda.totalHoje === 1 ? "" : "s"} para hoje.
                </p>
              </div>
              <CalendarCheck className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </section>
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
        <h3 className="text-sm font-semibold">{title}</h3>
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
              className="mt-3"
            >
              <Link to="/agenda">Exibir mais</Link>
            </Button>
          )}
        </>
      )}
    </div>
  );
}
