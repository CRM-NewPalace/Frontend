import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { FinanceiroFiltrosBar } from "@/components/financeiro-filtros";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ApiError } from "@/lib/api";
import { fetchVisaoGeral } from "@/lib/financeiro-api";
import { useHideFinanceiroValues } from "@/lib/financeiro-prefs";
import {
  brl,
  formatDate,
  statusBadgeClass,
  statusLabel,
  type CentroDespesaResumo,
  type DespesaPipelineItem,
  type MesResumo,
  type PeriodoFiltro,
} from "@/lib/financeiro-mock";
import { SOFT_BTN, SOFT_BTN_ACTIVE } from "@/lib/soft-btn";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Building2,
  CalendarDays,
  CircleDashed,
  Eye,
  EyeOff,
  Loader2,
  Pin,
  Plus,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_app/financeiro/visao-geral")({
  head: () => ({ meta: [{ title: "Visao geral - Zone Connection" }] }),
  component: Page,
});

const barConfig = {
  receitas: { label: "Receitas", color: "hsl(160 84% 39%)" },
  despesas: { label: "Despesas", color: "hsl(0 72% 51%)" },
  variaveis: { label: "Variáveis", color: "hsl(45 93% 47%)" },
} satisfies ChartConfig;

const naturezaConfig = {
  fixa: { label: "Fixa", color: "hsl(199 89% 40%)" },
  variavel: { label: "Variável", color: "hsl(0 72% 51%)" },
  outros: { label: "Sem classificação", color: "hsl(215 20% 55%)" },
} satisfies ChartConfig;

const EMPTY_KPIS = {
  saldoAtual: 0,
  receitasMes: 0,
  despesasMes: 0,
  despesasFixaMes: 0,
  despesasVariavelMes: 0,
  despesasOutrosMes: 0,
  aReceber: 0,
  aPagar: 0,
  resultadoMes: 0,
  evolucaoReceitas: null as number | null,
  evolucaoDespesas: null as number | null,
  evolucaoResultado: null as number | null,
};

function ResponsiveChartShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]">
      {children}
    </div>
  );
}

const MONEY_BLUR = "select-none blur-[8px]";

function Page() {
  const navigate = useNavigate();
  const [hideValues, setHideValues] = useHideFinanceiroValues();
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(EMPTY_KPIS);
  const [mesesResumo, setMesesResumo] = useState<MesResumo[]>([]);
  const [centros, setCentros] = useState<CentroDespesaResumo[]>([]);
  const [pipeline, setPipeline] = useState<{
    fixas: DespesaPipelineItem[];
    variaveis: DespesaPipelineItem[];
    outros: DespesaPipelineItem[];
  }>({ fixas: [], variaveis: [], outros: [] });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchVisaoGeral();
        if (cancelled) return;
        setKpis(data.kpis);
        setMesesResumo(data.mesesResumo);
        setCentros(data.centros);
        setPipeline(
          data.despesasPipeline ?? { fixas: [], variaveis: [], outros: [] },
        );
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof ApiError
              ? err.message
              : "Nao foi possivel carregar a visao geral.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const k = kpis;
  const fator =
    periodo === "trimestre"
      ? 2.8
      : periodo === "ano"
        ? 9.5
        : periodo === "tudo"
          ? 12
          : 1;

  const pieData = useMemo(
    () =>
      centros
        .map((c) => ({
          name: c.centro,
          value: Math.round(c.realizado * fator),
        }))
        .filter((c) => c.value > 0),
    [centros, fator],
  );

  const naturezaData = useMemo(() => {
    const rows = [
      {
        name: "Fixa",
        key: "fixa" as const,
        value: Math.round((k.despesasFixaMes ?? 0) * fator),
      },
      {
        name: "Variável",
        key: "variavel" as const,
        value: Math.round((k.despesasVariavelMes ?? 0) * fator),
      },
      {
        name: "Sem classificação",
        key: "outros" as const,
        value: Math.round((k.despesasOutrosMes ?? 0) * fator),
      },
    ];
    return rows.filter((row) => row.value > 0);
  }, [fator, k.despesasFixaMes, k.despesasOutrosMes, k.despesasVariavelMes]);

  const despesasDetail = [
    (k.despesasFixaMes ?? 0) > 0
      ? `Fixa ${brl(Math.round((k.despesasFixaMes ?? 0) * fator))}`
      : null,
    (k.despesasVariavelMes ?? 0) > 0
      ? `Variável ${brl(Math.round((k.despesasVariavelMes ?? 0) * fator))}`
      : null,
    (k.despesasOutrosMes ?? 0) > 0
      ? `Sem class. ${brl(Math.round((k.despesasOutrosMes ?? 0) * fator))}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <PageHeader
        title="Visao geral"
        description="Resumo financeiro — KPIs, evolução e atalhos"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className={cn(hideValues ? SOFT_BTN_ACTIVE : SOFT_BTN)}
              aria-pressed={hideValues}
              title={hideValues ? "Mostrar valores" : "Ocultar valores"}
              onClick={() => setHideValues(!hideValues)}
            >
              {hideValues ? (
                <EyeOff className="w-4 h-4 mr-1" />
              ) : (
                <Eye className="w-4 h-4 mr-1" />
              )}
              {hideValues ? "Mostrar valores" : "Ocultar valores"}
            </Button>
            <Button
              type="button"
              onClick={() =>
                void navigate({
                  to: "/financeiro/movimentacao",
                  search: { novo: true },
                })
              }
            >
              <Plus className="w-4 h-4 mr-1" />
              Novo lançamento
            </Button>
          </div>
        }
      />

      <FinanceiroFiltrosBar
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        hasActive={periodo !== "mes"}
        onClear={() => setPeriodo("mes")}
      />

      {loading ? (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando indicadores...
        </div>
      ) : null}

      <section className="grid gap-3 grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 mb-6">
        <FinanceKpiCard
          label="Saldo em caixa"
          value={Math.round(k.saldoAtual * (periodo === "mes" ? 1 : 1.05))}
          icon={Wallet}
          tone="blue-1"
          blurValue={hideValues}
        />
        <FinanceKpiCard
          label="Receitas"
          value={Math.round(k.receitasMes * fator)}
          icon={ArrowUpRight}
          tone="blue-2"
          evolucaoPct={k.evolucaoReceitas}
          blurValue={hideValues}
        />
        <FinanceKpiCard
          label="Despesas"
          value={Math.round(k.despesasMes * fator)}
          icon={ArrowDownRight}
          tone="blue-3"
          evolucaoPct={k.evolucaoDespesas}
          invertEvolucao
          href="/financeiro/despesas"
          detail={despesasDetail || undefined}
          blurValue={hideValues}
        />
        <FinanceKpiCard
          label="Resultado"
          value={Math.round(k.resultadoMes * fator)}
          icon={TrendingUp}
          tone="blue-4"
          evolucaoPct={k.evolucaoResultado}
          blurValue={hideValues}
        />
        <FinanceKpiCard
          label="A receber neste mês"
          value={k.aReceber}
          icon={Banknote}
          tone="blue-5"
          href="/financeiro/contas-a-receber"
          blurValue={hideValues}
        />
        <FinanceKpiCard
          label="A pagar neste mês"
          value={k.aPagar}
          icon={ArrowDownRight}
          tone="blue-6"
          href="/financeiro/contas-a-pagar"
          blurValue={hideValues}
        />
      </section>

      <div className="grid gap-4 min-w-0 lg:grid-cols-5">
        <Card className="min-w-0 overflow-hidden lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receitas x despesas</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            {mesesResumo.length === 0 ? (
              <p className="flex h-70 items-center justify-center text-sm text-muted-foreground">
                Sem dados no periodo.
              </p>
            ) : (
              <ResponsiveChartShell>
                <ChartContainer
                  config={barConfig}
                  className="aspect-auto! h-70 w-full min-w-120"
                >
                  <BarChart
                    data={mesesResumo}
                    margin={{ left: 4, right: 8, top: 8, bottom: 4 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="mes"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tickFormatter={(v) =>
                        hideValues
                          ? "•••"
                          : `${(Number(v) / 1000).toFixed(0)}k`
                      }
                      tick={{ fontSize: 11 }}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) =>
                            hideValues ? "••••" : brl(Number(value))
                          }
                        />
                      }
                    />
                    <Legend />
                    <Bar
                      dataKey="receitas"
                      fill="var(--color-receitas)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="despesas"
                      fill="var(--color-despesas)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="variaveis"
                      fill="var(--color-variaveis)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </ResponsiveChartShell>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Despesas por tipo</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            {naturezaData.length === 0 ? (
              <div className="flex h-70 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <p>Sem despesas classificadas neste mês.</p>
              </div>
            ) : (
              <ResponsiveChartShell>
                <ChartContainer
                  config={naturezaConfig}
                  className="aspect-auto! mx-auto h-70 w-full min-w-80"
                >
                  <PieChart>
                    <Pie
                      data={naturezaData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={84}
                      paddingAngle={2}
                    >
                      {naturezaData.map((row) => (
                        <Cell
                          key={row.key}
                          fill={`var(--color-${row.key})`}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) =>
                            hideValues ? "••••" : brl(Number(value))
                          }
                        />
                      }
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12 }}
                      formatter={(value) => (
                        <span className="text-xs text-foreground">{value}</span>
                      )}
                    />
                  </PieChart>
                </ChartContainer>
              </ResponsiveChartShell>
            )}
            {pieData.length > 0 ? (
              <ul className="mt-3 space-y-1 border-t pt-3 text-xs text-muted-foreground">
                {pieData.slice(0, 4).map((item) => (
                  <li key={item.name} className="flex justify-between gap-2">
                    <span className="truncate">{item.name}</span>
                    <span
                      className={cn(
                        "shrink-0 tabular-nums text-foreground",
                        hideValues && MONEY_BLUR,
                      )}
                    >
                      {brl(item.value)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <DespesaPipelineColumn
          title="Fixas"
          emptyText="Nenhuma despesa fixa neste mês."
          items={pipeline.fixas}
          tone="fixa"
          total={k.despesasFixaMes ?? 0}
          fator={fator}
          hideValues={hideValues}
        />
        <DespesaPipelineColumn
          title="Variáveis"
          emptyText="Nenhuma despesa variável neste mês."
          items={pipeline.variaveis}
          tone="variavel"
          total={k.despesasVariavelMes ?? 0}
          fator={fator}
          hideValues={hideValues}
        />
        <DespesaPipelineColumn
          title="Sem classificação"
          emptyText="Todas as despesas deste mês estão classificadas."
          items={pipeline.outros}
          tone="outros"
          total={k.despesasOutrosMes ?? 0}
          fator={fator}
          hideValues={hideValues}
        />
      </div>
    </div>
  );
}

function DespesaPipelineColumn({
  title,
  emptyText,
  items,
  tone,
  total,
  fator,
  hideValues = false,
}: {
  title: string;
  emptyText: string;
  items: DespesaPipelineItem[];
  tone: "fixa" | "variavel" | "outros";
  total: number;
  fator: number;
  hideValues?: boolean;
}) {
  const visual =
    tone === "fixa"
      ? {
          Icon: Pin,
          shell:
            "border-primary/20 bg-linear-to-b from-primary/8 via-card to-card shadow-primary/5",
          head: "from-primary/18",
          stripe: "bg-linear-to-b from-[#0e6f8a] to-primary",
          iconWrap: "bg-primary/15 text-primary",
          totalChip: "bg-primary/12 text-primary",
          countChip: "border-primary/20 bg-primary/10 text-primary",
        }
      : tone === "variavel"
        ? {
            Icon: Zap,
            shell:
              "border-amber-400/30 bg-linear-to-b from-amber-400/12 via-card to-card shadow-amber-400/5",
            head: "from-amber-400/22",
            stripe: "bg-linear-to-b from-amber-500 to-amber-300",
            iconWrap: "bg-amber-400/20 text-amber-700 dark:text-amber-300",
            totalChip:
              "bg-amber-400/15 text-amber-800 dark:text-amber-200",
            countChip:
              "border-amber-400/30 bg-amber-400/15 text-amber-800 dark:text-amber-200",
          }
        : {
            Icon: CircleDashed,
            shell:
              "border-slate-400/25 bg-linear-to-b from-slate-400/10 via-card to-card",
            head: "from-slate-400/18",
            stripe: "bg-linear-to-b from-slate-500 to-slate-300",
            iconWrap: "bg-slate-400/15 text-slate-600 dark:text-slate-300",
            totalChip: "bg-slate-400/15 text-slate-700 dark:text-slate-200",
            countChip:
              "border-slate-400/30 bg-slate-400/10 text-slate-600 dark:text-slate-300",
          };
  const Icon = visual.Icon;

  return (
    <div
      className={cn(
        "flex min-h-80 flex-col overflow-hidden rounded-2xl border shadow-sm",
        visual.shell,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 border-b border-border/50 bg-gradient-to-r via-background/80 to-transparent px-4 py-3.5",
          visual.head,
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            visual.iconWrap,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight">{title}</p>
          <span
            className={cn(
              "mt-0.5 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium",
              visual.countChip,
            )}
          >
            {items.length} lançamento{items.length === 1 ? "" : "s"}
          </span>
        </div>
        <p
          className={cn(
            "shrink-0 rounded-xl px-2.5 py-1.5 text-sm font-semibold tabular-nums",
            visual.totalChip,
            hideValues && MONEY_BLUR,
          )}
        >
          {brl(Math.round(total * fator))}
        </p>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {items.length === 0 ? (
          <div className="flex h-full min-h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-background/50 px-4 text-center">
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                visual.iconWrap,
              )}
            >
              <Icon className="h-4 w-4 opacity-80" />
            </span>
            <p className="max-w-48 text-sm text-muted-foreground">{emptyText}</p>
          </div>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className="relative overflow-hidden rounded-xl border border-border/70 bg-background/90 p-3 pl-4 shadow-sm transition-colors hover:border-primary/25 hover:bg-background"
            >
              <span
                className={cn(
                  "absolute inset-y-0 left-0 w-1",
                  visual.stripe,
                )}
              />
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 line-clamp-2 text-sm font-semibold leading-snug">
                  {item.descricao}
                </p>
                <p
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums tracking-tight",
                    hideValues && MONEY_BLUR,
                  )}
                >
                  {brl(item.valor)}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  {formatDate(item.data)}
                </span>
                {item.centro ? (
                  <span className="inline-flex max-w-40 items-center truncate rounded-full bg-muted/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                    {item.centro}
                  </span>
                ) : null}
                {item.parceiro ? (
                  <span className="inline-flex max-w-40 items-center gap-1 truncate rounded-full bg-muted/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{item.parceiro}</span>
                  </span>
                ) : null}
              </div>
              <div className="mt-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    "h-5 w-auto px-2 text-[10px]",
                    statusBadgeClass(item.status),
                  )}
                >
                  {statusLabel(item.status)}
                </Badge>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
