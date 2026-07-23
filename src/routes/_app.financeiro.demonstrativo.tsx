import { createFileRoute } from "@tanstack/react-router";
import { Fragment } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FINANCEIRO, brl } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/financeiro/demonstrativo")({
  head: () => ({ meta: [{ title: "Demonstrativo de resultado — Financeiro" }] }),
  component: Demonstrativo,
});

const DRE = [
  {
    grupo: "Receita operacional",
    itens: [
      { conta: "Comissões de vendas", valor: FINANCEIRO.comissoes },
      { conta: "Sinais e reservas", valor: 28500 },
      { conta: "Taxas administrativas", valor: 12400 },
    ],
  },
  {
    grupo: "(-) Deduções",
    itens: [
      { conta: "Impostos sobre receita", valor: -18200 },
      { conta: "Cancelamentos / estornos", valor: -4500 },
    ],
  },
  {
    grupo: "(-) Custos e despesas",
    itens: [
      { conta: "Comissões pagas a corretores", valor: -45000 },
      { conta: "Marketing e portais", valor: -11700 },
      { conta: "Estrutura e aluguel", valor: -12000 },
      { conta: "Pessoal administrativo", valor: -28000 },
      { conta: "Serviços contábeis / TI", valor: -5600 },
    ],
  },
];

function Demonstrativo() {
  const receitaBruta = DRE[0].itens.reduce((s, i) => s + i.valor, 0);
  const deducoes = DRE[1].itens.reduce((s, i) => s + i.valor, 0);
  const despesas = DRE[2].itens.reduce((s, i) => s + i.valor, 0);
  const resultado = receitaBruta + deducoes + despesas;

  return (
    <div>
      <PageHeader
        title="Demonstrativo de resultado"
        description="DRE simplificado do período corrente."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Receita bruta</div>
            <div className="text-xl font-semibold text-success">{brl(receitaBruta)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Despesas + deduções</div>
            <div className="text-xl font-semibold text-destructive">{brl(Math.abs(deducoes + despesas))}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Resultado líquido</div>
            <div className={cn("text-xl font-semibold", resultado >= 0 ? "text-success" : "text-destructive")}>
              {brl(resultado)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">DRE — Julho/2026</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DRE.map((grupo) => (
                <Fragment key={grupo.grupo}>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell colSpan={2} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {grupo.grupo}
                    </TableCell>
                  </TableRow>
                  {grupo.itens.map((item) => (
                    <TableRow key={item.conta}>
                      <TableCell className="text-sm pl-6">{item.conta}</TableCell>
                      <TableCell
                        className={cn(
                          "text-sm font-medium text-right",
                          item.valor < 0 ? "text-destructive" : "text-foreground",
                        )}
                      >
                        {brl(item.valor)}
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
              <TableRow className="bg-primary/5 hover:bg-primary/5">
                <TableCell className="text-sm font-semibold">Resultado líquido do período</TableCell>
                <TableCell
                  className={cn(
                    "text-sm font-bold text-right",
                    resultado >= 0 ? "text-success" : "text-destructive",
                  )}
                >
                  {brl(resultado)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
