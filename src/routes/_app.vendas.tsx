import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  ReceiptText,
  RotateCcw,
  Search,
  UsersRound,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { SemConexao } from "@/components/sem-conexao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { origemBadgeClass } from "@/lib/catalog-colors";
import {
  displayFonte,
  fetchDocumentacoes,
  type Documentacao,
} from "@/lib/documentacao-api";
import { isStatusVendido } from "@/lib/documentacao-status";
import { fetchEquipes, type Equipe } from "@/lib/equipes-api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/vendas")({
  head: () => ({ meta: [{ title: "Vendas — Zone Connection" }] }),
  component: VendasPage,
});

function brl(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function dateDay(value: string | null | undefined) {
  return value?.slice(0, 10) ?? "";
}

function dateBr(value: string | null | undefined) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
}

const APPLY_FILTERS_BTN =
  "rounded-md border-0 bg-transparent text-white shadow-sm hover:bg-transparent hover:brightness-110";
const APPLY_FILTERS_STYLE = {
  backgroundImage: "linear-gradient(135deg, #0e6f8a 0%, #079ED4 100%)",
} as const;

function VendasPage() {
  const user = getSession();
  const canView = user?.role === "admin" || user?.role === "gerente";
  const [docs, setDocs] = useState<Documentacao[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);
  const emptyFilters = {
    search: "",
    equipeId: "__all__",
    gerenteId: "__all__",
    corretorId: "__all__",
    origem: "__all__",
    dataDe: "",
    dataAte: "",
  };
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([fetchDocumentacoes(), fetchEquipes()])
      .then(([documentacoes, equipesData]) => {
        if (!active) return;
        setDocs(documentacoes.filter((doc) => isStatusVendido(doc.status2)));
        setEquipes(equipesData);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Não foi possível carregar as vendas.",
        );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [canView]);

  const corretorEquipe = useMemo(() => {
    const map = new Map<string, Equipe>();
    for (const equipe of equipes) {
      for (const membro of equipe.membros) map.set(membro.id, equipe);
    }
    return map;
  }, [equipes]);

  const gerentes = useMemo(() => {
    const map = new Map<string, string>();
    for (const equipe of equipes) {
      map.set(equipe.gerente.id, equipe.gerente.name);
    }
    for (const doc of docs) {
      if (doc.gerente) map.set(doc.gerente.id, doc.gerente.name);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [docs, equipes]);

  const corretores = useMemo(() => {
    const map = new Map<string, string>();
    for (const equipe of equipes) {
      for (const membro of equipe.membros) {
        if (membro.role === "corretor") map.set(membro.id, membro.name);
      }
    }
    for (const doc of docs) {
      const corretor = doc.corretor ?? doc.lead.corretor;
      if (corretor) map.set(corretor.id, corretor.name);
    }
    return [...map.entries()]
      .filter(([id]) => {
        if (draft.equipeId === "__all__") return true;
        return corretorEquipe.get(id)?.id === draft.equipeId;
      })
      .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [docs, equipes, draft.equipeId, corretorEquipe]);

  const origens = useMemo(
    () =>
      [...new Set(docs.map((doc) => doc.lead.origem).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [docs],
  );

  const filtered = useMemo(() => {
    const query = normalize(applied.search);
    return docs.filter((doc) => {
      const docCorretorId = doc.corretorId ?? doc.lead.corretorId;
      const equipe = docCorretorId
        ? corretorEquipe.get(docCorretorId)
        : undefined;
      const docGerenteId = doc.gerenteId ?? equipe?.gerenteId ?? null;
      const vendaDay = dateDay(doc.dataVenda);
      if (applied.equipeId !== "__all__" && equipe?.id !== applied.equipeId)
        return false;
      if (
        applied.gerenteId !== "__all__" &&
        docGerenteId !== applied.gerenteId
      )
        return false;
      if (
        applied.corretorId !== "__all__" &&
        docCorretorId !== applied.corretorId
      )
        return false;
      if (applied.origem !== "__all__" && doc.lead.origem !== applied.origem)
        return false;
      if (applied.dataDe && (!vendaDay || vendaDay < applied.dataDe))
        return false;
      if (applied.dataAte && (!vendaDay || vendaDay > applied.dataAte))
        return false;
      if (!query) return true;
      return normalize(
        [
          doc.nome,
          doc.construtora?.nome,
          doc.empreendimento?.nome,
          doc.corretor?.name ?? doc.lead.corretor?.name,
          doc.gerente?.name,
          doc.lead.origem,
          equipe?.name,
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(query);
    });
  }, [docs, applied, corretorEquipe]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [applied]);

  const totalVgv = filtered.reduce((sum, doc) => sum + (doc.vgv ?? 0), 0);
  const comVgv = filtered.filter((doc) => (doc.vgv ?? 0) > 0).length;

  const clearFilters = () => {
    setDraft(emptyFilters);
    setApplied(emptyFilters);
  };

  const applyFilters = () => {
    setApplied({ ...draft });
  };

  if (!canView) {
    return (
      <div>
        <PageHeader
          title="Vendas"
          description="Processos finalizados com venda."
        />
        <SemConexao
          title="Acesso restrito"
          description="A página de vendas está disponível para administradores e gerentes."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Vendas"
        description="Todos os processos finalizados com venda e seus responsáveis."
      />

      <section className="grid gap-3 grid-cols-2 xl:grid-cols-3">
        <FinanceKpiCard
          label="Vendas filtradas"
          value={filtered.length}
          icon={ReceiptText}
          tone="emerald"
          format="number"
        />
        <FinanceKpiCard
          label="VGV vendido"
          value={totalVgv}
          icon={Wallet}
          tone="teal"
        />
        <FinanceKpiCard
          label="Vendas com VGV"
          value={comVgv}
          icon={UsersRound}
          tone="violet"
          format="number"
          suffix={`de ${filtered.length}`}
        />
      </section>

      <Card className="mt-5 rounded-lg">
        <CardContent className="space-y-3 pt-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={draft.search}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, search: event.target.value }))
                }
                placeholder="Buscar cliente, empreendimento ou responsável..."
                className="rounded-sm pl-9"
              />
            </div>
            <Select
              value={draft.equipeId}
              onValueChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  equipeId: value,
                  corretorId: "__all__",
                }))
              }
            >
              <SelectTrigger className="rounded-sm">
                <SelectValue placeholder="Todas as equipes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as equipes</SelectItem>
                {equipes.map((equipe) => (
                  <SelectItem key={equipe.id} value={equipe.id}>
                    {equipe.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={draft.gerenteId}
              onValueChange={(value) =>
                setDraft((prev) => ({ ...prev, gerenteId: value }))
              }
            >
              <SelectTrigger className="rounded-sm">
                <SelectValue placeholder="Todos os gerentes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os gerentes</SelectItem>
                {gerentes.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto]">
            <Select
              value={draft.corretorId}
              onValueChange={(value) =>
                setDraft((prev) => ({ ...prev, corretorId: value }))
              }
            >
              <SelectTrigger className="rounded-sm">
                <SelectValue placeholder="Todos os corretores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os corretores</SelectItem>
                {corretores.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={draft.origem}
              onValueChange={(value) =>
                setDraft((prev) => ({ ...prev, origem: value }))
              }
            >
              <SelectTrigger className="rounded-sm">
                <SelectValue placeholder="Todas as origens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as origens</SelectItem>
                {origens.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap">
              <div className="relative min-w-0 flex-1">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  value={draft.dataDe}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      dataDe: event.target.value,
                    }))
                  }
                  className="rounded-sm pl-9"
                  aria-label="Data inicial"
                  title="Data inicial"
                />
              </div>
              <span className="shrink-0 text-sm text-muted-foreground">até</span>
              <div className="relative min-w-0 flex-1">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  value={draft.dataAte}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      dataAte: event.target.value,
                    }))
                  }
                  className="rounded-sm pl-9"
                  aria-label="Data final"
                  title="Data final"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 lg:justify-start">
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-accent transition-colors hover:text-brand-accent/80 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Limpar filtros
              </button>
              <Button
                type="button"
                onClick={applyFilters}
                className={APPLY_FILTERS_BTN}
                style={APPLY_FILTERS_STYLE}
              >
                <Filter className="mr-1.5 h-4 w-4" />
                Aplicar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4 overflow-hidden rounded-2xl">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando vendas…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Nenhuma venda encontrada para os filtros selecionados.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="[&_th]:px-4 [&_td]:px-4">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Empreendimento</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Equipe</TableHead>
                    <TableHead>Gerente</TableHead>
                    <TableHead>Corretor</TableHead>
                    <TableHead>Data da venda</TableHead>
                    <TableHead className="text-right">VGV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((doc) => {
                    const docCorretorId = doc.corretorId ?? doc.lead.corretorId;
                    const equipe = docCorretorId
                      ? corretorEquipe.get(docCorretorId)
                      : undefined;
                    const origemLabel = displayFonte(
                      doc.lead.origem || doc.fonte,
                    );
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="table-person-name">{doc.nome}</div>
                          <div className="text-xs text-muted-foreground">
                            {doc.construtora?.nome ?? "Sem construtora"}
                          </div>
                        </TableCell>
                        <TableCell>{doc.empreendimento?.nome ?? "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={origemBadgeClass(origemLabel)}
                          >
                            {origemLabel}
                          </Badge>
                        </TableCell>
                        <TableCell>{equipe?.name ?? "—"}</TableCell>
                        <TableCell>
                          <span className="table-person-name text-sm">
                            {doc.gerente?.name ?? equipe?.gerente.name ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="table-person-name text-sm">
                            {doc.corretor?.name ?? doc.lead.corretor?.name ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {dateBr(doc.dataVenda)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">
                          {doc.vgv != null ? brl(doc.vgv) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col gap-2 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                Exibindo {pageItems.length} de {filtered.length} resultado
                {filtered.length === 1 ? "" : "s"}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>
                <span className="px-2 tabular-nums text-foreground">
                  Página {currentPage}
                  {totalPages > 1 ? ` de ${totalPages}` : ""}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Próxima página"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
