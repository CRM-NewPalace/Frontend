import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { fetchUsadosResumo } from "@/lib/imoveis-usados-api";
import { AlertTriangle, Building2, Calendar, ClipboardCheck, FileSignature, FileText, KeyRound, Loader2, Plus, Store, Users } from "lucide-react";
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
    visitasAgendadas: number;
    visitasRealizadas: number;
    propostasRecebidas: number;
    propostasEmNegociacao: number;
    propostasAceitas: number;
    fechamentosAndamento: number;
    documentacaoPendente: number;
    contratosAguardandoAssinatura: number;
    posVendasAndamento: number;
    posVendasPendentes: number;
    pendenciasAtrasadas: number;
    chavesRetiradas: number;
    chavesPerdidas: number;
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
          <FinanceKpiCard
            label="Visitas agendadas"
            value={resumo.visitasAgendadas}
            tone="teal"
            icon={Calendar}
            format="number"
          />
          <FinanceKpiCard
            label="Visitas realizadas"
            value={resumo.visitasRealizadas}
            tone="emerald"
            icon={Calendar}
            format="number"
          />
          <FinanceKpiCard
            label="Propostas recebidas"
            value={resumo.propostasRecebidas}
            tone="blue"
            icon={FileText}
            format="number"
          />
          <FinanceKpiCard
            label="Propostas em negociação"
            value={resumo.propostasEmNegociacao}
            tone="orange"
            icon={FileText}
            format="number"
          />
          <FinanceKpiCard
            label="Propostas aceitas"
            value={resumo.propostasAceitas}
            tone="violet"
            icon={FileText}
            format="number"
          />
          <FinanceKpiCard
            label="Fechamentos em andamento"
            value={resumo.fechamentosAndamento}
            tone="orange"
            icon={ClipboardCheck}
            format="number"
          />
          <FinanceKpiCard
            label="Documentação pendente"
            value={resumo.documentacaoPendente}
            tone="orange"
            icon={ClipboardCheck}
            format="number"
          />
          <FinanceKpiCard
            label="Contratos aguardando assinatura"
            value={resumo.contratosAguardandoAssinatura}
            tone="teal"
            icon={FileSignature}
            format="number"
          />
          <FinanceKpiCard
            label="Vendas concluídas"
            value={resumo.vendidos}
            tone="emerald"
            icon={Building2}
            format="number"
          />
          <FinanceKpiCard
            label="Pós-vendas em andamento"
            value={resumo.posVendasAndamento}
            tone="blue"
            icon={ClipboardCheck}
            format="number"
          />
          <FinanceKpiCard
            label="Pós-vendas pendentes"
            value={resumo.posVendasPendentes}
            tone="orange"
            icon={ClipboardCheck}
            format="number"
          />
          <FinanceKpiCard
            label="Pendências atrasadas"
            value={resumo.pendenciasAtrasadas}
            tone="orange"
            icon={AlertTriangle}
            format="number"
          />
          <FinanceKpiCard
            label="Chaves retiradas"
            value={resumo.chavesRetiradas}
            tone="teal"
            icon={KeyRound}
            format="number"
          />
          <FinanceKpiCard
            label="Chaves perdidas"
            value={resumo.chavesPerdidas}
            tone="orange"
            icon={KeyRound}
            format="number"
          />
        </div>
      ) : null}
    </>
  );
}
