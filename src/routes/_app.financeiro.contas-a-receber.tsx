import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus, CalendarRange, HandCoins, CalendarX2, CalendarClock, CircleCheck,
} from "lucide-react";
import {
  moneyBRL,
  useFinanceiroContas,
  type ContaStatus,
} from "@/lib/financeiro-contas-store";

export const Route = createFileRoute("/_app/financeiro/contas-a-receber")({
  head: () => ({ meta: [{ title: "Contas a receber — Financeiro" }] }),
  component: ContasAReceber,
});

function statusBadge(status: ContaStatus) {
  if (status === "atrasado") return <Badge className="bg-red-600 hover:bg-red-600">Atrasado</Badge>;
  if (status === "previsto") return <Badge variant="secondary">Previsto</Badge>;
  if (status === "pago") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Recebido</Badge>;
  return <Badge variant="outline">Em aberto</Badge>;
}

function ContasAReceber() {
  const { contasAReceber } = useFinanceiroContas();

  const kpis = useMemo(() => {
    const aberto = contasAReceber.filter((c) => c.status === "aberto").reduce((s, c) => s + c.valor, 0);
    const atrasado = contasAReceber.filter((c) => c.status === "atrasado").reduce((s, c) => s + c.valor, 0);
    const previsto = contasAReceber.filter((c) => c.status === "previsto").reduce((s, c) => s + c.valor, 0);
    const recebido = contasAReceber.filter((c) => c.status === "pago").reduce((s, c) => s + c.valor, 0);
    return { aberto, atrasado, previsto, recebido, total: aberto + atrasado + previsto };
  }, [contasAReceber]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contas a receber"
        description={`Total pendente: ${moneyBRL(kpis.total)} — integrado ao fluxo de caixa.`}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/financeiro/fluxo-caixa">
                <CalendarRange className="w-4 h-4 mr-1" />
                Ver no fluxo
              </Link>
            </Button>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Nova conta
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <FinanceKpiCard label="Em aberto neste mês" value={kpis.aberto} icon={HandCoins} tone="emerald" />
        <FinanceKpiCard label="Em atraso" value={kpis.atrasado} icon={CalendarX2} tone="teal" />
        <FinanceKpiCard label="Previsão de entrada" value={kpis.previsto} icon={CalendarClock} tone="violet" />
        <FinanceKpiCard label="Já recebidas" value={kpis.recebido} icon={CircleCheck} tone="blue" />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vencimento</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contasAReceber.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-sm tabular-nums">
                  {new Date(c.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-sm font-medium">{c.pessoa}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.descricao}</TableCell>
                <TableCell><Badge variant="outline">{c.categoria}</Badge></TableCell>
                <TableCell>{statusBadge(c.status)}</TableCell>
                <TableCell className="text-sm font-semibold text-right text-emerald-700 dark:text-emerald-400">
                  {moneyBRL(c.valor)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
