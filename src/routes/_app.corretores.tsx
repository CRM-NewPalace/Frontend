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
  Building2,
  Goal,
  Loader2,
  Medal,
  TrendingUp,
  Trophy,
  UsersRound,
  UserRound,
  Wallet,
} from "lucide-react";
import { SemConexao } from "@/components/sem-conexao";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
            <PodioCorretores corretores={data.corretores} />
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <RankingList corretores={data.corretores} />
              <ConstrutorasRanking items={data.construtoras} />
            </div>
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

function PodioCorretores({
  corretores,
}: {
  corretores: DashboardRankingCorretor[];
}) {
  const podium = [corretores[1], corretores[0], corretores[2]].filter(
    Boolean,
  ) as DashboardRankingCorretor[];
  return (
    <Card className="overflow-hidden bg-gradient-to-br from-card via-card to-muted/70 text-foreground">
      <CardContent className="p-5">
        <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
          <Trophy className="h-4 w-4" /> Pódio de vendas · corretores
        </div>
        <div className="mt-5 flex items-end justify-center gap-3 sm:gap-8">
          {podium.map((row, index) => {
            const position = row.posicao;
            const first = position === 1;
            return (
              <div
                key={row.corretorId}
                className={cn(
                  "flex w-28 flex-col items-center text-center",
                  first && "order-none -translate-y-3",
                )}
              >
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-bold",
                    position === 1
                      ? "border-amber-300 bg-amber-400 text-amber-950"
                      : position === 2
                        ? "border-slate-200 bg-slate-300 text-slate-800"
                        : "border-orange-300 bg-orange-500 text-orange-950",
                  )}
                >
                  {row.nome
                    .split(" ")
                    .slice(0, 2)
                    .map((name) => name[0])
                    .join("")}
                </div>
                <p className="mt-2 truncate text-xs font-semibold">{row.nome}</p>
                <p className="text-[10px] text-muted-foreground">
                  {row.vendas.valor} venda{row.vendas.valor === 1 ? "" : "s"} ·{" "}
                  {money(row.vgv.valor)}
                </p>
                <div
                  className={cn(
                    "mt-3 flex w-full items-center justify-center rounded-t-md text-xs font-bold",
                    position === 1
                      ? "h-12 bg-amber-400 text-amber-950"
                      : position === 2
                        ? "h-8 bg-muted text-foreground"
                        : "h-8 bg-orange-500 text-orange-950",
                  )}
                >
                  #{position}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function RankingList({ corretores }: { corretores: DashboardRankingCorretor[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Medal className="h-4 w-4 text-amber-500" /> Ranking geral · corretores por venda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {corretores.slice(0, 8).map((row) => (
          <div key={row.corretorId} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/60">
            <span className="w-5 text-xs font-bold text-muted-foreground">#{row.posicao}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.nome}</span>
            <span className="text-xs text-muted-foreground">{row.vendas.valor} vendas</span>
            <span className="text-xs font-semibold tabular-nums">{money(row.vgv.valor)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ConstrutorasRanking({
  items,
}: {
  items: Array<{ nome: string; vendas: number; vgv: number }>;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 text-primary" /> Top construtoras · VGV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.length ? items.map((item, index) => (
          <div key={item.nome} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/60">
            <span className="w-5 text-xs font-bold text-muted-foreground">#{index + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.nome}</span>
            <span className="text-xs text-muted-foreground">{item.vendas} vendas</span>
            <span className="text-xs font-semibold tabular-nums">{money(item.vgv)}</span>
          </div>
        )) : (
          <p className="py-5 text-center text-sm text-muted-foreground">Nenhuma venda no período.</p>
        )}
      </CardContent>
    </Card>
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
