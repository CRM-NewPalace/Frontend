import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { EvolucaoBadge, FinanceKpiCard } from "@/components/finance-kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  fetchCorretorVendas,
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
import { VendasResumoDialog } from "@/components/vendas-resumo-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fetchConstrutoraVendas, type ConstrutoraVenda } from "@/lib/construtoras-api";

export const Route = createFileRoute("/_app/corretores")({
  head: () => ({ meta: [{ title: "Ranking — Zone Connection" }] }),
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
  const [vendasAlvo, setVendasAlvo] = useState<{
    kind: "construtora" | "corretor";
    id: string;
    nome: string;
  } | null>(null);
  const [vendasItems, setVendasItems] = useState<ConstrutoraVenda[]>([]);
  const [loadingVendas, setLoadingVendas] = useState(false);

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

  useEffect(() => {
    if (!vendasAlvo) {
      setVendasItems([]);
      return;
    }
    let cancelled = false;
    setLoadingVendas(true);
    const request =
      vendasAlvo.kind === "construtora"
        ? fetchConstrutoraVendas(vendasAlvo.id, { mes, ano }).then(
            (result) => result.items,
          )
        : fetchCorretorVendas(vendasAlvo.id, { mes, ano }).then(
            (result) => result.items,
          );
    void request
      .then((items) => {
        if (!cancelled) setVendasItems(items);
      })
      .catch((err) => {
        if (cancelled) return;
        setVendasItems([]);
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar as vendas.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingVendas(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vendasAlvo, mes, ano]);

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
          <SelectTrigger className="h-9 w-38 bg-background">
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
          <SelectTrigger className="h-9 w-22 bg-background">
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
          title="Ranking"
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
        title="Ranking"
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
              tone="blue-1"
              format="number"
            />
            <FinanceKpiCard
              label="Vendas do mês"
              value={data.totais.vendas ?? 0}
              icon={TrendingUp}
              tone="blue-2"
              format="number"
            />
            <FinanceKpiCard
              label="VGV do mês"
              value={data.totais.vgv ?? 0}
              icon={Wallet}
              tone="blue-3"
              format="money"
            />
            <FinanceKpiCard
              label="Taxa de conversão"
              value={data.totais.taxaConversao ?? 0}
              icon={Goal}
              tone="blue-4"
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
            <PodioCorretores
              corretores={data.corretores}
              onSelect={(row) =>
                setVendasAlvo({
                  kind: "corretor",
                  id: row.corretorId,
                  nome: row.nome,
                })
              }
            />
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <RankingList
                corretores={data.corretores}
                onSelect={(row) =>
                  setVendasAlvo({
                    kind: "corretor",
                    id: row.corretorId,
                    nome: row.nome,
                  })
                }
              />
              <ConstrutorasRanking
                items={data.construtoras}
                selectedId={
                  vendasAlvo?.kind === "construtora" ? vendasAlvo.id : undefined
                }
                onSelect={(item) =>
                  setVendasAlvo({
                    kind: "construtora",
                    id: item.construtoraId,
                    nome: item.nome,
                  })
                }
              />
            </div>
          </section>

          {showRankingGerentes && (
            <section className="mt-5 mb-6">
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <UsersRound className="h-4 w-4 text-primary" />
                    Ranking Gerentes
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Agregado pela equipe liderada · ordenado por VGV do mês.
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  {data.gerentes.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-6 py-4">
                      Nenhuma equipe com gerente cadastrada.
                    </p>
                  ) : (
                    <Table className="min-w-200 [&_th]:px-4 [&_td]:px-4">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Gerente</TableHead>
                          <TableHead className="text-right">
                            Corretores
                          </TableHead>
                          <TableHead className="text-right">Leads</TableHead>
                          <TableHead className="text-right">Entradas</TableHead>
                          <TableHead className="text-right">Visitas</TableHead>
                          <TableHead className="text-right">Vendas</TableHead>
                          <TableHead className="text-right">VGV</TableHead>
                          <TableHead className="text-right">Conv.</TableHead>
                          <TableHead className="text-right">Perdidos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.gerentes.map((r) => (
                          <GerenteRow key={r.gerenteId} row={r} />
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </section>
          )}
        </>
      )}
      <VendasResumoDialog
        open={Boolean(vendasAlvo)}
        onOpenChange={(open) => {
          if (!open) setVendasAlvo(null);
        }}
        title={
          vendasAlvo
            ? `Vendas de ${vendasAlvo.nome}`
            : "Vendas"
        }
        items={vendasItems}
        loading={loadingVendas}
        mode={vendasAlvo?.kind === "corretor" ? "corretor" : "construtora"}
      />
    </div>
  );
}

function PodioCorretores({
  corretores,
  onSelect,
}: {
  corretores: DashboardRankingCorretor[];
  onSelect: (row: DashboardRankingCorretor) => void;
}) {
  const slots = [
    {
      row: corretores[1],
      place: 2 as const,
      step: "h-24 sm:h-28",
      avatar:
        "border-slate-300 bg-slate-200 text-slate-800 ring-slate-300/60",
      stepBg:
        "bg-gradient-to-b from-slate-200 to-slate-400 text-slate-800 rounded-tl-2xl",
    },
    {
      row: corretores[0],
      place: 1 as const,
      step: "h-36 sm:h-44",
      avatar:
        "border-amber-300 bg-amber-400 text-amber-950 ring-amber-300/50",
      stepBg:
        "bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 rounded-t-2xl shadow-md z-[1]",
    },
    {
      row: corretores[2],
      place: 3 as const,
      step: "h-20 sm:h-24",
      avatar:
        "border-orange-300 bg-orange-500 text-orange-950 ring-orange-300/50",
      stepBg:
        "bg-gradient-to-b from-orange-300 to-orange-500 text-orange-950 rounded-tr-2xl",
    },
  ].filter((s) => Boolean(s.row));

  if (slots.length === 0) return null;

  return (
    <Card className="overflow-hidden bg-linear-to-br from-card via-card to-muted/70 text-foreground">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
          <Trophy className="h-4 w-4" /> Pódio de vendas · corretores
        </div>

        <div className="mx-auto mt-6 max-w-lg">
          <div className="flex items-end justify-center gap-0">
            {slots.map(({ row, place, step, avatar, stepBg }) => {
              if (!row) return null;
              const initials = row.nome
                .split(" ")
                .slice(0, 2)
                .map((name) => name[0])
                .join("");

              return (
                <button
                  key={row.corretorId}
                  type="button"
                  onClick={() => onSelect(row)}
                  className="flex min-w-0 flex-1 flex-col items-center"
                >
                  <div className="mb-3 flex w-full flex-col items-center px-1 text-center sm:px-2">
                    <div
                      className={cn(
                        "podio-float relative flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-bold ring-4 sm:h-14 sm:w-14",
                        place === 1 && "podio-float-delay-1",
                        place === 2 && "podio-float-delay-2",
                        place === 3 && "podio-float-delay-3",
                        avatar,
                        place === 1 && "h-14 w-14 sm:h-16 sm:w-16 text-base",
                      )}
                    >
                      {initials}
                      {place === 1 ? (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold leading-none text-amber-950 shadow-sm sm:text-xs">
                          1º
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 w-full truncate text-xs font-semibold sm:text-sm">
                      {row.nome}
                    </p>
                    <p className="text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
                      {row.vendas.valor} venda
                      {row.vendas.valor === 1 ? "" : "s"}
                      <br className="sm:hidden" />
                      <span className="hidden sm:inline"> · </span>
                      {money(row.vgv.valor)}
                    </p>
                  </div>

                  <div
                    className={cn(
                      "flex w-full flex-col items-center justify-start gap-1 border border-b-0 border-black/5 pt-3",
                      step,
                      stepBg,
                    )}
                  >
                    <span className="text-base font-black tracking-tight sm:text-lg">
                      #{place}
                    </span>
                    {place === 1 ? (
                      <Trophy className="h-4 w-4 opacity-80" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="h-2.5 rounded-b-2xl bg-[#032b43]/25 shadow-inner" />
        </div>
      </CardContent>
    </Card>
  );
}

function rankTextClass(place: number) {
  if (place === 1) {
    return "text-amber-500 dark:text-amber-400";
  }
  if (place === 2) {
    return "text-slate-400 dark:text-slate-300";
  }
  if (place === 3) {
    return "text-[#8B6914] dark:text-[#C4A35A]";
  }
  return "text-muted-foreground";
}

function RankingList({
  corretores,
  onSelect,
}: {
  corretores: DashboardRankingCorretor[];
  onSelect: (row: DashboardRankingCorretor) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Medal className="h-4 w-4 text-amber-500" /> Ranking geral · corretores por venda
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Clique no corretor para ver as vendas.
        </p>
      </CardHeader>
      <CardContent className="space-y-0 p-0">
        {corretores.slice(0, 8).map((row) => {
          const place = row.posicao;
          const topThree = place <= 3;
          return (
            <button
              key={row.corretorId}
              type="button"
              onClick={() => onSelect(row)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/60"
            >
              <span
                className={cn(
                  "w-5 text-xs font-bold",
                  topThree ? rankTextClass(place) : "text-muted-foreground",
                )}
              >
                #{place}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-sm text-foreground",
                  topThree ? "font-bold" : "font-medium",
                )}
              >
                {row.nome}
              </span>
              <span className="text-xs text-muted-foreground">
                {row.vendas.valor} vendas
              </span>
              <span className="text-xs font-semibold tabular-nums">
                {money(row.vgv.valor)}
              </span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ConstrutorasRanking({
  items,
  selectedId,
  onSelect,
}: {
  items: Array<{
    construtoraId: string;
    nome: string;
    vendas: number;
    vgv: number;
  }>;
  selectedId?: string;
  onSelect: (item: {
    construtoraId: string;
    nome: string;
    vendas: number;
    vgv: number;
  }) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 text-primary" /> Top construtoras · VGV
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Clique na construtora para ver os corretores e o VGV de cada venda.
        </p>
      </CardHeader>
      <CardContent className="space-y-0 p-0">
        {items.length ? (
          items.map((item, index) => {
            const place = index + 1;
            const topThree = place <= 3;
            const selected = item.construtoraId === selectedId;
            return (
              <button
                key={item.construtoraId}
                type="button"
                onClick={() => onSelect(item)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/60",
                  selected && "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "w-5 text-xs font-bold",
                    topThree ? rankTextClass(place) : "text-muted-foreground",
                  )}
                >
                  #{place}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm text-foreground",
                    topThree ? "font-bold" : "font-medium",
                  )}
                >
                  {item.nome}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.vendas} {item.vendas === 1 ? "venda" : "vendas"}
                </span>
                <span className="text-xs font-semibold tabular-nums">
                  {money(item.vgv)}
                </span>
              </button>
            );
          })
        ) : (
          <p className="px-4 py-5 text-center text-sm text-muted-foreground">
            Nenhuma venda no período.
          </p>
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
    <TableRow className="align-top">
      <TableCell className="tabular-nums text-muted-foreground">
        {row.posicao}
      </TableCell>
      <TableCell>
        <div className="font-medium">{row.nome}</div>
        <div className="text-xs text-muted-foreground">{row.equipe}</div>
      </TableCell>
      <TableCell className="text-right tabular-nums">{row.corretores}</TableCell>
      <TableCell className="text-right tabular-nums">{row.leads ?? 0}</TableCell>
      <TableCell className="text-right">
        <div className="tabular-nums font-medium">{entradas}</div>
        <EvolucaoBadge
          value={row.entradas.evolucaoPct ?? 0}
          previous={row.entradas.valorMesAnterior ?? 0}
        />
      </TableCell>
      <TableCell className="text-right tabular-nums">{row.visitas ?? 0}</TableCell>
      <TableCell className="text-right">
        <div className="tabular-nums font-medium">{vendas}</div>
        <EvolucaoBadge
          value={row.vendas.evolucaoPct ?? 0}
          previous={row.vendas.valorMesAnterior ?? 0}
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="tabular-nums font-medium">{money(vgv)}</div>
        <EvolucaoBadge
          value={row.vgv.evolucaoPct ?? 0}
          previous={row.vgv.valorMesAnterior ?? 0}
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="tabular-nums font-medium">
          {conversao.toLocaleString("pt-BR", {
            maximumFractionDigits: 1,
          })}
          %
        </div>
        <EvolucaoBadge value={row.taxaConversao.evolucaoPct ?? 0} />
      </TableCell>
      <TableCell className="text-right tabular-nums">{row.perdidos ?? 0}</TableCell>
    </TableRow>
  );
}
