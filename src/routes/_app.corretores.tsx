import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { CORRETORES, brl } from "@/lib/mock-data";
import { Plus, Trophy, Target, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_app/corretores")({
  head: () => ({ meta: [{ title: "Corretores — Imob CRM" }] }),
  component: Corretores,
});

function Corretores() {
  return (
    <div>
      <PageHeader
        title="Corretores"
        description="Equipe de vendas e performance individual."
        actions={<Button size="sm"><Plus className="w-4 h-4 mr-1" />Novo corretor</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total de corretores", value: CORRETORES.length, icon: Trophy },
          { label: "Meta agregada", value: CORRETORES.reduce((s, c) => s + c.meta, 0), icon: Target },
          { label: "Vendas do mês", value: CORRETORES.reduce((s, c) => s + c.vendas, 0), icon: TrendingUp },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-semibold">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CORRETORES.map((c) => {
          const pct = Math.min(100, Math.round((c.vendas / c.meta) * 100));
          return (
            <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium truncate">{c.nome}</div>
                      <Badge variant={c.status === "Ativo" ? "default" : "secondary"} className="text-[10px]">{c.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{c.creci}</div>
                    <div className="text-xs text-muted-foreground">{c.equipe}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Meta mensal</span>
                    <span className="font-medium">{c.vendas}/{c.meta} vendas</span>
                  </div>
                  <Progress value={pct} />
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t text-center">
                  <div>
                    <div className="text-lg font-semibold">{c.leads}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Leads</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{c.vendas}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Vendas</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-primary">{brl(c.valorVendido)}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Vendido</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
