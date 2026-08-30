import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { situacaoTone, StatusChip } from "@/components/operacao-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { formatBrl } from "@/lib/captacao-api";
import {
  fetchPortalDashboard,
  PORTAL_SITUACAO_LABEL,
  type PortalDashboard,
} from "@/lib/portal-api";
import { Building2, Handshake, Home, Kanban, Store } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/")({
  ssr: false,
  component: PortalDashboardPage,
});

function PortalDashboardPage() {
  const [data, setData] = useState<PortalDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPortalDashboard()
      .then(setData)
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          Resumo
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Meus imóveis</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe o andamento das operações conduzidas pela imobiliária.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <FinanceKpiCard
          label="Total"
          value={data.resumo.total}
          tone="blue"
          icon={Home}
          format="number"
          href="/portal/imoveis"
        />
        <FinanceKpiCard
          label="Disponíveis"
          value={data.resumo.disponiveis}
          tone="emerald"
          icon={Store}
          format="number"
        />
        <FinanceKpiCard
          label="Em negociação"
          value={data.resumo.negociacao}
          tone="orange"
          icon={Handshake}
          format="number"
        />
        <FinanceKpiCard
          label="Vendidos"
          value={data.resumo.vendidos}
          tone="violet"
          icon={Building2}
          format="number"
        />
        <FinanceKpiCard
          label="Em captação"
          value={data.resumo.captacao}
          tone="teal"
          icon={Kanban}
          format="number"
        />
      </div>
      {(data.novidades ?? []).length > 0 ? (
        <Card className="border-primary/15 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Novidades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data.novidades!.slice(0, 8).map((item) => (
              <Link
                key={item.id}
                to="/portal/imoveis/$id"
                params={{ id: item.imovelId }}
                className="block border-l-2 border-primary/30 pl-3 hover:bg-primary/5"
              >
                <p className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString("pt-BR")} · {item.identificacao}
                </p>
                <p>{item.texto}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {data.imoveis.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum imóvel vinculado.</p>
        ) : (
          data.imoveis.map((imovel) => (
            <Link key={imovel.id} to="/portal/imoveis/$id" params={{ id: imovel.id }}>
              <Card className="h-full border-primary/15 shadow-sm transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <CardTitle className="text-base">{imovel.identificacao}</CardTitle>
                  <StatusChip tone={situacaoTone(imovel.situacao)}>
                    {PORTAL_SITUACAO_LABEL[imovel.situacao]}
                  </StatusChip>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  {imovel.fotoUrl ? (
                    <img
                      src={imovel.fotoUrl}
                      alt=""
                      className="mb-2 h-36 w-full rounded-lg object-cover"
                    />
                  ) : null}
                  <p className="font-medium text-foreground">{formatBrl(imovel.valor)}</p>
                  {imovel.proximoPasso ? (
                    <p className="text-foreground/80">{imovel.proximoPasso}</p>
                  ) : null}
                  {imovel.temComercializacao ? (
                    <p>
                      {imovel.interessados} interessados · {imovel.visitas} visitas ·{" "}
                      {imovel.propostas} proposta{imovel.propostas === 1 ? "" : "s"}
                    </p>
                  ) : (
                    <p>Ainda em captação — visitas e propostas aparecem quando o imóvel for à venda.</p>
                  )}
                  {imovel.contato?.corretor ? (
                    <p>Corretor: {imovel.contato.corretor.nome}</p>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
