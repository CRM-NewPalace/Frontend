import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import {
  FinanceiroFiltrosBar,
  MockBanner,
} from "@/components/financeiro-filtros";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MOCK_FLUXO_CAIXA,
  brl,
  type PeriodoFiltro,
} from "@/lib/financeiro-mock";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_app/financeiro/fluxo-caixa")({
  head: () => ({ meta: [{ title: "Fluxo de caixa — Zone Connection" }] }),
  component: Page,
});

const fluxoConfig = {
  entradas: { label: "Entradas", color: "hsl(160 84% 39%)" },
  saidas: { label: "Saídas", color: "hsl(0 72% 51%)" },
  saldo: { label: "Saldo", color: "hsl(199 89% 48%)" },
} satisfies ChartConfig;

function ResponsiveChartShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]">
      {children}
    </div>
  );
}

function Page() {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");

  const data = useMemo(() => {
    if (periodo === "mes")
      return MOCK_FLUXO_CAIXA.filter((d) => d.dia.includes("/07"));
    if (periodo === "trimestre") return MOCK_FLUXO_CAIXA;
    return MOCK_FLUXO_CAIXA;
  }, [periodo]);

  const totais = useMemo(() => {
    const entradas = data.reduce((s, d) => s + d.entradas, 0);
    const saidas = data.reduce((s, d) => s + d.saidas, 0);
    const saldo = data.at(-1)?.saldo ?? 0;
    return { entradas, saidas, saldo, liquido: entradas - saidas };
  }, [data]);

  return (
    <div>
      <PageHeader
        title="Fluxo de caixa"
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Evolução diária de entradas, saídas e saldo
            <MockBanner />
          </span>
        }
      />

      <FinanceiroFiltrosBar
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        hasActive={periodo !== "mes"}
        onClear={() => setPeriodo("mes")}
      />

      <section className="grid gap-3 grid-cols-2 xl:grid-cols-4 mb-4">
        <FinanceKpiCard
          label="Entradas no período"
          value={totais.entradas}
          icon={ArrowUpRight}
          tone="emerald"
        />
        <FinanceKpiCard
          label="Saídas no período"
          value={totais.saidas}
          icon={ArrowDownRight}
          tone="red"
        />
        <FinanceKpiCard
          label="Fluxo líquido"
          value={totais.liquido}
          icon={ArrowUpRight}
          tone="blue"
        />
        <FinanceKpiCard
          label="Saldo projetado"
          value={totais.saldo}
          icon={Wallet}
          tone="teal"
        />
      </section>

      <div className="grid gap-4 min-w-0 lg:grid-cols-2 mb-4">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Entradas × saídas</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <ResponsiveChartShell>
              <ChartContainer
                config={fluxoConfig}
                className="aspect-auto! h-70 w-full min-w-120"
              >
                <BarChart
                  data={data}
                  margin={{ left: 4, right: 8, top: 8, bottom: 4 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dia"
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    tick={{ fontSize: 11 }}
                    minTickGap={16}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
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
                    dataKey="entradas"
                    fill="var(--color-entradas)"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="saidas"
                    fill="var(--color-saidas)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </ResponsiveChartShell>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Saldo acumulado</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <ResponsiveChartShell>
              <ChartContainer
                config={fluxoConfig}
                className="aspect-auto! h-70 w-full min-w-120"
              >
                <AreaChart
                  data={data}
                  margin={{ left: 4, right: 8, top: 8, bottom: 4 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dia"
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    tick={{ fontSize: 11 }}
                    minTickGap={16}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => brl(Number(value))}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="saldo"
                    stroke="var(--color-saldo)"
                    fill="var(--color-saldo)"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ChartContainer>
            </ResponsiveChartShell>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dia</TableHead>
              <TableHead className="text-right">Entradas</TableHead>
              <TableHead className="text-right">Saídas</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.dia}>
                <TableCell className="font-medium">{d.dia}</TableCell>
                <TableCell className="text-right tabular-nums text-emerald-600">
                  {d.entradas ? brl(d.entradas) : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-destructive">
                  {d.saidas ? brl(d.saidas) : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold">
                  {brl(d.saldo)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
