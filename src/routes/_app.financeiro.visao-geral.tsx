import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { getSession } from "@/lib/auth";
import { fetchVisaoGeral } from "@/lib/financeiro-api";
import {
  brl,
  type CentroDespesaResumo,
  type MesResumo,
  type PeriodoFiltro,
} from "@/lib/financeiro-mock";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
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
} satisfies ChartConfig;

const pieColors = [
  "hsl(173 80% 36%)",
  "hsl(199 89% 48%)",
  "hsl(262 83% 58%)",
  "hsl(32 95% 44%)",
  "hsl(330 81% 60%)",
  "hsl(215 20% 55%)",
];

const EMPTY_KPIS = {
  saldoAtual: 0,
  receitasMes: 0,
  despesasMes: 0,
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

function Page() {
  const navigate = useNavigate();
  const isPlatformAdmin = getSession()?.role === "super_admin";
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(EMPTY_KPIS);
  const [mesesResumo, setMesesResumo] = useState<MesResumo[]>([]);
  const [centros, setCentros] = useState<CentroDespesaResumo[]>([]);

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

  return (
    <div>
      <PageHeader
        title="Visao geral"
        description="Resumo financeiro — KPIs, evolução e atalhos"
        actions={
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
        />
        <FinanceKpiCard
          label="Receitas"
          value={Math.round(k.receitasMes * fator)}
          icon={ArrowUpRight}
          tone="blue-2"
          evolucaoPct={k.evolucaoReceitas}
        />
        <FinanceKpiCard
          label="Despesas"
          value={Math.round(k.despesasMes * fator)}
          icon={ArrowDownRight}
          tone="blue-3"
          evolucaoPct={k.evolucaoDespesas}
          invertEvolucao
        />
        <FinanceKpiCard
          label="Resultado"
          value={Math.round(k.resultadoMes * fator)}
          icon={TrendingUp}
          tone="blue-4"
          evolucaoPct={k.evolucaoResultado}
        />
        <FinanceKpiCard
          label="A receber neste mês"
          value={k.aReceber}
          icon={Banknote}
          tone="blue-5"
          href="/financeiro/contas-a-receber"
        />
        <FinanceKpiCard
          label="A pagar neste mês"
          value={k.aPagar}
          icon={ArrowDownRight}
          tone="blue-6"
          href="/financeiro/contas-a-pagar"
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
                      tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 11 }}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => brl(Number(value))}
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
                  </BarChart>
                </ChartContainer>
              </ResponsiveChartShell>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Despesas por centro</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            {pieData.length === 0 ? (
              <div className="flex h-70 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <p>Sem despesas por centro neste mês.</p>
                {!isPlatformAdmin ? (
                  <Button asChild variant="outline" size="sm">
                    <Link to="/financeiro/centro-despesas">
                      Abrir centro de despesas
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : (
              <ResponsiveChartShell>
                <ChartContainer
                  config={{ value: { label: "Valor", color: pieColors[0] } }}
                  className="aspect-auto! mx-auto h-70 w-full min-w-80"
                >
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={84}
                      paddingAngle={2}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={pieColors[i % pieColors.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => brl(Number(value))}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
