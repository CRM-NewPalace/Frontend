import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { EvolucaoBadge, FinanceKpiCard } from "@/components/finance-kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Ano/mês corrente no fuso de Brasília (UTC−3). */
function agoraBrasil() {
  const brasil = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return {
    ano: brasil.getUTCFullYear(),
    mes: brasil.getUTCMonth() + 1,
  };
}

function Page() {
  const user = getSession();
  const canView = user?.role === "admin" || user?.role === "gerente";
  const isGerente = user?.role === "gerente";
  /** Ranking entre gerentes: só admin. */
  const showRankingGerentes = user?.role === "admin";
  const agora = useMemo(() => agoraBrasil(), []);
  const [mes, setMes] = useState(agora.mes);
  const [ano, setAno] = useState(agora.ano);
  const [data, setData] = useState<DashboardRanking | null>(null);
  const [loading, setLoading] = useState(true);

  const anosDisponiveis = useMemo(() => {
    const list: number[] = [];
    for (let y = agora.ano; y >= agora.ano - 5; y -= 1) list.push(y);
    return list;
  }, [agora.ano]);

  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setData(await fetchDashboardRanking({ mes, ano }));
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
  }, [canView, mes, ano]);

  useEffect(() => {
    void load();
  }, [load]);

  const mesLabel = useMemo(
    () =>
      new Date(Date.UTC(ano, mes - 1, 1)).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
    [mes, ano],
  );

  const filtros = (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Mês</Label>
        <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
          <SelectTrigger className="h-9 w-[9.5rem] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MESES_PT.map((nome, idx) => (
              <SelectItem key={nome} value={String(idx + 1)}>
                {nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Ano</Label>
        <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
          <SelectTrigger className="h-9 w-[5.5rem] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {anosDisponiveis.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (!canView) {
    return (
      <div>
        <PageHeader
          title="Corretores"
          description="Ranking e métricas mensais da imobiliária."
        />
        <SemConexao
          title="Acesso restrito"
          description="O ranking de corretores está disponível para administradores e gerentes."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Corretores"
        description={
          isGerente
            ? `Ranking dos corretores da sua equipe · ${mesLabel}.`
            : `Ranking completo e métricas de ${mesLabel}.`
        }
        actions={filtros}
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
          <section className="mt-4 grid gap-3 grid-cols-2 xl:grid-cols-4">
            <FinanceKpiCard
              label="Entradas do mês"
              value={data.totais.entradas ?? 0}
              icon={UsersRound}
              tone="blue"
              format="number"
            />
            <FinanceKpiCard
              label="Vendas do mês"
              value={data.totais.vendas ?? 0}
              icon={TrendingUp}
              tone="emerald"
              format="number"
            />
            <FinanceKpiCard
              label="VGV do mês"
              value={data.totais.vgv ?? 0}
              icon={Wallet}
              tone="teal"
              format="money"
            />
            <FinanceKpiCard
              label="Taxa de conversão"
              value={data.totais.taxaConversao ?? 0}
              icon={Goal}
              tone="violet"
              format="percent"
            />
          </section>

          <p className="mt-3 text-xs text-muted-foreground">
            {data.totais.corretores} corretor
            {data.totais.corretores === 1 ? "" : "es"}
            {showRankingGerentes && (
              <>
                {" "}
                · {data.totais.gerentes} gerente
                {data.totais.gerentes === 1 ? "" : "s"}
              </>
            )}{" "}
            · {data.totais.visitas} visita
            {data.totais.visitas === 1 ? "" : "s"} · {data.totais.perdidos}{" "}
            perdido
            {data.totais.perdidos === 1 ? "" : "s"} no mês
          </p>

          <section className={isGerente ? "mt-5 mb-6" : "mt-5"}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-primary" />
                  Ranking Corretores
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {isGerente
                    ? "Corretores da sua equipe · ordenado por VGV do mês."
                    : "Ordenado por VGV do mês · comparação com o mês anterior."}
                </p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {data.corretores.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    Nenhum corretor ativo.
                  </p>
                ) : (
                  <table className="w-full min-w-240 text-sm">
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

          {showRankingGerentes && (
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
                    <table className="w-full min-w-200 text-sm">
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
          )}
        </>
      )}
    </div>
  );
}

function CorretorRow({ row }: { row: DashboardRankingCorretor }) {
  const vendas = row.vendas.valor ?? 0;
  const vgv = row.vgv.valor ?? 0;
  const entradas = row.entradas.valor ?? 0;
  const conversao = row.taxaConversao.valor ?? 0;
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
      <td className="py-2.5 pr-2 text-right tabular-nums">{row.leads ?? 0}</td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">{entradas}</div>
        <EvolucaoBadge
          value={row.entradas.evolucaoPct ?? 0}
          previous={row.entradas.valorMesAnterior ?? 0}
        />
      </td>
      <td className="py-2.5 pr-2 text-right tabular-nums">{row.visitas ?? 0}</td>
      <td className="py-2.5 pr-2 text-right tabular-nums">
        {row.documentacoes ?? 0}
      </td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">{vendas}</div>
        <EvolucaoBadge
          value={row.vendas.evolucaoPct ?? 0}
          previous={row.vendas.valorMesAnterior ?? 0}
        />
      </td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">{money(vgv)}</div>
        <EvolucaoBadge
          value={row.vgv.evolucaoPct ?? 0}
          previous={row.vgv.valorMesAnterior ?? 0}
        />
      </td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">
          {conversao.toLocaleString("pt-BR", {
            maximumFractionDigits: 1,
          })}
          %
        </div>
        <EvolucaoBadge value={row.taxaConversao.evolucaoPct ?? 0} />
      </td>
      <td className="py-2.5 pr-2 text-right tabular-nums">{row.perdidos ?? 0}</td>
      <td className="py-2.5 text-right">
        {row.meta ? (
          <div className="min-w-22 ml-auto">
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
  const vendas = row.vendas.valor ?? 0;
  const vgv = row.vgv.valor ?? 0;
  const entradas = row.entradas.valor ?? 0;
  const conversao = row.taxaConversao.valor ?? 0;
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
      <td className="py-2.5 pr-2 text-right tabular-nums">{row.leads ?? 0}</td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">{entradas}</div>
        <EvolucaoBadge
          value={row.entradas.evolucaoPct ?? 0}
          previous={row.entradas.valorMesAnterior ?? 0}
        />
      </td>
      <td className="py-2.5 pr-2 text-right tabular-nums">{row.visitas ?? 0}</td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">{vendas}</div>
        <EvolucaoBadge
          value={row.vendas.evolucaoPct ?? 0}
          previous={row.vendas.valorMesAnterior ?? 0}
        />
      </td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">{money(vgv)}</div>
        <EvolucaoBadge
          value={row.vgv.evolucaoPct ?? 0}
          previous={row.vgv.valorMesAnterior ?? 0}
        />
      </td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">
          {conversao.toLocaleString("pt-BR", {
            maximumFractionDigits: 1,
          })}
          %
        </div>
        <EvolucaoBadge value={row.taxaConversao.evolucaoPct ?? 0} />
      </td>
      <td className="py-2.5 text-right tabular-nums">{row.perdidos ?? 0}</td>
    </tr>
  );
}
