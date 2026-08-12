import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { brl } from "@/lib/crm-types";
import { ApiError } from "@/lib/api";
import { maskMoneyInput, parseOptionalMoneyInput } from "@/lib/money-input";
import { useLeads } from "@/lib/leads-store";
import {
  fetchAnalises,
  updateAnalise,
  assumirAnalise,
  type Analise,
  type AnaliseStatus,
} from "@/lib/analise-api";
import { getSession } from "@/lib/auth";
import {
  SearchCheck,
  Loader2,
  User,
  Wallet,
  FileText,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Clock3,
  BadgeCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { phoneDigits } from "@/lib/phone";
import { displayEmail } from "@/lib/email";
import { FinanceKpiCard } from "@/components/finance-kpi-card";

export const Route = createFileRoute("/_app/resultado")({
  head: () => ({ meta: [{ title: "Análise — Zone Connection" }] }),
  component: AnalisePage,
});

const CORRETOR_RANKING_PAGE_SIZE = 8;

const STATUS_LABEL: Record<AnaliseStatus, string> = {
  pendente: "Pré-análise",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

function statusBadgeClass(status: AnaliseStatus) {
  if (status === "aprovado")
    return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
  if (status === "reprovado")
    return "bg-destructive/15 text-destructive border-destructive/30";
  if (status === "em_analise")
    return "bg-sky-500/15 text-sky-700 border-sky-500/30";
  return "bg-amber-500/15 text-amber-800 border-amber-500/30";
}

function isLeadVendido(stage: string) {
  const raw = stage
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return raw.includes("vendid");
}

type KpiFilter = "emAnalise" | "aprovado" | "reprovado" | "vendidos";

const KPI_FILTER_LABEL: Record<KpiFilter, string> = {
  emAnalise: "Em análise",
  aprovado: "Aprovados",
  reprovado: "Reprovados",
  vendidos: "Vendidos",
};

function matchesKpiFilter(item: Analise, filter: KpiFilter): boolean {
  if (filter === "emAnalise") {
    return item.status === "em_analise" || item.status === "pendente";
  }
  if (filter === "aprovado") return item.status === "aprovado";
  if (filter === "reprovado") return item.status === "reprovado";
  return (
    isLeadVendido(item.lead.stage) || isLeadVendido(item.stageSituacao)
  );
}

function AnalisePage() {
  const { assignees, loading: leadsLoading } = useLeads();
  const [items, setItems] = useState<Analise[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Analise | null>(null);
  const [statusDraft, setStatusDraft] = useState<AnaliseStatus>("pendente");
  const [parecerDraft, setParecerDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [vgvModalOpen, setVgvModalOpen] = useState(false);
  const [vgvValor, setVgvValor] = useState("");
  const [kpiFilter, setKpiFilter] = useState<KpiFilter | null>(null);
  const [corretorSearch, setCorretorSearch] = useState("");
  const [corretorPage, setCorretorPage] = useState(1);
  const [selectedCorretorId, setSelectedCorretorId] = useState<string | null>(
    null,
  );

  /** Colunas: corretores + admin/gerente com carteira própria. */
  const corretores = useMemo(
    () =>
      assignees.filter(
        (a) =>
          a.role === "corretor" ||
          a.role === "admin" ||
          a.role === "gerente",
      ),
    [assignees],
  );

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchAnalises());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as análises.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const columns = useMemo(() => {
    const byCorretor = new Map<string, Analise[]>();
    for (const item of items) {
      const id = item.lead.corretorId ?? "__none__";
      const list = byCorretor.get(id) ?? [];
      list.push(item);
      byCorretor.set(id, list);
    }

    const cols = corretores.map((c) => ({
      id: c.id,
      name: c.name,
      items: byCorretor.get(c.id) ?? [],
    }));

    // Processos sem corretor (legado) — só se existirem
    const orphan = byCorretor.get("__none__") ?? [];
    if (orphan.length > 0) {
      cols.push({ id: "__none__", name: "Sem corretor", items: orphan });
    }

    // Admin: corretores que têm análise mas não estão em assignees (raro)
    for (const [id, list] of byCorretor) {
      if (id === "__none__") continue;
      if (cols.some((c) => c.id === id)) continue;
      cols.push({
        id,
        name: list[0]?.lead.corretor?.name ?? "Corretor",
        items: list,
      });
    }

    return cols;
  }, [items, corretores]);

  const pipelineSummary = useMemo(() => {
    let emAnalise = 0;
    let aprovado = 0;
    let reprovado = 0;
    let vendidos = 0;
    for (const item of items) {
      if (item.status === "em_analise" || item.status === "pendente") {
        emAnalise += 1;
      } else if (item.status === "aprovado") {
        aprovado += 1;
      } else if (item.status === "reprovado") {
        reprovado += 1;
      }
      if (isLeadVendido(item.lead.stage) || isLeadVendido(item.stageSituacao)) {
        vendidos += 1;
      }
    }
    return { emAnalise, aprovado, reprovado, vendidos };
  }, [items]);

  const filteredByKpi = useMemo(() => {
    if (!kpiFilter) return [];
    return items
      .filter((item) => matchesKpiFilter(item, kpiFilter))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [items, kpiFilter]);

  function toggleKpiFilter(next: KpiFilter) {
    setKpiFilter((prev) => (prev === next ? null : next));
    setSelectedCorretorId(null);
  }

  const corretorRanking = useMemo(() => {
    return columns
      .map((col) => {
        let emAnalise = 0;
        let aprovados = 0;
        for (const item of col.items) {
          if (item.status === "em_analise" || item.status === "pendente") {
            emAnalise += 1;
          } else if (item.status === "aprovado") {
            aprovados += 1;
          }
        }
        return {
          id: col.id,
          nome: col.name,
          total: col.items.length,
          emAnalise,
          aprovados,
        };
      })
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"));
  }, [columns]);

  const corretorRankingFiltered = useMemo(() => {
    const q = corretorSearch.trim().toLowerCase();
    if (!q) return corretorRanking;
    return corretorRanking.filter((row) =>
      row.nome.toLowerCase().includes(q),
    );
  }, [corretorRanking, corretorSearch]);

  const corretorTotalPages = Math.max(
    1,
    Math.ceil(corretorRankingFiltered.length / CORRETOR_RANKING_PAGE_SIZE),
  );

  const corretorCurrentPage = Math.min(corretorPage, corretorTotalPages);

  const corretorRankingVisible = useMemo(() => {
    const start = (corretorCurrentPage - 1) * CORRETOR_RANKING_PAGE_SIZE;
    return corretorRankingFiltered.slice(
      start,
      start + CORRETOR_RANKING_PAGE_SIZE,
    );
  }, [corretorRankingFiltered, corretorCurrentPage]);

  const corretorRankingMax = Math.max(
    1,
    ...corretorRanking.map((row) => row.total),
  );

  const selectedCorretor = useMemo(
    () => corretorRanking.find((row) => row.id === selectedCorretorId) ?? null,
    [corretorRanking, selectedCorretorId],
  );

  const selectedCorretorItems = useMemo(() => {
    if (!selectedCorretorId) return [];
    return items
      .filter(
        (item) => (item.lead.corretorId ?? "__none__") === selectedCorretorId,
      )
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [items, selectedCorretorId]);

  function toggleCorretor(id: string) {
    setSelectedCorretorId((prev) => (prev === id ? null : id));
    setKpiFilter(null);
  }

  function openDetail(item: Analise) {
    setDetail(item);
    setStatusDraft(item.status);
    setParecerDraft(item.parecer ?? "");
  }

  async function handleSaveDetail() {
    if (!detail) return;
    if (statusDraft === "aprovado" && detail.status !== "aprovado") {
      setVgvValor("");
      setVgvModalOpen(true);
      return;
    }
    await commitDetailSave(null);
  }

  async function confirmVgvAndSave() {
    const vgv = parseOptionalMoneyInput(vgvValor);
    if (vgv == null) {
      toast.error("Informe o VGV do processo.");
      return;
    }
    if (vgv < 0) {
      toast.error("VGV inválido.");
      return;
    }
    setVgvModalOpen(false);
    await commitDetailSave(vgv);
  }

  async function commitDetailSave(vgv: number | null) {
    if (!detail) return;
    const previousStatus = detail.status;
    setSaving(true);
    try {
      const updated = await updateAnalise(detail.id, {
        status: statusDraft,
        parecer: parecerDraft.trim() || null,
        ...(vgv != null ? { vgv } : {}),
      });
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setDetail(updated);
      setVgvValor("");

      const isResultado =
        updated.status === "aprovado" || updated.status === "reprovado";
      const statusMudouParaResultado =
        isResultado && previousStatus !== updated.status;

      if (statusMudouParaResultado) {
        toast.success(
          updated.status === "aprovado"
            ? "Processo aprovado — documentação e VGV atualizados."
            : "Processo reprovado — documentação atualizada.",
        );
        openWhatsApp(updated, { silentIfMissing: true });
      } else {
        toast.success("Análise atualizada.");
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar a análise.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openWhatsApp(item: Analise, opts?: { silentIfMissing?: boolean }) {
    const raw = item.lead.corretor?.whatsapp;
    if (!raw) {
      if (!opts?.silentIfMissing) {
        toast.error("Cadastre o WhatsApp do corretor em Usuários.");
      } else {
        toast.message(
          "WhatsApp não aberto: cadastre o número do corretor em Usuários.",
        );
      }
      return;
    }
    const digits = phoneDigits(raw);
    if (digits.length < 10) {
      toast.error("WhatsApp do corretor inválido.");
      return;
    }
    const e164 = digits.startsWith("55") ? digits : `55${digits}`;
    const statusLabel = STATUS_LABEL[item.status];
    const parecer = item.parecer?.trim()
      ? `\nParecer: ${item.parecer.trim()}`
      : "";
    const text = encodeURIComponent(
      `*Resultado da análise*\nCliente: ${item.nome}\nStatus: ${statusLabel}${parecer}`,
    );
    window.open(
      `https://wa.me/${e164}?text=${text}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  const busy = loading || leadsLoading;

  return (
    <div>
      <PageHeader
        title="Análise"
        description="Acompanhe processos em análise por status e por corretor."
      />

      {busy ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando análises...
        </div>
      ) : null}

      {!busy ? (
        <section className="mb-4 grid gap-3 grid-cols-2 xl:grid-cols-4">
          <FinanceKpiCard
            label="Total em análise"
            value={pipelineSummary.emAnalise}
            icon={Clock3}
            tone="blue-1"
            format="number"
            active={kpiFilter === "emAnalise"}
            onClick={() => toggleKpiFilter("emAnalise")}
          />
          <FinanceKpiCard
            label="Aprovado"
            value={pipelineSummary.aprovado}
            icon={CheckCircle2}
            tone="blue-2"
            format="number"
            active={kpiFilter === "aprovado"}
            onClick={() => toggleKpiFilter("aprovado")}
          />
          <FinanceKpiCard
            label="Reprovados"
            value={pipelineSummary.reprovado}
            icon={XCircle}
            tone="blue-3"
            format="number"
            active={kpiFilter === "reprovado"}
            onClick={() => toggleKpiFilter("reprovado")}
          />
          <FinanceKpiCard
            label="Vendidos"
            value={pipelineSummary.vendidos}
            icon={BadgeCheck}
            tone="blue-4"
            format="number"
            active={kpiFilter === "vendidos"}
            onClick={() => toggleKpiFilter("vendidos")}
          />
        </section>
      ) : null}

      {!busy && kpiFilter ? (
        <Card className="mb-4">
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">
                {KPI_FILTER_LABEL[kpiFilter]}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {filteredByKpi.length} processo
                {filteredByKpi.length === 1 ? "" : "s"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setKpiFilter(null)}
            >
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          </CardHeader>
          <CardContent>
            {filteredByKpi.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum processo neste filtro.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {filteredByKpi.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openDetail(item)}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-card p-3 text-left transition-colors hover:border-[#079ED4]/40 hover:bg-muted/30"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="table-person-name text-sm truncate">
                        {item.nome}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.lead.corretor?.name ?? "Sem corretor"}
                        {item.cidade ? ` · ${item.cidade}` : ""}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] shrink-0 capitalize",
                        statusBadgeClass(item.status),
                      )}
                    >
                      {STATUS_LABEL[item.status]}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {!busy && corretorRanking.length > 0 ? (
        <Card className="mb-4 min-w-0 overflow-hidden">
          <CardHeader className="gap-3 space-y-0 pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base">
                  Ranking por corretor
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ordenado do maior para o menor volume — {CORRETOR_RANKING_PAGE_SIZE}{" "}
                  por página.
                </p>
              </div>
              <div className="relative w-full sm:max-w-64">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={corretorSearch}
                  onChange={(e) => {
                    setCorretorSearch(e.target.value);
                    setCorretorPage(1);
                  }}
                  placeholder="Buscar corretor…"
                  className="h-9 pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2.5 font-medium w-10">#</th>
                    <th className="px-3 py-2.5 font-medium">Corretor</th>
                    <th className="px-3 py-2.5 font-medium text-right tabular-nums">
                      Total
                    </th>
                    <th className="px-3 py-2.5 font-medium text-right tabular-nums">
                      Em análise
                    </th>
                    <th className="px-3 py-2.5 font-medium text-right tabular-nums">
                      Aprovados
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {corretorRankingVisible.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-8 text-center text-muted-foreground"
                      >
                        Nenhum corretor encontrado para “{corretorSearch.trim()}
                        ”.
                      </td>
                    </tr>
                  ) : (
                    corretorRankingVisible.map((row) => {
                      const selected = selectedCorretorId === row.id;
                      const pct = Math.min(
                        100,
                        (row.total / corretorRankingMax) * 100,
                      );
                      const rank =
                        corretorRanking.findIndex((r) => r.id === row.id) + 1;
                      return (
                        <tr
                          key={row.id}
                          className={cn(
                            "border-b border-border/40 last:border-0 cursor-pointer transition-colors",
                            selected
                              ? "bg-[#079ED4]/10"
                              : "hover:bg-muted/40",
                          )}
                          onClick={() => toggleCorretor(row.id)}
                        >
                          <td className="px-3 py-2.5 text-muted-foreground tabular-nums">
                            {rank}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="min-w-0 space-y-1.5">
                              <div className="table-person-name truncate">
                                {row.nome}
                              </div>
                              <div className="h-1.5 max-w-56 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-[#079ED4]"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                            {row.total}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-[#057AA8]">
                            {row.emAnalise}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600">
                            {row.aprovados}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {corretorRankingFiltered.length > 0 ? (
              <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Exibindo {corretorRankingVisible.length} de{" "}
                  {corretorRankingFiltered.length} corretor
                  {corretorRankingFiltered.length === 1 ? "" : "es"}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                    disabled={corretorCurrentPage <= 1}
                    onClick={() => setCorretorPage((p) => Math.max(1, p - 1))}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </button>
                  <span className="px-2 tabular-nums text-foreground">
                    Página {corretorCurrentPage}
                    {corretorTotalPages > 1
                      ? ` de ${corretorTotalPages}`
                      : ""}
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                    disabled={corretorCurrentPage >= corretorTotalPages}
                    onClick={() =>
                      setCorretorPage((p) =>
                        Math.min(corretorTotalPages, p + 1),
                      )
                    }
                    aria-label="Próxima página"
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}

            {selectedCorretor ? (
              <div className="rounded-lg border border-border/60 p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium table-person-name">
                      {selectedCorretor.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedCorretorItems.length} processo
                      {selectedCorretorItems.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCorretorId(null)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Fechar
                  </Button>
                </div>
                {selectedCorretorItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 text-center">
                    Nenhum processo deste corretor.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {selectedCorretorItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openDetail(item)}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-card p-3 text-left transition-colors hover:border-[#079ED4]/40 hover:bg-muted/30"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="table-person-name text-sm truncate">
                            {item.nome}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {item.cidade || "—"}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] shrink-0 capitalize",
                            statusBadgeClass(item.status),
                          )}
                        >
                          {STATUS_LABEL[item.status]}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center">
                Clique em um corretor para ver os processos.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {!busy && items.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl border border-dashed bg-muted/20">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <SearchCheck className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Nenhuma análise encontrada</p>
          <p className="text-xs text-muted-foreground mt-1">
            Processos entram aqui ao avançar para Em análise no funil.
          </p>
        </div>
      ) : null}

      <FormDialogShell
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        icon={<SearchCheck className="w-5 h-5" />}
        title={detail?.nome ?? "Análise"}
        description={
          detail
            ? `${detail.lead.corretor?.name ?? "Sem corretor"} · ${detail.cidade}`
            : undefined
        }
        className="max-w-lg"
      >
        {detail && (
          <>
            <FormDialogBody>
              <FormSection
                icon={<User className="w-3.5 h-3.5 text-primary" />}
                title="Cadastro"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <DetailField
                    label="E-mail"
                    value={displayEmail(detail.email) || "—"}
                  />
                  <DetailField label="Telefone" value={detail.telefone} />
                  <DetailField label="Origem" value={detail.origem} />
                  <DetailField label="Interesse" value={detail.interesse} />
                  <DetailField label="Bairro" value={detail.bairro} />
                  <DetailField
                    label="Renda"
                    value={detail.renda != null ? brl(detail.renda) : "—"}
                  />
                  <DetailField
                    label="Construtora"
                    value={detail.lead.construtora?.nome ?? "—"}
                  />
                  <DetailField
                    label="Empreendimento"
                    value={detail.lead.empreendimento?.nome ?? "—"}
                  />
                  <DetailField
                    label="Gerente do corretor"
                    value={detail.lead.corretor?.equipe?.gerente.name ?? "—"}
                  />
                </div>
              </FormSection>

              <FormSection
                icon={<Wallet className="w-3.5 h-3.5 text-primary" />}
                title="Financeiro"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <DetailField
                    label="FGTS"
                    value={
                      detail.temFgts
                        ? detail.valorFgts != null
                          ? brl(detail.valorFgts)
                          : "Sim"
                        : "Não"
                    }
                  />
                  <DetailField
                    label="Entrada"
                    value={
                      detail.temEntrada
                        ? detail.valorEntrada != null
                          ? brl(detail.valorEntrada)
                          : "Sim"
                        : "Não"
                    }
                  />
                  <DetailField
                    label="Dependente"
                    value={detail.temDependente ? "Sim" : "Não"}
                  />
                </div>
              </FormSection>

              <FormSection
                icon={<FileText className="w-3.5 h-3.5 text-primary" />}
                title="Parecer"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Status
                  </Label>
                  <Select
                    value={statusDraft}
                    onValueChange={(v) => setStatusDraft(v as AnaliseStatus)}
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pré-análise</SelectItem>
                      <SelectItem value="em_analise">Em análise</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="reprovado">Reprovado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Parecer
                  </Label>
                  <Textarea
                    value={parecerDraft}
                    onChange={(e) => setParecerDraft(e.target.value)}
                    placeholder="Observações da análise..."
                    className="min-h-24 bg-background"
                  />
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDetail(null)}
              >
                Fechar
              </Button>
              {detail.status === "pendente" && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saving}
                  onClick={() => {
                    void (async () => {
                      setSaving(true);
                      try {
                        const updated = await assumirAnalise(detail.id);
                        setItems((prev) =>
                          prev.map((x) => (x.id === updated.id ? updated : x)),
                        );
                        setDetail(updated);
                        setStatusDraft(updated.status);
                        toast.success("Processo assumido (Em análise).");
                      } catch (err) {
                        toast.error(
                          err instanceof ApiError
                            ? err.message
                            : "Não foi possível assumir.",
                        );
                      } finally {
                        setSaving(false);
                      }
                    })();
                  }}
                >
                  Assumir
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                disabled={!detail.lead.corretor?.whatsapp}
                title={
                  detail.lead.corretor?.whatsapp
                    ? "Abrir WhatsApp de novo (também abre ao salvar aprovado/reprovado)"
                    : "Cadastre o WhatsApp do corretor em Usuários"
                }
                onClick={() => openWhatsApp(detail)}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                WhatsApp
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveDetail()}
              >
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Salvar
              </Button>
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>

      <Dialog
        open={vgvModalOpen}
        onOpenChange={(o) => {
          if (!o) {
            setVgvModalOpen(false);
            setVgvValor("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Informe o VGV</DialogTitle>
            <DialogDescription>
              {detail
                ? `Valor geral de vendas do processo de ${detail.nome}. Esse valor atualiza a documentação e os indicadores.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-1">
            <Label htmlFor="resultado-vgv">VGV (R$)</Label>
            <Input
              id="resultado-vgv"
              inputMode="numeric"
              placeholder="0,00"
              value={vgvValor}
              onChange={(e) => setVgvValor(maskMoneyInput(e.target.value))}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setVgvModalOpen(false);
                setVgvValor("");
              }}
            >
              Voltar
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void confirmVgvAndSave()}
            >
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Confirmar aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-medium break-all">{value}</div>
    </div>
  );
}
