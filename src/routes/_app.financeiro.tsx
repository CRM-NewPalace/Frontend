import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FINANCEIRO, RECEITA_MES, CORRETORES, brl } from "@/lib/mock-data";
import { ArrowDownRight, ArrowUpRight, DollarSign, Wallet, Clock, CreditCard } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_app/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Imob CRM" }] }),
  component: Financeiro,
});

const CARDS = [
  { label: "Receitas do mês", value: FINANCEIRO.receitas, icon: ArrowUpRight, color: "text-success", bg: "bg-success/10" },
  { label: "Despesas do mês", value: FINANCEIRO.despesas, icon: ArrowDownRight, color: "text-destructive", bg: "bg-destructive/10" },
  { label: "Saldo", value: FINANCEIRO.saldo, icon: Wallet, color: "text-primary", bg: "bg-primary/10" },
  { label: "Comissões", value: FINANCEIRO.comissoes, icon: DollarSign, color: "text-info", bg: "bg-info/10" },
  { label: "A receber", value: FINANCEIRO.aReceber, icon: Clock, color: "text-warning-foreground", bg: "bg-warning/10" },
  { label: "A pagar", value: FINANCEIRO.aPagar, icon: CreditCard, color: "text-muted-foreground", bg: "bg-muted" },
];

const RECEITAS = [
  { desc: "Comissão venda IM-2001", cliente: "João Pereira", valor: 24000, data: "18/07", status: "Recebido" },
  { desc: "Comissão venda IM-2003", cliente: "Beatriz Costa", valor: 35600, data: "15/07", status: "Recebido" },
  { desc: "Sinal proposta IM-2007", cliente: "Ricardo Santos", valor: 12000, data: "20/07", status: "Pendente" },
  { desc: "Locação IM-2004", cliente: "Camila Rocha", valor: 4200, data: "10/07", status: "Recebido" },
];
const DESPESAS = [
  { desc: "Marketing digital", fornecedor: "Agência XYZ", categoria: "Marketing", valor: 8500, data: "05/07", status: "Pago" },
  { desc: "Aluguel escritório", fornecedor: "Imob Corp", categoria: "Estrutura", valor: 12000, data: "01/07", status: "Pago" },
  { desc: "Comissões corretores", fornecedor: "Folha", categoria: "Pessoal", valor: 45000, data: "05/07", status: "Pago" },
  { desc: "Portais imobiliários", fornecedor: "Zap", categoria: "Marketing", valor: 3200, data: "10/07", status: "Pendente" },
];

function Financeiro() {
  return (
    <div>
      <PageHeader title="Financeiro" description="Receitas, despesas, comissões e fluxo de caixa." />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="p-4">
                <div className={`w-8 h-8 rounded-lg ${c.bg} ${c.color} flex items-center justify-center mb-2`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-lg font-semibold">{brl(c.value)}</div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Fluxo de caixa — últimos 7 meses</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer>
            <AreaChart data={RECEITA_MES}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
              <Tooltip />
              <Area type="monotone" dataKey="receita" stroke="var(--color-primary)" fill="url(#g)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Tabs defaultValue="receitas">
        <TabsList>
          <TabsTrigger value="receitas">Receitas</TabsTrigger>
          <TabsTrigger value="despesas">Despesas</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
        </TabsList>
        <TabsContent value="receitas">
          <Card>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Descrição</TableHead><TableHead>Cliente</TableHead>
                <TableHead>Valor</TableHead><TableHead>Data</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {RECEITAS.map((r) => (
                  <TableRow key={r.desc}>
                    <TableCell className="text-sm font-medium">{r.desc}</TableCell>
                    <TableCell className="text-sm">{r.cliente}</TableCell>
                    <TableCell className="text-sm font-semibold text-success">{brl(r.valor)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.data}</TableCell>
                    <TableCell><Badge variant={r.status === "Recebido" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        <TabsContent value="despesas">
          <Card>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Descrição</TableHead><TableHead>Fornecedor</TableHead><TableHead>Categoria</TableHead>
                <TableHead>Valor</TableHead><TableHead>Data</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {DESPESAS.map((d) => (
                  <TableRow key={d.desc}>
                    <TableCell className="text-sm font-medium">{d.desc}</TableCell>
                    <TableCell className="text-sm">{d.fornecedor}</TableCell>
                    <TableCell><Badge variant="outline">{d.categoria}</Badge></TableCell>
                    <TableCell className="text-sm font-semibold text-destructive">{brl(d.valor)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.data}</TableCell>
                    <TableCell><Badge variant={d.status === "Pago" ? "default" : "secondary"}>{d.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        <TabsContent value="comissoes">
          <Card>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Corretor</TableHead><TableHead>Vendas</TableHead><TableHead>Percentual</TableHead>
                <TableHead>Valor</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {CORRETORES.map((c, i) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm font-medium">{c.nome}</TableCell>
                    <TableCell className="text-sm">{c.vendas}</TableCell>
                    <TableCell className="text-sm">3%</TableCell>
                    <TableCell className="text-sm font-semibold">{brl(c.valorVendido * 0.03)}</TableCell>
                    <TableCell><Badge variant={i % 2 ? "default" : "secondary"}>{i % 2 ? "Pago" : "Pendente"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
