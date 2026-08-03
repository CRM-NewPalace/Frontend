import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { FinanceiroFiltrosBar } from "@/components/financeiro-filtros";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  MOCK_CENTROS,
  brl,
  type PeriodoFiltro,
} from "@/lib/financeiro-mock";
import { FolderKanban, Target } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_app/financeiro/centro-despesas")({
  head: () => ({ meta: [{ title: "Centro de despesas — Zone Connection" }] }),
  component: Page,
});

const chartConfig = {
  orcado: { label: "Orçado", color: "hsl(215 20% 55%)" },
  realizado: { label: "Realizado", color: "hsl(173 80% 36%)" },
} satisfies ChartConfig;

function Page() {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");
  const [search, setSearch] = useState("");

  const fator =
    periodo === "trimestre" ? 2.9 : periodo === "ano" ? 10 : periodo === "tudo" ? 12 : 1;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_CENTROS.filter((c) =>
      q ? c.centro.toLowerCase().includes(q) : true,
    ).map((c) => ({
      ...c,
      orcado: Math.round(c.orcado * fator),
      realizado: Math.round(c.realizado * fator),
    }));
  }, [search, fator]);

  const totais = useMemo(() => {
    const orcado = rows.reduce((s, r) => s + r.orcado, 0);
    const realizado = rows.reduce((s, r) => s + r.realizado, 0);
    return {
      orcado,
      realizado,
      saldo: orcado - realizado,
      pct: orcado ? (realizado / orcado) * 100 : 0,
    };
  }, [rows]);

  return (
    <div>
      <PageHeader
        title="Centro de despesas"
        description="Orçado versus realizado por centro de custo"
      />

      <FinanceiroFiltrosBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filtrar centro…"
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        hasActive={Boolean(search || periodo !== "mes")}
        onClear={() => {
          setSearch("");
          setPeriodo("mes");
        }}
      />

      <section className="grid gap-3 sm:grid-cols-3 mb-4">
        <FinanceKpiCard
          label="Orçado"
          value={totais.orcado}
          icon={Target}
          tone="blue"
        />
        <FinanceKpiCard
          label="Realizado"
          value={totais.realizado}
          icon={FolderKanban}
          tone="violet"
        />
        <FinanceKpiCard
          label="Saldo orçamentário"
          value={totais.saldo}
          icon={Target}
          tone="teal"
          suffix={`· ${totais.pct.toFixed(0)}%`}
        />
      </section>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Comparativo por centro</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={rows} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="centro" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => brl(Number(value))}
                  />
                }
              />
              <Bar
                dataKey="orcado"
                fill="var(--color-orcado)"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="realizado"
                fill="var(--color-realizado)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Centro</TableHead>
              <TableHead className="text-right">Orçado</TableHead>
              <TableHead className="text-right">Realizado</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="w-[180px]">Consumo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => {
              const pct = c.orcado ? (c.realizado / c.orcado) * 100 : 0;
              return (
                <TableRow key={c.centro}>
                  <TableCell className="font-medium">{c.centro}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {brl(c.orcado)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {brl(c.realizado)}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums font-medium ${
                      c.orcado - c.realizado < 0
                        ? "text-destructive"
                        : "text-emerald-600"
                    }`}
                  >
                    {brl(c.orcado - c.realizado)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(pct, 100)} className="h-2" />
                      <span className="text-xs tabular-nums text-muted-foreground w-10">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
