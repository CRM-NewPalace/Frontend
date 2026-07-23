import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, CalendarRange, Banknote, CalendarClock, CalendarX2, CircleCheck,
} from "lucide-react";
import {
  moneyBRL,
  useFinanceiroContas,
  type ContaStatus,
  type ContaFinanceira,
} from "@/lib/financeiro-contas-store";

export const Route = createFileRoute("/_app/financeiro/contas-a-pagar")({
  head: () => ({ meta: [{ title: "Contas a pagar — Financeiro" }] }),
  component: ContasAPagar,
});

type Filtro = "todas" | "conta" | "despesa";

function statusBadge(status: ContaStatus) {
  if (status === "atrasado") return <Badge className="bg-red-600 hover:bg-red-600">Atrasado</Badge>;
  if (status === "previsto") return <Badge variant="secondary">Previsto</Badge>;
  if (status === "pago") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Pago</Badge>;
  return <Badge variant="outline">Em aberto</Badge>;
}

function ContasAPagar() {
  const { contasAPagar, getTipoDespesaNome } = useFinanceiroContas();
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const lista = useMemo(() => {
    if (filtro === "todas") return contasAPagar;
    return contasAPagar.filter((c) => (c.classificacao ?? "conta") === filtro);
  }, [contasAPagar, filtro]);

  const kpis = useMemo(() => {
    const base = lista;
    const aberto = base.filter((c) => c.status === "aberto").reduce((s, c) => s + c.valor, 0);
    const atrasado = base.filter((c) => c.status === "atrasado").reduce((s, c) => s + c.valor, 0);
    const previsto = base.filter((c) => c.status === "previsto").reduce((s, c) => s + c.valor, 0);
    const pago = base.filter((c) => c.status === "pago").reduce((s, c) => s + c.valor, 0);
    return { aberto, atrasado, previsto, pago, total: aberto + atrasado + previsto };
  }, [lista]);

  function tipoLabel(c: ContaFinanceira) {
    if (c.classificacao === "despesa") {
      return getTipoDespesaNome(c.tipoDespesaId);
    }
    return c.tipoConta ?? "Conta";
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contas a pagar"
        description={`Total pendente: ${moneyBRL(kpis.total)} — separado por tipo de conta e tipo despesa.`}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/financeiro/centro-despesas">Centro de despesas</Link>
            </Button>
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

      <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
        <TabsList>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="conta">Tipo de contas</TabsTrigger>
          <TabsTrigger value="despesa">Tipo despesas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <FinanceKpiCard label="Em aberto neste mês" value={kpis.aberto} icon={Banknote} tone="orange" />
        <FinanceKpiCard label="Em atraso" value={kpis.atrasado} icon={CalendarX2} tone="red" />
        <FinanceKpiCard label="Previstos" value={kpis.previsto} icon={CalendarClock} tone="violet" />
        <FinanceKpiCard label="Já pagas" value={kpis.pago} icon={CircleCheck} tone="emerald" />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vencimento</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Classificação</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((c) => {
              const isDespesa = c.classificacao === "despesa";
              return (
                <TableRow key={c.id}>
                  <TableCell className="text-sm tabular-nums">
                    {new Date(c.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{c.pessoa}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.descricao}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        isDespesa
                          ? "border-violet-300 text-violet-700 bg-violet-500/10"
                          : "border-orange-300 text-orange-700 bg-orange-500/10"
                      }
                    >
                      {isDespesa ? "Tipo despesa" : "Tipo conta"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tipoLabel(c)}</Badge>
                  </TableCell>
                  <TableCell><Badge variant="outline">{c.categoria}</Badge></TableCell>
                  <TableCell>{statusBadge(c.status)}</TableCell>
                  <TableCell className="text-sm font-semibold text-right text-red-700 dark:text-red-400">
                    {moneyBRL(c.valor)}
                  </TableCell>
                </TableRow>
              );
            })}
            {!lista.length && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                  Nenhuma conta neste filtro.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
