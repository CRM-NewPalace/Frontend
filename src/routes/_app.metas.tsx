import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getSession } from "@/lib/mock-auth";
import { canViewTeamData } from "@/lib/permissions";
import { useCorretores } from "@/lib/corretores-store";
import { Target, User, Users, Trophy, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/metas")({
  head: () => ({ meta: [{ title: "Metas — Imob CRM" }] }),
  component: MetasPage,
});

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function pct(vendas: number, meta: number) {
  if (meta <= 0) return 0;
  return Math.min(100, Math.round((vendas / meta) * 100));
}

function MetasPage() {
  const user = getSession();
  const canSeeTeam = user ? canViewTeamData(user.role) : false;
  const { corretores, setMetaPessoal } = useCorretores();

  const meuCorretor = useMemo(() => {
    if (!user) return null;
    return (
      corretores.find((c) => c.email.toLowerCase() === user.email.toLowerCase()) ??
      corretores.find((c) => c.nome === user.name) ??
      null
    );
  }, [corretores, user]);

  const [metaInput, setMetaInput] = useState("");

  const equipeStats = useMemo(() => {
    const ativos = corretores.filter((c) => c.status === "Ativo");
    return {
      total: ativos.length,
      bateramGerencia: ativos.filter((c) => c.vendas >= c.meta).length,
      bateramPessoal: ativos.filter((c) => c.vendas >= c.metaPessoal).length,
      metaGerencia: ativos.reduce((s, c) => s + c.meta, 0),
      vendas: ativos.reduce((s, c) => s + c.vendas, 0),
    };
  }, [corretores]);

  function handleSaveMetaPessoal(e: React.FormEvent) {
    e.preventDefault();
    if (!meuCorretor) {
      toast.error("Não encontramos seu cadastro de corretor.");
      return;
    }
    const value = Number(metaInput || meuCorretor.metaPessoal);
    if (!Number.isFinite(value) || value < 1) {
      toast.error("Informe uma meta pessoal válida (mínimo 1).");
      return;
    }
    setMetaPessoal(meuCorretor.id, value);
    setMetaInput("");
    toast.success(`Sua meta pessoal foi definida para ${value} vendas.`);
  }

  // Corretor view
  if (!canSeeTeam) {
    return (
      <div>
        <PageHeader
          title="Metas"
          description="Acompanhe a meta da gerência e defina sua meta pessoal."
        />

        {!meuCorretor ? (
          <Card>
            <CardContent className="p-8 text-sm text-muted-foreground text-center">
              Seu usuário ainda não está vinculado a um corretor cadastrado.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Meta da gerência</CardTitle>
                    <p className="text-xs text-muted-foreground">Definida pelo gerente para você</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-3xl font-semibold tracking-tight">{meuCorretor.meta}</div>
                    <div className="text-xs text-muted-foreground">vendas no mês</div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      meuCorretor.vendas >= meuCorretor.meta
                        ? "bg-success/15 text-success border-success/30"
                        : "bg-warning/15 text-warning-foreground border-warning/30",
                    )}
                  >
                    {meuCorretor.vendas >= meuCorretor.meta ? "Meta atingida" : "Em andamento"}
                  </Badge>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium">
                      {meuCorretor.vendas}/{meuCorretor.meta} · {pct(meuCorretor.vendas, meuCorretor.meta)}%
                    </span>
                  </div>
                  <Progress value={pct(meuCorretor.vendas, meuCorretor.meta)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Minha meta pessoal</CardTitle>
                    <p className="text-xs text-muted-foreground">Você define e acompanha sozinho</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-3xl font-semibold tracking-tight">{meuCorretor.metaPessoal}</div>
                    <div className="text-xs text-muted-foreground">vendas no mês</div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      meuCorretor.vendas >= meuCorretor.metaPessoal
                        ? "bg-success/15 text-success border-success/30"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {meuCorretor.vendas >= meuCorretor.metaPessoal ? "Meta pessoal ok" : "Em andamento"}
                  </Badge>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium">
                      {meuCorretor.vendas}/{meuCorretor.metaPessoal} · {pct(meuCorretor.vendas, meuCorretor.metaPessoal)}%
                    </span>
                  </div>
                  <Progress value={pct(meuCorretor.vendas, meuCorretor.metaPessoal)} />
                </div>

                <form onSubmit={handleSaveMetaPessoal} className="rounded-xl border p-4 space-y-3 bg-muted/20">
                  <Label htmlFor="meta-pessoal" className="text-xs text-muted-foreground">
                    Atualizar meta pessoal
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="meta-pessoal"
                      type="number"
                      min={1}
                      placeholder={String(meuCorretor.metaPessoal)}
                      value={metaInput}
                      onChange={(e) => setMetaInput(e.target.value)}
                      className="h-10 bg-background"
                    />
                    <Button type="submit" className="shrink-0">
                      <Target className="w-4 h-4" />
                      Salvar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // Gerente / Admin view
  return (
    <div>
      <PageHeader
        title="Metas"
        description="Acompanhe as metas da gerência e as metas pessoais da equipe."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Corretores ativos", value: equipeStats.total, icon: Users },
          { label: "Bateram meta gerência", value: equipeStats.bateramGerencia, icon: Trophy },
          { label: "Bateram meta pessoal", value: equipeStats.bateramPessoal, icon: TrendingUp },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Metas da gerência
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground mb-2">
              Definidas em Corretores → Definir metas. Meta agregada: {equipeStats.metaGerencia} vendas · {equipeStats.vendas} realizadas.
            </p>
            {corretores.map((c) => {
              const ok = c.vendas >= c.meta;
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {initials(c.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium truncate">{c.nome}</div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          ok
                            ? "bg-success/15 text-success border-success/30"
                            : "bg-warning/15 text-warning-foreground border-warning/30",
                        )}
                      >
                        {ok ? "Ok" : "Abaixo"}
                      </Badge>
                    </div>
                    <div className="mt-1.5">
                      <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                        <span>{c.vendas}/{c.meta} vendas</span>
                        <span>{pct(c.vendas, c.meta)}%</span>
                      </div>
                      <Progress value={pct(c.vendas, c.meta)} className="h-1.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Metas pessoais dos corretores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground mb-2">
              Cada corretor define a própria meta pessoal na área Metas.
            </p>
            {corretores.map((c) => {
              const ok = c.vendas >= c.metaPessoal;
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {initials(c.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium truncate">{c.nome}</div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          ok
                            ? "bg-success/15 text-success border-success/30"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {ok ? "Pessoal ok" : "Em andamento"}
                      </Badge>
                    </div>
                    <div className="mt-1.5">
                      <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                        <span>{c.vendas}/{c.metaPessoal} vendas</span>
                        <span>{pct(c.vendas, c.metaPessoal)}%</span>
                      </div>
                      <Progress value={pct(c.vendas, c.metaPessoal)} className="h-1.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
