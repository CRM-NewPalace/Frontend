import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import {
  fetchCaptacaoResumo,
  type CaptacaoResumo,
} from "@/lib/captacao-api";
import { Building2, Home, Kanban, Loader2, Plus, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/captacao/visao-geral")({
  component: CaptacaoVisaoGeralPage,
});

function CaptacaoVisaoGeralPage() {
  const [resumo, setResumo] = useState<CaptacaoResumo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchCaptacaoResumo()
      .then(setResumo)
      .catch((err) => {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar a visão geral.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Captação"
        description="Acompanhe proprietários, imóveis e o funil de captação."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/captacao/proprietarios">
                <Users className="mr-1 h-4 w-4" />
                Proprietários
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/captacao/captacoes">
                <Plus className="mr-1 h-4 w-4" />
                Captações
              </Link>
            </Button>
          </div>
        }
      />
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-10">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      ) : resumo ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <FinanceKpiCard
              label="Proprietários"
              value={resumo.proprietarios}
              tone="blue"
              icon={Users}
              format="number"
            />
            <FinanceKpiCard
              label="Imóveis"
              value={resumo.imoveis}
              tone="teal"
              icon={Building2}
              format="number"
            />
            <FinanceKpiCard
              label="Captações"
              value={resumo.captacoes}
              tone="violet"
              icon={Kanban}
              format="number"
            />
            <FinanceKpiCard
              label="Captações ativas"
              value={resumo.captacoesAtivas}
              tone="orange"
              icon={Home}
              format="number"
            />
            <FinanceKpiCard
              label="Imóveis captados"
              value={resumo.imoveisCaptados}
              tone="emerald"
              icon={Home}
              format="number"
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Captações por etapa</CardTitle>
            </CardHeader>
            <CardContent>
              {resumo.porEtapa.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma captação no funil ainda.
                </p>
              ) : (
                <ul className="space-y-2">
                  {resumo.porEtapa.map((row) => (
                    <li
                      key={row.funilEtapaId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{row.label}</span>
                      <span className="font-medium">{row.total}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
