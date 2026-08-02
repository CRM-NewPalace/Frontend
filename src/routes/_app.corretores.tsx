import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { EvolucaoBadge, FinanceKpiCard } from "@/components/finance-kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  fetchDashboardRanking,
  type DashboardRanking,
  type DashboardRankingCorretor,
  type DashboardRankingGerente,
} from "@/lib/dashboard-api";
import {
  Goal,
  Loader2,
  TrendingUp,
  UsersRound,
  UserRound,
  Wallet,
} from "lucide-react";
import { SemConexao } from "@/components/sem-conexao";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/corretores")({
  head: () => ({ meta: [{ title: "Corretores — Zone Connection" }] }),
  component: Page,
});

const META_TIPO_LABEL: Record<string, string> = {
  vendas: "Vendas",
  documentacoes: "Docs",
  vgv: "VGV",
};

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatMesLabel(inicioIso: string) {
  const d = new Date(inicioIso);
  return d.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Recife",
  });
}

function Page() {
  const user = getSession();
  const canView = user?.role === "admin" || user?.role === "gerente";
  const [data, setData] = useState<DashboardRanking | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setData(await fetchDashboardRanking());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o ranking.",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canView) {
    return (
      <div>
        <PageHeader
          title="Corretores"
          description="Ranking e métricas mensais da imobiliária."
        />
        <SemConexao
          title="Acesso restrito"
          description="O ranking de corretores e gerentes está disponível para administradores e gerentes."
        />
      </div>
    );
  }

  const mesLabel = data
    ? formatMesLabel(data.periodo.mesAtual.inicio)
    : "mês atual";

  return (
    <div>
      <PageHeader
        title="Corretores"
        description={`Ranking completo e métricas de ${mesLabel}.`}
      />

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando ranking…
        </div>
      ) : !data ? (
        <SemConexao
          title="Sem dados"
          description="Não foi possível carregar o ranking. Tente novamente."
        />
      ) : (
        <>
          <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FinanceKpiCard
              label="Entradas do mês"
              value={data.totais.entradas}
              icon={UsersRound}
              tone="blue"
              format="number"
            />
            <FinanceKpiCard
              label="Vendas do mês"
              value={data.totais.vendas}
              icon={TrendingUp}
              tone="emerald"
              format="number"
            />
            <FinanceKpiCard
              label="VGV do mês"
              value={data.totais.vgv}
              icon={Wallet}
              tone="teal"
              format="money"
            />
            <FinanceKpiCard
              label="Taxa de conversão"
              value={data.totais.taxaConversao}
              icon={Goal}
              tone="violet"
              format="percent"
            />
          </section>

          <p className="mt-3 text-xs text-muted-foreground">
            {data.totais.corretores} corretor
            {data.totais.corretores === 1 ? "" : "es"} · {data.totais.gerentes}{" "}
            gerente
            {data.totais.gerentes === 1 ? "" : "s"} · {data.totais.visitas}{" "}
            visita
            {data.totais.visitas === 1 ? "" : "s"} · {data.totais.perdidos}{" "}
            perdido
            {data.totais.perdidos === 1 ? "" : "s"} no mês
          </p>

          <section className="mt-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-primary" />
                  Ranking Corretores
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ordenado por VGV do mês · comparação com o mês anterior.
                </p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {data.corretores.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    Nenhum corretor ativo.
                  </p>
                ) : (
                  <table className="w-full min-w-[960px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-2 font-medium w-10">#</th>
                        <th className="pb-2 pr-2 font-medium">Corretor</th>
                        <th className="pb-2 pr-2 font-medium text-right">
                          Leads
                        </th>
                        <th className="pb-2 pr-2 font-medium text-right">
                          Entradas
                        </th>
                        <th className="pb-2 pr-2 font-medium text-right">
                          Visitas
                        </th>
                        <th className="pb-2 pr-2 font-medium text-right">
                          Docs
                        </th>
                        <th className="pb-2 pr-2 font-medium text-right">
                          Vendas
                        </th>
                        <th className="pb-2 pr-2 font-medium text-right">
                          VGV
                        </th>
                        <th className="pb-2 pr-2 font-medium text-right">
                          Conv.
                        </th>
                        <th className="pb-2 pr-2 font-medium text-right">
                          Perdidos
                        </th>
                        <th className="pb-2 font-medium text-right">Meta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.corretores.map((r) => (
                        <CorretorRow key={r.corretorId} row={r} />
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="mt-5 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UsersRound className="h-4 w-4 text-primary" />
                  Ranking Gerentes
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Agregado pela equipe liderada · ordenado por VGV do mês.
                </p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {data.gerentes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    Nenhuma equipe com gerente cadastrada.
                  </p>
                ) : (
                  <table className="w-full min-w-[800px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-2 font-medium w-10">#</th>
                        <th className="pb-2 pr-2 font-medium">Gerente</th>
                        <th className="pb-2 pr-2 font-medium text-right">
                          Corretores
                        </th>
                        <th className="pb-2 pr-2 font-medium text-right">
                          Leads
                        </th>
                        <th className="pb-2 pr-2 font-medium text-right">
                          Entradas
                        </th>
                        <th className="pb-2 pr-2 font-medium text-right">
                          Visitas
                        </th>
                        <th className="pb-2 pr-2 font-medium text-right">
                          Vendas
                        </th>
                        <th className="pb-2 pr-2 font-medium text-right">
                          VGV
                        </th>
                        <th className="pb-2 pr-2 font-medium text-right">
                          Conv.
                        </th>
                        <th className="pb-2 font-medium text-right">
                          Perdidos
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.gerentes.map((r) => (
                        <GerenteRow key={r.gerenteId} row={r} />
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function CorretorRow({ row }: { row: DashboardRankingCorretor }) {
  return (
    <tr className="border-b last:border-0 align-top">
      <td className="py-2.5 pr-2 tabular-nums text-muted-foreground">
        {row.posicao}
      </td>
      <td className="py-2.5 pr-2">
        <div className="font-medium">{row.nome}</div>
        <div className="text-xs text-muted-foreground">
          {row.equipe ?? "Sem equipe"}
          {row.gerente ? ` · ${row.gerente}` : ""}
        </div>
      </td>
      <td className="py-2.5 pr-2 text-right tabular-nums">{row.leads}</td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">{row.entradas.valor}</div>
        <EvolucaoBadge
          value={row.entradas.evolucaoPct}
          previous={row.entradas.valorMesAnterior}
        />
      </td>
      <td className="py-2.5 pr-2 text-right tabular-nums">{row.visitas}</td>
      <td className="py-2.5 pr-2 text-right tabular-nums">
        {row.documentacoes}
      </td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">{row.vendas.valor}</div>
        <EvolucaoBadge
          value={row.vendas.evolucaoPct}
          previous={row.vendas.valorMesAnterior}
        />
      </td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">{money(row.vgv.valor)}</div>
        <EvolucaoBadge
          value={row.vgv.evolucaoPct}
          previous={row.vgv.valorMesAnterior}
        />
      </td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">
          {row.taxaConversao.valor.toLocaleString("pt-BR", {
            maximumFractionDigits: 1,
          })}
          %
        </div>
        <EvolucaoBadge value={row.taxaConversao.evolucaoPct} />
      </td>
      <td className="py-2.5 pr-2 text-right tabular-nums">{row.perdidos}</td>
      <td className="py-2.5 text-right">
        {row.meta ? (
          <div className="min-w-[88px] ml-auto">
            <div className="flex items-center justify-end gap-1 text-xs">
              <Badge variant="secondary" className="text-[10px] px-1.5">
                {META_TIPO_LABEL[row.meta.tipo] ?? row.meta.tipo}
              </Badge>
              <span className="tabular-nums font-medium">
                {row.meta.percentual}%
              </span>
            </div>
            <Progress value={row.meta.percentual} className="h-1.5 mt-1" />
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}

function GerenteRow({ row }: { row: DashboardRankingGerente }) {
  return (
    <tr className="border-b last:border-0 align-top">
      <td className="py-2.5 pr-2 tabular-nums text-muted-foreground">
        {row.posicao}
      </td>
      <td className="py-2.5 pr-2">
        <div className="font-medium">{row.nome}</div>
        <div className="text-xs text-muted-foreground">{row.equipe}</div>
      </td>
      <td className="py-2.5 pr-2 text-right tabular-nums">{row.corretores}</td>
      <td className="py-2.5 pr-2 text-right tabular-nums">{row.leads}</td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">{row.entradas.valor}</div>
        <EvolucaoBadge
          value={row.entradas.evolucaoPct}
          previous={row.entradas.valorMesAnterior}
        />
      </td>
      <td className="py-2.5 pr-2 text-right tabular-nums">{row.visitas}</td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">{row.vendas.valor}</div>
        <EvolucaoBadge
          value={row.vendas.evolucaoPct}
          previous={row.vendas.valorMesAnterior}
        />
      </td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">{money(row.vgv.valor)}</div>
        <EvolucaoBadge
          value={row.vgv.evolucaoPct}
          previous={row.vgv.valorMesAnterior}
        />
      </td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">
          {row.taxaConversao.valor.toLocaleString("pt-BR", {
            maximumFractionDigits: 1,
          })}
          %
        </div>
        <EvolucaoBadge value={row.taxaConversao.evolucaoPct} />
      </td>
      <td className="py-2.5 text-right tabular-nums">{row.perdidos}</td>
    </tr>
  );
}
