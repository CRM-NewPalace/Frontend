import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CalendarX2, HandCoins, Banknote, CalendarClock,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

export const Route = createFileRoute("/_app/financeiro/visao-geral")({
  head: () => ({ meta: [{ title: "Visão geral — Financeiro" }] }),
  component: VisaoGeral,
});

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const KPI = [
  {
    label: "Contas a receber em atraso",
    value: 6028.63,
    icon: CalendarX2,
    tone: "teal" as const,
  },
  {
    label: "Contas a receber em aberto para este mês",
    value: 0,
    icon: HandCoins,
    tone: "emerald" as const,
  },
  {
    label: "Contas a pagar em aberto para este mês",
    value: 24343,
    icon: Banknote,
    tone: "orange" as const,
  },
  {
    label: "Contas a pagar em atraso",
    value: 12543,
    icon: CalendarClock,
    tone: "red" as const,
  },
];

const PROJECAO_RECEBIMENTOS = 0;
const PROJECAO_PAGAMENTOS = 29963;
const PROJECAO_LUCRO = PROJECAO_RECEBIMENTOS - PROJECAO_PAGAMENTOS;

const INADIMPLENCIA_CLIENTES = [
  { nome: "LUCIANA BEATRIZ SOUZA DA PAZ", valor: 6028.63 },
];

const PROXIMOS_CLIENTES = [
  { nome: "JOÃO PEREIRA", valor: 2400 },
  { nome: "BEATRIZ COSTA", valor: 1850.5 },
];

const VENCIDOS_CLIENTES = [
  { nome: "LUCIANA BEATRIZ SOUZA DA PAZ", valor: 6028.63 },
];

const INADIMPLENCIA_FORNECEDORES = [
  { nome: "aluguel posto", valor: 6000 },
  { nome: "EMERSON", valor: 2123 },
  { nome: "DANIEL ASG", valor: 2000 },
  { nome: "CARLA FRAZAO", valor: 1600 },
  { nome: "Treiner Giovane", valor: 500 },
  { nome: "CONTABILIDADE", valor: 320 },
];

const PROXIMOS_FORNECEDORES = [
  { nome: "Zap Imóveis", valor: 3200 },
  { nome: "Agência XYZ", valor: 4500 },
];

const VENCIDOS_FORNECEDORES = [
  { nome: "aluguel posto", valor: 6000 },
  { nome: "EMERSON", valor: 2123 },
  { nome: "DANIEL ASG", valor: 2000 },
];

function buildProjecao(dias: 15 | 30 | 60) {
  const start = new Date(2026, 6, 23);
  const points = Math.min(dias, 20);
  const step = Math.max(1, Math.floor(dias / points));
  let saldo = 932800;
  const rows = [];
  for (let i = 0; i <= dias; i += step) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (i === 2) saldo -= 12800;
    if (i === 5) saldo -= 2100;
    if (i > 5 && i % 7 === 0) saldo -= 800;
    rows.push({
      data: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      saldo: Math.round(saldo),
      receber: i < 3 ? 0 : Math.round(i * 40),
      pagar: i < 2 ? 0 : Math.round(800 + i * 120),
    });
  }
  return rows;
}

function VisaoGeral() {
  const [periodo, setPeriodo] = useState<15 | 30 | 60>(15);
  const chartData = useMemo(() => buildProjecao(periodo), [periodo]);

  const progressoPago = Math.min(100, Math.round((12543 / PROJECAO_PAGAMENTOS) * 100));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Visão geral"
        description="Filial: Imobiliária New Palace — panorama de contas a pagar e a receber."
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {KPI.map((k) => (
          <FinanceKpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            icon={k.icon}
            tone={k.tone}
          />
        ))}
      </div>

      {/* Situação + Projeção */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Situação no mês atual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1 text-sm">
              <div>
                Projeção de recebimentos:{" "}
                <span className="font-semibold text-emerald-600">{money(PROJECAO_RECEBIMENTOS)}</span>
              </div>
              <div>
                Projeção de pagamentos:{" "}
                <span className="font-semibold text-red-600">{money(PROJECAO_PAGAMENTOS)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-3 rounded-full bg-red-100 dark:bg-red-950/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-600 transition-all"
                  style={{ width: `${progressoPago}%` }}
                />
              </div>
              <div className="text-[11px] text-muted-foreground">
                {progressoPago}% dos pagamentos previstos já vencidos / em atraso
              </div>
            </div>

            <div className="pt-2 border-t text-sm">
              Projeção de lucro líquido até o final do mês:{" "}
              <span className={cn("font-bold text-base", PROJECAO_LUCRO >= 0 ? "text-emerald-600" : "text-red-600")}>
                {money(PROJECAO_LUCRO)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Projeção para os próximos dias</CardTitle>
            <div className="flex gap-1">
              {([15, 30, 60] as const).map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={periodo === d ? "default" : "outline"}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setPeriodo(d)}
                >
                  {d} dias
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="data" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickFormatter={(v) =>
                    Number(v).toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 })
                  }
                  width={48}
                />
                <Tooltip
                  formatter={(value) => money(Number(value))}
                  labelFormatter={(l) => `Data: ${l}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="saldo"
                  name="Saldo"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="receber"
                  name="Contas a receber"
                  stroke="#67e8f9"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="pagar"
                  name="Contas a pagar"
                  stroke="#f9a8d4"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Inadimplências */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <Tabs defaultValue="inadimplencia">
            <div className="px-4 pt-3">
              <TabsList className="w-full justify-start h-auto flex-wrap bg-muted/50">
                <TabsTrigger value="inadimplencia" className="text-xs data-[state=active]:text-emerald-700">
                  Inadimplência por cliente
                </TabsTrigger>
                <TabsTrigger value="proximos" className="text-xs">Próximos a vencer</TabsTrigger>
                <TabsTrigger value="vencidos" className="text-xs">Vencidos</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="inadimplencia" className="mt-0">
              <InadTable
                titulo="Inadimplência agrupada por cliente"
                colNome="Cliente"
                rows={INADIMPLENCIA_CLIENTES}
                accent="emerald"
              />
            </TabsContent>
            <TabsContent value="proximos" className="mt-0">
              <InadTable
                titulo="Próximos a vencer por cliente"
                colNome="Cliente"
                rows={PROXIMOS_CLIENTES}
                accent="emerald"
              />
            </TabsContent>
            <TabsContent value="vencidos" className="mt-0">
              <InadTable
                titulo="Vencidos por cliente"
                colNome="Cliente"
                rows={VENCIDOS_CLIENTES}
                accent="emerald"
              />
            </TabsContent>
          </Tabs>
        </Card>

        <Card>
          <Tabs defaultValue="inadimplencia">
            <div className="px-4 pt-3">
              <TabsList className="w-full justify-start h-auto flex-wrap bg-muted/50">
                <TabsTrigger value="inadimplencia" className="text-xs data-[state=active]:text-red-700">
                  Inadimplência por fornecedor
                </TabsTrigger>
                <TabsTrigger value="proximos" className="text-xs">Próximos a vencer</TabsTrigger>
                <TabsTrigger value="vencidos" className="text-xs">Vencidos</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="inadimplencia" className="mt-0">
              <InadTable
                titulo="Inadimplência agrupada por fornecedor"
                colNome="Fornecedor"
                rows={INADIMPLENCIA_FORNECEDORES}
                accent="red"
              />
            </TabsContent>
            <TabsContent value="proximos" className="mt-0">
              <InadTable
                titulo="Próximos a vencer por fornecedor"
                colNome="Fornecedor"
                rows={PROXIMOS_FORNECEDORES}
                accent="red"
              />
            </TabsContent>
            <TabsContent value="vencidos" className="mt-0">
              <InadTable
                titulo="Vencidos por fornecedor"
                colNome="Fornecedor"
                rows={VENCIDOS_FORNECEDORES}
                accent="red"
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function InadTable({
  titulo,
  colNome,
  rows,
  accent,
}: {
  titulo: string;
  colNome: string;
  rows: { nome: string; valor: number }[];
  accent: "emerald" | "red";
}) {
  return (
    <>
      <div className="px-4 py-2 text-xs text-muted-foreground border-b">{titulo}</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{colNome}</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.nome}>
              <TableCell className="text-sm font-medium uppercase">{r.nome}</TableCell>
              <TableCell
                className={cn(
                  "text-sm font-semibold text-right tabular-nums",
                  accent === "emerald" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400",
                )}
              >
                {money(r.valor)}
              </TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <TableRow>
              <TableCell colSpan={2} className="text-sm text-muted-foreground text-center py-8">
                Nenhum registro
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}
