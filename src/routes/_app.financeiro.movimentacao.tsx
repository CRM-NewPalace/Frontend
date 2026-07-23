import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, ArrowDownLeft, ArrowUpRight, Wallet, TrendingUp, TrendingDown, CircleDollarSign } from "lucide-react";
import { toast } from "sonner";
import { useFinanceiroContas } from "@/lib/financeiro-contas-store";
import { FinanceKpiCard } from "@/components/finance-kpi-card";

export const Route = createFileRoute("/_app/financeiro/movimentacao")({
  head: () => ({ meta: [{ title: "Movimentação financeira — Financeiro" }] }),
  component: Movimentacao,
});

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseMoneyInput(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/\s/g, "")
    .replace(/R\$\s?/i, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatInput(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ENTRADAS = 1253447.3;
const SAIDAS = 323851.57;

const MOVIMENTOS = [
  { id: "m1", data: "22/07/2026", desc: "Comissão venda IM-2001", tipo: "Entrada", categoria: "Comissão", valor: 24000, conta: "Conta corrente" },
  { id: "m2", data: "21/07/2026", desc: "Marketing digital", tipo: "Saída", categoria: "Marketing", valor: 8500, conta: "Conta corrente" },
  { id: "m3", data: "20/07/2026", desc: "Sinal proposta IM-2007", tipo: "Entrada", categoria: "Sinal", valor: 12000, conta: "Conta corrente" },
  { id: "m4", data: "18/07/2026", desc: "Aluguel escritório", tipo: "Saída", categoria: "Estrutura", valor: 12000, conta: "Conta corrente" },
  { id: "m5", data: "15/07/2026", desc: "Comissão venda IM-2003", tipo: "Entrada", categoria: "Comissão", valor: 35600, conta: "Conta corrente" },
  { id: "m6", data: "10/07/2026", desc: "Portais imobiliários", tipo: "Saída", categoria: "Marketing", valor: 3200, conta: "Cartão corporativo" },
  { id: "m7", data: "05/07/2026", desc: "Comissões corretores", tipo: "Saída", categoria: "Pessoal", valor: 45000, conta: "Conta corrente" },
];

function Movimentacao() {
  const { saldoInicial, setSaldoInicial } = useFinanceiroContas();
  const [inputSaldo, setInputSaldo] = useState(formatInput(saldoInicial));

  useEffect(() => {
    setInputSaldo(formatInput(saldoInicial));
  }, [saldoInicial]);

  const resumo = useMemo(() => {
    const saldo = saldoInicial + ENTRADAS - SAIDAS;
    return {
      saldoAnterior: saldoInicial,
      entradas: ENTRADAS,
      saidas: SAIDAS,
      saldo,
      saldoAtual: saldo,
    };
  }, [saldoInicial]);

  function salvarSaldoInicial() {
    const parsed = parseMoneyInput(inputSaldo);
    if (parsed == null) {
      toast.error("Informe um valor válido para o saldo inicial");
      return;
    }
    setSaldoInicial(parsed);
    setInputSaldo(formatInput(parsed));
    toast.success("Saldo inicial cadastrado");
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Movimentação financeira"
        description="Entradas e saídas registradas no período."
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Nova movimentação
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="space-y-1.5 flex-1 max-w-xs">
              <Label htmlFor="saldo-inicial">Saldo inicial</Label>
              <Input
                id="saldo-inicial"
                inputMode="decimal"
                value={inputSaldo}
                onChange={(e) => setInputSaldo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") salvarSaldoInicial();
                }}
                placeholder="0,00"
              />
              <p className="text-[11px] text-muted-foreground">
                Define o saldo anterior e recalcula o saldo atual.
              </p>
            </div>
          </div>
          <Button onClick={salvarSaldoInicial}>Cadastrar saldo</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <FinanceKpiCard label="Saldo Anterior" value={resumo.saldoAnterior} icon={Wallet} tone="blue" />
        <FinanceKpiCard label="Entradas" value={resumo.entradas} icon={TrendingUp} tone="teal" />
        <FinanceKpiCard label="Saídas" value={resumo.saidas} icon={TrendingDown} tone="rose" />
        <FinanceKpiCard label="Saldo" value={resumo.saldo} icon={CircleDollarSign} tone="violet" />
        <FinanceKpiCard label="Saldo Atual" value={resumo.saldoAtual} icon={Wallet} tone="emerald" />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOVIMENTOS.map((m) => {
              const entrada = m.tipo === "Entrada";
              return (
                <TableRow key={m.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{m.data}</TableCell>
                  <TableCell className="text-sm font-medium">{m.desc}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        entrada
                          ? "border-success/40 text-success bg-success/10"
                          : "border-destructive/40 text-destructive bg-destructive/10"
                      }
                    >
                      {entrada
                        ? <ArrowDownLeft className="w-3 h-3 mr-1" />
                        : <ArrowUpRight className="w-3 h-3 mr-1" />}
                      {m.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{m.categoria}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.conta}</TableCell>
                  <TableCell
                    className={`text-sm font-semibold text-right ${entrada ? "text-success" : "text-destructive"}`}
                  >
                    {entrada ? "+" : "-"}
                    {money(m.valor)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
