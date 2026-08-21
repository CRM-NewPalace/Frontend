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
  Eye,
  EyeOff,
  Loader2,
  Plus,
  TrendingUp,
  Wallet,
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

      <div
        className={cn(
          "mt-4 grid gap-4",
          pipeline.outros.length > 0 ? "lg:grid-cols-3" : "lg:grid-cols-2",
        )}
      >
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
        {pipeline.outros.length > 0 ? (
          <DespesaPipelineColumn
            title="Sem classificação"
            emptyText="Todas as despesas deste mês estão classificadas."
            items={pipeline.outros}
            tone="outros"
            total={k.despesasOutrosMes ?? 0}
            fator={fator}
            hideValues={hideValues}
          />
        ) : null}
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
  const accent =
    tone === "fixa"
      ? "border-l-[#079ed4]"
      : tone === "variavel"
        ? "border-l-amber-400"
        : "border-l-muted-foreground/40";
  const head =
    tone === "fixa"
      ? "from-[#079ed4]/15"
      : tone === "variavel"
        ? "from-amber-400/20"
        : "from-muted/80";

  return (
    <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b bg-gradient-to-r via-background to-background px-4 py-3",
          head,
        )}
      >
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">
            {items.length} lançamento{items.length === 1 ? "" : "s"}
          </p>
        </div>
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            hideValues && MONEY_BLUR,
          )}
        >
          {brl(Math.round(total * fator))}
        </p>
      </div>
      <div className="max-h-96 space-y-2 overflow-y-auto p-3">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
            {emptyText}
          </p>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className={cn(
                "rounded-xl border border-l-[3px] bg-background px-3 py-2 shadow-sm",
                accent,
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-medium">
                  {item.descricao}
                </p>
                <p
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    hideValues && MONEY_BLUR,
                  )}
                >
                  {brl(item.valor)}
                </p>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                <span>{formatDate(item.data)}</span>
                {item.centro ? <span>{item.centro}</span> : null}
                {item.parceiro ? <span>{item.parceiro}</span> : null}
                <Badge
                  variant="secondary"
                  className={cn(
                    "h-5 px-1.5 text-[10px]",
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
