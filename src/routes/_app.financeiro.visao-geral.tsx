import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import {
  MOCK_CENTROS,
  MOCK_MESES_RESUMO,
  VISAO_GERAL_KPIS,
  brl,
  type PeriodoFiltro,
} from "@/lib/financeiro-mock";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
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
  head: () => ({ meta: [{ title: "Vis?o geral ? Zone Connection" }] }),
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

function Page() {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");
  const k = VISAO_GERAL_KPIS;

  const fator =
    periodo === "trimestre" ? 2.8 : periodo === "ano" ? 9.5 : periodo === "tudo" ? 12 : 1;

  const pieData = useMemo(
    () =>
      MOCK_CENTROS.map((c) => ({
        name: c.centro,
        value: Math.round(c.realizado * fator),
      })),
    [fator],
  );

  return (
    <div>
      <PageHeader
        title="Vis?o geral"
        description="Resumo financeiro da imobili?ria"
        actions={
          <Button
            onClick={() =>
              toast.message("Em breve", {
                description:
                  "Dispon?vel quando a API financeira estiver conectada.",
              })
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            Novo lan?amento
          </Button>
        }
      />

      <FinanceiroFiltrosBar
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        hasActive={periodo !== "mes"}
        onClear={() => setPeriodo("mes")}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 mb-6">
        <FinanceKpiCard
          label="Saldo em caixa"
          value={Math.round(k.saldoAtual * (periodo === "mes" ? 1 : 1.05))}
          icon={Wallet}
          tone="teal"
        />
        <FinanceKpiCard
          label="Receitas"
          value={Math.round(k.receitasMes * fator)}
          icon={ArrowUpRight}
          tone="emerald"
          evolucaoPct={k.evolucaoReceitas}
        />
        <FinanceKpiCard
          label="Despesas"
          value={Math.round(k.despesasMes * fator)}
          icon={ArrowDownRight}
          tone="red"
          evolucaoPct={k.evolucaoDespesas}
          invertEvolucao
        />
        <FinanceKpiCard
          label="Resultado"
          value={Math.round(k.resultadoMes * fator)}
          icon={TrendingUp}
          tone="blue"
          evolucaoPct={k.evolucaoResultado}
        />
        <FinanceKpiCard
          label="A receber"
          value={k.aReceber}
          icon={Banknote}
          tone="violet"
          href="/financeiro/contas-a-receber"
        />
        <FinanceKpiCard
          label="A pagar"
          value={k.aPagar}
          icon={ArrowDownRight}
          tone="orange"
          href="/financeiro/contas-a-pagar"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receitas x despesas</CardTitle>
          </CardHeader>
          <CardContent>
            {MOCK_MESES_RESUMO.length === 0 ? (
              <p className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                Sem dados no período.
              </p>
            ) : (
              <ChartContainer config={barConfig} className="h-[280px] w-full">
                <BarChart data={MOCK_MESES_RESUMO} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(v) =>
                      `${(Number(v) / 1000).toFixed(0)}k`
                    }
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
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Despesas por centro</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                Sem dados no período.
              </p>
            ) : (
              <ChartContainer
                config={{ value: { label: "Valor", color: pieColors[0] } }}
                className="h-[280px] w-full"
              >
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
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
                  <Legend />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
