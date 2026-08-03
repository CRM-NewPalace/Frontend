import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/app-shell";
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
  MESES_DEMONSTRATIVO,
  MOCK_DEMONSTRATIVO,
  MOCK_MESES_RESUMO,
  brl,
  type PeriodoFiltro,
} from "@/lib/financeiro-mock";
import { cn } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_app/financeiro/demonstrativo")({
  head: () => ({ meta: [{ title: "Demonstrativo — Zone Connection" }] }),
  component: Page,
});

const chartConfig = {
  receitas: { label: "Receitas", color: "hsl(160 84% 39%)" },
  despesas: { label: "Despesas", color: "hsl(0 72% 51%)" },
  resultado: { label: "Resultado", color: "hsl(199 89% 48%)" },
} satisfies ChartConfig;

function ResponsiveChartShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]">
      {children}
    </div>
  );
}

function Page() {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("trimestre");

  const meses = useMemo(() => {
    if (periodo === "mes") return ["Jul"] as string[];
    if (periodo === "ano" || periodo === "tudo")
      return MOCK_MESES_RESUMO.map((m) => m.mes);
    return [...MESES_DEMONSTRATIVO];
  }, [periodo]);

  const linhas = useMemo(() => {
    if (periodo === "mes" || periodo === "trimestre") {
      return MOCK_DEMONSTRATIVO.map((l) => ({
        ...l,
        valores: Object.fromEntries(meses.map((m) => [m, l.valores[m] ?? 0])),
      }));
    }
    // Ano / tudo: projeta Mai–Jul a partir do resumo mensal + linhas relativas
    return MOCK_DEMONSTRATIVO.map((l) => {
      const valores: Record<string, number> = {};
      for (const mes of meses) {
        const base = MOCK_DEMONSTRATIVO.find((x) => x.id === l.id);
        const jul = base?.valores.Jul ?? 0;
        const ref = MOCK_MESES_RESUMO.find((m) => m.mes === mes);
        const julRef = MOCK_MESES_RESUMO.find((m) => m.mes === "Jul");
        if (!ref || !julRef || !julRef.receitas) {
          valores[mes] = 0;
          continue;
        }
        const scale = ref.receitas / julRef.receitas;
        valores[mes] = Math.round(jul * scale);
      }
      return { ...l, valores };
    });
  }, [meses, periodo]);

  const resultadoSerie = useMemo(
    () =>
      MOCK_MESES_RESUMO.map((m) => ({
        mes: m.mes,
        receitas: m.receitas,
        despesas: m.despesas,
        resultado: m.receitas - m.despesas,
      })),
    [],
  );

  return (
    <div>
      <PageHeader
        title="Demonstrativo"
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Demonstrativo de resultados (DRE simplificado)
            <MockBanner />
          </span>
        }
      />

      <FinanceiroFiltrosBar
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        hasActive={periodo !== "trimestre"}
        onClear={() => setPeriodo("trimestre")}
      />

      <div className="grid gap-4 min-w-0 lg:grid-cols-2 mb-4">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receitas × despesas</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <ResponsiveChartShell>
              <ChartContainer
                config={chartConfig}
                className="aspect-auto! h-65 w-full min-w-120"
              >
                <BarChart
                  data={resultadoSerie}
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
                    dataKey="receitas"
                    fill="var(--color-receitas)"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="despesas"
                    fill="var(--color-despesas)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </ResponsiveChartShell>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resultado líquido</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <ResponsiveChartShell>
              <ChartContainer
                config={chartConfig}
                className="aspect-auto! h-65 w-full min-w-120"
              >
                <LineChart
                  data={resultadoSerie}
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
                  <Line
                    type="monotone"
                    dataKey="resultado"
                    stroke="var(--color-resultado)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ChartContainer>
            </ResponsiveChartShell>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-55">Conta</TableHead>
              {meses.map((m) => (
                <TableHead key={m} className="text-right">
                  {m}/2026
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l) => (
              <TableRow
                key={l.id}
                className={cn(l.destaque && "bg-muted/40 font-semibold")}
              >
                <TableCell
                  className={cn(
                    l.destaque ? "font-semibold" : "text-muted-foreground",
                    l.grupo === "resultado" && "text-foreground",
                  )}
                >
                  {l.label}
                </TableCell>
                {meses.map((m) => {
                  const v = l.valores[m] ?? 0;
                  return (
                    <TableCell
                      key={m}
                      className={cn(
                        "text-right tabular-nums",
                        v < 0 && "text-destructive",
                        l.destaque &&
                          v >= 0 &&
                          "text-emerald-700 dark:text-emerald-400",
                      )}
                    >
                      {brl(v)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
