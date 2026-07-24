import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GERENTES } from "@/lib/mock-data";
import { useCorretores } from "@/lib/corretores-store";
import { useLeads } from "@/lib/leads-store";
import {
  Goal, Users, HandshakeIcon, TrendingUp, ChevronDown, ChevronRight, User,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/taxa-conversao")({
  head: () => ({ meta: [{ title: "Taxa de conversão — Imob CRM" }] }),
  component: TaxaConversaoPage,
});

function pct(vendas: number, leads: number) {
  if (leads <= 0) return 0;
  return Math.round((vendas / leads) * 1000) / 10;
}

function TaxaConversaoPage() {
  const { corretores } = useCorretores();
  const { leads } = useLeads();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const porGerente = useMemo(() => {
    return GERENTES.map((g) => {
      const equipe = corretores.filter(
        (c) => c.gerente === g.nome || g.equipes.includes(c.equipe),
      );

      const membros = equipe.map((c) => {
        const leadsLive = leads.filter((l) => l.corretor === c.nome);
        const vendasLive = leadsLive.filter((l) => l.stage === "venda").length;
        // Prioriza métricas do cadastro do corretor (mais representativas no demo);
        // usa funil ao vivo quando o cadastro ainda não tem volume.
        const totalLeads = Math.max(c.leads, leadsLive.length);
        const totalVendas = Math.max(c.vendas, vendasLive);
        return {
          corretor: c,
          leads: totalLeads,
          vendas: totalVendas,
          taxa: pct(totalVendas, totalLeads),
          leadsFunil: leadsLive.length,
          vendasFunil: vendasLive,
        };
      });

      const totalLeads = membros.reduce((s, m) => s + m.leads, 0);
      const totalVendas = membros.reduce((s, m) => s + m.vendas, 0);

      return {
        gerente: g,
        membros,
        totalLeads,
        totalVendas,
        taxa: pct(totalVendas, totalLeads),
        ativos: membros.filter((m) => m.corretor.status === "Ativo").length,
      };
    }).sort((a, b) => b.taxa - a.taxa);
  }, [corretores, leads]);

  const gerais = useMemo(() => {
    const totalLeads = porGerente.reduce((s, g) => s + g.totalLeads, 0);
    const totalVendas = porGerente.reduce((s, g) => s + g.totalVendas, 0);
    return {
      gerentes: porGerente.length,
      totalLeads,
      totalVendas,
      taxa: pct(totalVendas, totalLeads),
    };
  }, [porGerente]);

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div>
      <PageHeader
        title="Taxa de conversão"
        description="Conversão lead → venda por gerente, com base nas equipes de corretores vinculadas."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-2xl font-semibold tabular-nums">{gerais.gerentes}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Gerentes</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <User className="w-4 h-4" />
            </div>
            <div className="text-2xl font-semibold tabular-nums">{gerais.totalLeads}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Leads das equipes</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <HandshakeIcon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-semibold tabular-nums">{gerais.totalVendas}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Vendas geradas</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Goal className="w-4 h-4" />
            </div>
            <div className="text-2xl font-semibold tabular-nums text-primary">{gerais.taxa}%</div>
            <div className="text-xs text-muted-foreground mt-0.5">Taxa geral</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {porGerente.map((row) => {
          const open = !!expanded[row.gerente.id];
          return (
            <Card key={row.gerente.id} className="overflow-hidden">
              <CardContent className="p-0">
                <button
                  type="button"
                  onClick={() => toggle(row.gerente.id)}
                  className="w-full text-left p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 text-muted-foreground">
                      {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-base truncate">{row.gerente.nome}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 gap-y-1">
                        <span>{row.gerente.equipes.join(", ")}</span>
                        <span>·</span>
                        <span>{row.membros.length} corretores</span>
                        <span>·</span>
                        <span>{row.ativos} ativos</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 sm:gap-6 sm:w-[420px] shrink-0 pl-7 sm:pl-0">
                    <div>
                      <div className="text-[11px] text-muted-foreground">Leads</div>
                      <div className="text-lg font-semibold tabular-nums">{row.totalLeads}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">Vendas</div>
                      <div className="text-lg font-semibold tabular-nums">{row.totalVendas}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">Conversão</div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-semibold tabular-nums text-primary">{row.taxa}%</span>
                        <TrendingUp className="w-3.5 h-3.5 text-success" />
                      </div>
                    </div>
                  </div>
                </button>

                <div className="px-4 sm:px-5 pb-3">
                  <Progress value={Math.min(100, row.taxa)} className="h-2" />
                </div>

                {open && (
                  <div className="border-t bg-muted/20">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Corretor</TableHead>
                          <TableHead>Equipe</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Leads</TableHead>
                          <TableHead className="text-right">Vendas</TableHead>
                          <TableHead className="text-right">Taxa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {row.membros.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              Nenhum corretor vinculado a este gerente.
                            </TableCell>
                          </TableRow>
                        ) : (
                          row.membros
                            .slice()
                            .sort((a, b) => b.taxa - a.taxa)
                            .map((m) => (
                              <TableRow key={m.corretor.id}>
                                <TableCell className="font-medium">{m.corretor.nome}</TableCell>
                                <TableCell>{m.corretor.equipe}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      m.corretor.status === "Ativo"
                                        ? "bg-success/15 text-success"
                                        : "bg-muted text-muted-foreground",
                                    )}
                                  >
                                    {m.corretor.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">{m.leads}</TableCell>
                                <TableCell className="text-right tabular-nums">{m.vendas}</TableCell>
                                <TableCell className="text-right">
                                  <span className="font-semibold tabular-nums text-primary">{m.taxa}%</span>
                                </TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                    <div className="px-4 py-3 text-xs text-muted-foreground border-t">
                      Taxa do gerente = vendas da equipe ÷ leads da equipe.
                      As vendas dos corretores compõem o resultado do gerente.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {porGerente.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum gerente cadastrado.
            <div className="mt-3">
              <Button variant="outline" size="sm" disabled>
                Sem dados
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
