import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { fetchUsadosResumo } from "@/lib/imoveis-usados-api";
import { Building2, Loader2, Plus, Store, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/imoveis-usados/visao-geral")({
  component: UsadosVisaoGeralPage,
});

function UsadosVisaoGeralPage() {
  const [resumo, setResumo] = useState<{
    disponiveis: number;
    reservados: number;
    vendidos: number;
    interessados: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchUsadosResumo()
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
        title="Venda de Usados"
        description="Disponibilize imóveis captados e relacione interessados."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/imoveis-usados/interessados">
                <Users className="mr-1 h-4 w-4" />
                Interessados
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/imoveis-usados/vendas">
                <Plus className="mr-1 h-4 w-4" />
                Imóveis
              </Link>
            </Button>
          </div>
        }
      />
      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      ) : resumo ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FinanceKpiCard
            label="Imóveis disponíveis"
            value={resumo.disponiveis}
            tone="emerald"
            icon={Store}
            format="number"
          />
          <FinanceKpiCard
            label="Imóveis reservados"
            value={resumo.reservados}
            tone="orange"
            icon={Building2}
            format="number"
          />
          <FinanceKpiCard
            label="Imóveis vendidos"
            value={resumo.vendidos}
            tone="blue"
            icon={Building2}
            format="number"
          />
          <FinanceKpiCard
            label="Interessados"
            value={resumo.interessados}
            tone="violet"
            icon={Users}
            format="number"
          />
        </div>
      ) : null}
    </>
  );
}
