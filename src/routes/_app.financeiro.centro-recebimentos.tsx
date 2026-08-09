import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import {
  createRecebimento,
  createRecebimentoTipo,
  deleteRecebimento,
  deleteRecebimentoTipo,
  fetchRecebimentos,
  fetchRecebimentoTipos,
  renovarRecebimentosMes,
  updateRecebimento,
  updateRecebimentoTipo,
} from "@/lib/financeiro-api";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { FinanceiroFiltrosBar } from "@/components/financeiro-filtros";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  brl,
  type CentroRecebimentoResumo,
  type RecebimentoLancamento,
  type RecebimentoTipo,
  type NaturezaDespesa,
  type PeriodoFiltro,
} from "@/lib/financeiro-mock";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseMoneyInput,
} from "@/lib/money-input";
import {
  FolderKanban,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_app/financeiro/centro-recebimentos")({
  head: () => ({ meta: [{ title: "Centro de recebimentos — Zone Connection" }] }),
  component: Page,
});

const chartConfig = {
  orcado: { label: "Orçado", color: "hsl(215 20% 55%)" },
  realizado: { label: "Realizado", color: "hsl(173 80% 36%)" },
} satisfies ChartConfig;

const NATUREZA_LABEL: Record<NaturezaDespesa, string> = {
  fixa: "Fixa",
  fixa_variavel: "Fixa variável",
  variavel: "Variável",
};

function competenciaAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextCompetencia(comp: string): string {
  const [y, m] = comp.split("-").map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

type TipoForm = {
  nome: string;
  natureza: NaturezaDespesa;
  orcadoMensal: string;
  ativo: boolean;
};

type RecebimentoForm = {
  tipoId: string;
  descricao: string;
  valor: string;
  data: string;
  competencia: string;
  recorrente: boolean;
  observacao: string;
  ativo: boolean;
};

const emptyTipoForm = (natureza: NaturezaDespesa): TipoForm => ({
  nome: "",
  natureza,
  orcadoMensal: "",
  ativo: true,
});

const emptyRecebimentoForm = (
  tipoId = "",
  natureza: NaturezaDespesa = "fixa",
): RecebimentoForm => ({
  tipoId,
  descricao: "",
  valor: "",
  data: new Date().toISOString().slice(0, 10),
  competencia: competenciaAtual(),
  recorrente: natureza === "fixa" || natureza === "fixa_variavel",
  observacao: "",
  ativo: true,
});

function parseMoney(value: string): number {
  return parseMoneyInput(value);
}

function formatDateBr(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function Page() {
  const [naturezaTab, setNaturezaTab] = useState<NaturezaDespesa>("fixa");
  const [centros, setCentros] = useState<CentroRecebimentoResumo[]>([]);
  const [tipos, setTipos] = useState<RecebimentoTipo[]>([]);
  const [recebimentos, setRecebimentos] = useState<RecebimentoLancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");
  const [search, setSearch] = useState("");

  const [tipoOpen, setTipoOpen] = useState(false);
  const [tipoMode, setTipoMode] = useState<"create" | "edit">("create");
  const [editingTipoId, setEditingTipoId] = useState<string | null>(null);
  const [tipoForm, setTipoForm] = useState<TipoForm>(() => emptyTipoForm("fixa"));
  const [savingTipo, setSavingTipo] = useState(false);
  const [deleteTipo, setDeleteTipo] = useState<RecebimentoTipo | null>(null);
  const [deletingTipo, setDeletingTipo] = useState(false);

  const [lancamentoOpen, setLancamentoOpen] = useState(false);
  const [lancamentoMode, setLancamentoMode] = useState<"create" | "edit">(
    "create",
  );
  const [editingLancamentoId, setEditingLancamentoId] = useState<string | null>(
    null,
  );
  const [lancamentoForm, setLancamentoForm] = useState<RecebimentoForm>(() =>
    emptyRecebimentoForm(),
  );
  const [savingLancamento, setSavingLancamento] = useState(false);
  const [deleteRecebimentoTarget, setDeleteRecebimentoTarget] =
    useState<RecebimentoLancamento | null>(null);
  const [deletingLancamento, setDeletingLancamento] = useState(false);
  const [renovarCompetencia, setRenovarCompetencia] = useState(() =>
    nextCompetencia(competenciaAtual()),
  );
  const [renovando, setRenovando] = useState(false);
  const [todosTiposOpen, setTodosTiposOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, d] = await Promise.all([
        fetchRecebimentoTipos(),
        fetchRecebimentos(),
      ]);
      setTipos(t);
      setRecebimentos(d);
      setCentros(
        t.map((tipo) => ({
          centro: tipo.nome,
          natureza: tipo.natureza,
          orcado: tipo.orcadoMensal,
          realizado: tipo.realizado,
          percentual:
            tipo.orcadoMensal > 0
              ? (tipo.realizado / tipo.orcadoMensal) * 100
              : 0,
        })),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o Centro de recebimentos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const fator =
    periodo === "trimestre"
      ? 2.9
      : periodo === "ano"
        ? 10
        : periodo === "tudo"
          ? 12
          : 1;

  const tiposDaAba = useMemo(
    () => tipos.filter((t) => t.natureza === naturezaTab),
    [tipos, naturezaTab],
  );

  const todastipos = useMemo(() => {
    const ordem: NaturezaDespesa[] = ["fixa", "fixa_variavel", "variavel"];
    return [...tipos].sort((a, b) => {
      const na = ordem.indexOf(a.natureza);
      const nb = ordem.indexOf(b.natureza);
      if (na !== nb) return na - nb;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  }, [tipos]);

  const lancamentosDaAba = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recebimentos
      .filter((d) => d.natureza === naturezaTab)
      .filter((d) => {
        if (!q) return true;
        return (
          d.descricao.toLowerCase().includes(q) ||
          d.tipoNome.toLowerCase().includes(q) ||
          d.observacao.toLowerCase().includes(q)
        );
      });
  }, [recebimentos, naturezaTab, search]);

  const chartRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return centros
      .filter((c) => !c.natureza || c.natureza === naturezaTab)
      .filter((c) => (q ? c.centro.toLowerCase().includes(q) : true))
      .map((c) => ({
        ...c,
        orcado: Math.round(c.orcado * fator),
        realizado: Math.round(c.realizado * fator),
      }));
  }, [centros, naturezaTab, search, fator]);

  const totais = useMemo(() => {
    const sumNat = (n: NaturezaDespesa) =>
      recebimentos
        .filter((d) => d.natureza === n && d.ativo)
        .reduce((s, d) => s + d.valor, 0);
    const fixas = sumNat("fixa");
    const fixasVariaveis = sumNat("fixa_variavel");
    const variaveis = sumNat("variavel");
    const orcado = chartRows.reduce((s, r) => s + r.orcado, 0);
    const realizado = chartRows.reduce((s, r) => s + r.realizado, 0);
    return {
      fixas,
      fixasVariaveis,
      variaveis,
      total: fixas + fixasVariaveis + variaveis,
      orcado,
      realizado,
      saldo: orcado - realizado,
      pct: orcado ? (realizado / orcado) * 100 : 0,
    };
  }, [recebimentos, chartRows]);

  function openCreateTipo() {
    setTipoMode("create");
    setEditingTipoId(null);
    setTipoForm(emptyTipoForm(naturezaTab));
    setTipoOpen(true);
  }

  function openEditTipo(t: RecebimentoTipo) {
    setTipoMode("edit");
    setEditingTipoId(t.id);
    setTipoForm({
      nome: t.nome,
      natureza: t.natureza,
      orcadoMensal: t.orcadoMensal ? formatMoneyInput(t.orcadoMensal) : "",
      ativo: t.ativo,
    });
    setTipoOpen(true);
  }

  function openCreateRecebimento() {
    const firstTipo = tiposDaAba.find((t) => t.ativo)?.id ?? "";
    setLancamentoMode("create");
    setEditingLancamentoId(null);
    setLancamentoForm(emptyRecebimentoForm(firstTipo, naturezaTab));
    setLancamentoOpen(true);
  }

  function openEditRecebimento(d: RecebimentoLancamento) {
    setLancamentoMode("edit");
    setEditingLancamentoId(d.id);
    setLancamentoForm({
      tipoId: d.tipoId,
      descricao: d.descricao,
      valor: formatMoneyInput(d.valor),
      data: d.data.slice(0, 10),
      competencia: d.competencia || d.data.slice(0, 7),
      recorrente: d.recorrente,
      observacao: d.observacao || "",
      ativo: d.ativo,
    });
    setLancamentoOpen(true);
  }

  async function handleRenovarMes() {
    if (!/^\d{4}-\d{2}$/.test(renovarCompetencia)) {
      toast.error("Informe a competência no formato AAAA-MM.");
      return;
    }
    setRenovando(true);
    try {
      const result = await renovarRecebimentosMes(renovarCompetencia);
      if (result.criadas === 0) {
        toast.message("Nada para renovar", {
          description: `${result.ignoradas} recebimento(s) já existiam ou não eram elegíveis em ${renovarCompetencia}.`,
        });
      } else {
        toast.success(
          `${result.criadas} recebimento(s) renovada(s) para ${renovarCompetencia}.`,
        );
      }
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível renovar os recebimentos.",
      );
    } finally {
      setRenovando(false);
    }
  }

  async function handleSubmitTipo(e: FormEvent) {
    e.preventDefault();
    const nome = tipoForm.nome.trim();
    if (!nome) {
      toast.error("Informe o nome do tipo.");
      return;
    }
    const orcadoMensal = tipoForm.orcadoMensal.trim()
      ? parseMoney(tipoForm.orcadoMensal)
      : 0;
    if (Number.isNaN(orcadoMensal) || orcadoMensal < 0) {
      toast.error("Orçamento mensal inválido.");
      return;
    }

    setSavingTipo(true);
    try {
      if (tipoMode === "edit" && editingTipoId) {
        await updateRecebimentoTipo(editingTipoId, {
          nome,
          natureza: tipoForm.natureza,
          orcadoMensal,
          ativo: tipoForm.ativo,
        });
        toast.success("Categoria atualizada.");
      } else {
        await createRecebimentoTipo({
          nome,
          natureza: tipoForm.natureza,
          orcadoMensal,
          ativo: tipoForm.ativo,
        });
        toast.success("Categoria cadastrada.");
      }
      setTipoOpen(false);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o tipo.",
      );
    } finally {
      setSavingTipo(false);
    }
  }

  async function handleSubmitRecebimento(e: FormEvent) {
    e.preventDefault();
    const descricao = lancamentoForm.descricao.trim();
    const valor = parseMoney(lancamentoForm.valor);
    if (!lancamentoForm.tipoId) {
      toast.error("Selecione um tipo de recebimento.");
      return;
    }
    if (!descricao) {
      toast.error("Informe a descrição.");
      return;
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    if (!lancamentoForm.data) {
      toast.error("Informe a data.");
      return;
    }

    setSavingLancamento(true);
    try {
      const payload = {
        tipoId: lancamentoForm.tipoId,
        descricao,
        valor,
        data: lancamentoForm.data,
        competencia:
          lancamentoForm.competencia.trim() || lancamentoForm.data.slice(0, 7),
        recorrente: lancamentoForm.recorrente,
        observacao: lancamentoForm.observacao.trim() || undefined,
        ativo: lancamentoForm.ativo,
      };
      if (lancamentoMode === "edit" && editingLancamentoId) {
        await updateRecebimento(editingLancamentoId, payload);
        toast.success("Recebimento atualizado.");
      } else {
        await createRecebimento(payload);
        toast.success("Recebimento cadastrado.");
      }
      setLancamentoOpen(false);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o recebimento.",
      );
    } finally {
      setSavingLancamento(false);
    }
  }

  async function confirmDeleteTipo() {
    if (!deleteTipo) return;
    setDeletingTipo(true);
    try {
      await deleteRecebimentoTipo(deleteTipo.id);
      toast.success(`Categoria "${deleteTipo.nome}" removida.`);
      setDeleteTipo(null);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível remover o tipo.",
      );
    } finally {
      setDeletingTipo(false);
    }
  }

  async function confirmdeleteRecebimento() {
    if (!deleteRecebimentoTarget) return;
    setDeletingLancamento(true);
    try {
      await deleteRecebimento(deleteRecebimentoTarget.id);
      toast.success("recebimento removida.");
      setDeleteRecebimentoTarget(null);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível remover o recebimento.",
      );
    } finally {
      setDeletingLancamento(false);
    }
  }

  const tiposParaSelect = useMemo(() => {
    const base = tipos.filter((t) => t.ativo || t.id === lancamentoForm.tipoId);
    if (lancamentoMode === "create") {
      return base.filter((t) => t.natureza === naturezaTab);
    }
    return base;
  }, [tipos, lancamentoForm.tipoId, lancamentoMode, naturezaTab]);

  return (
    <div>
      <PageHeader
        title="Centro de recebimentos"
        description="Gestão dos recebimentos (orçamento, natureza e recebimentos) usadas em todo o financeiro"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Input
                type="month"
                value={renovarCompetencia}
                onChange={(e) => setRenovarCompetencia(e.target.value)}
                className="h-9 w-[150px]"
                aria-label="Competência para renovar"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={renovando}
                onClick={() => void handleRenovarMes()}
              >
                {renovando ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1" />
                )}
                Renovar mês
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTodosTiposOpen(true)}
            >
              <Layers className="w-4 h-4 mr-1" />
              Todos os tipos
            </Button>
            <Button type="button" variant="outline" onClick={openCreateTipo}>
              <Plus className="w-4 h-4 mr-1" />
              Novo tipo
            </Button>
            <Button type="button" onClick={openCreateRecebimento}>
              <Plus className="w-4 h-4 mr-1" />
              Novo recebimento
            </Button>
          </div>
        }
      />

      <FinanceiroFiltrosBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filtrar tipo ou recebimento…"
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        hasActive={Boolean(search || periodo !== "mes")}
        onClear={() => {
          setSearch("");
          setPeriodo("mes");
        }}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-4">
        <FinanceKpiCard
          label="Fixas"
          value={totais.fixas}
          icon={Target}
          tone="blue"
        />
        <FinanceKpiCard
          label="Fixas variáveis"
          value={totais.fixasVariaveis}
          icon={RefreshCw}
          tone="orange"
        />
        <FinanceKpiCard
          label="Variáveis"
          value={totais.variaveis}
          icon={FolderKanban}
          tone="violet"
        />
        <FinanceKpiCard
          label="Total realizado"
          value={totais.total}
          icon={Target}
          tone="teal"
          suffix={
            totais.orcado
              ? `· orçado ${brl(totais.orcado)}`
              : undefined
          }
        />
      </section>

      <Tabs
        value={naturezaTab}
        onValueChange={(v) => setNaturezaTab(v as NaturezaDespesa)}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="fixa">Fixa</TabsTrigger>
          <TabsTrigger value="fixa_variavel">Fixa variável</TabsTrigger>
          <TabsTrigger value="variavel">Variável</TabsTrigger>
        </TabsList>

        <TabsContent value={naturezaTab} className="mt-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando Centro de recebimentos…
            </div>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Comparativo — {NATUREZA_LABEL[naturezaTab]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {chartRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-10 text-center">
                      Cadastre um tipo{" "}
                      {NATUREZA_LABEL[naturezaTab].toLowerCase()} para ver o
                      comparativo orçado × realizado.
                    </p>
                  ) : (
                    <ChartContainer
                      config={chartConfig}
                      className="h-[260px] w-full"
                    >
                      <BarChart data={chartRows} margin={{ left: 8, right: 8 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="centro"
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={56}
                          tickFormatter={(v) =>
                            `${(Number(v) / 1000).toFixed(0)}k`
                          }
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) => brl(Number(value))}
                            />
                          }
                        />
                        <Bar
                          dataKey="orcado"
                          fill="var(--color-orcado)"
                          radius={[3, 3, 0, 0]}
                        />
                        <Bar
                          dataKey="realizado"
                          fill="var(--color-realizado)"
                          radius={[3, 3, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-foreground">
                    tipos {NATUREZA_LABEL[naturezaTab].toLowerCase()}s
                  </h2>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={openCreateTipo}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Novo tipo
                  </Button>
                </div>
                <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Natureza</TableHead>
                        <TableHead className="text-right">Orçado/mês</TableHead>
                        <TableHead className="text-right">Realizado</TableHead>
                        <TableHead>Consumo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[88px] text-right">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tiposDaAba.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-muted-foreground py-10"
                          >
                            Nenhum tipo{" "}
                            {NATUREZA_LABEL[naturezaTab].toLowerCase()}{" "}
                            cadastrada.
                          </TableCell>
                        </TableRow>
                      ) : (
                        tiposDaAba.map((t) => {
                          const pct = t.orcadoMensal
                            ? (t.realizado / t.orcadoMensal) * 100
                            : 0;
                          return (
                            <TableRow key={t.id}>
                              <TableCell className="font-medium">
                                {t.nome}
                                <div className="text-xs text-muted-foreground">
                                  {t.qtdRecebimentos ?? t.qtdDespesas}{" "}
                                  recebimento
                                  {(t.qtdRecebimentos ?? t.qtdDespesas) === 1
                                    ? ""
                                    : "s"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {NATUREZA_LABEL[t.natureza]}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {brl(t.orcadoMensal)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {brl(t.realizado)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 min-w-[120px]">
                                  <Progress
                                    value={Math.min(pct, 100)}
                                    className="h-2"
                                  />
                                  <span className="text-xs tabular-nums text-muted-foreground w-10">
                                    {pct.toFixed(0)}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    t.ativo
                                      ? "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {t.ativo ? "Ativo" : "Inativo"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="inline-flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    title="Editar"
                                    onClick={() => openEditTipo(t)}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    title="Excluir"
                                    onClick={() => setDeleteTipo(t)}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-foreground">
                    recebimentos {NATUREZA_LABEL[naturezaTab].toLowerCase()}s
                  </h2>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={openCreateRecebimento}
                    disabled={tiposDaAba.filter((t) => t.ativo).length === 0}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Novo recebimento
                  </Button>
                </div>
                <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Competência</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Recorrente</TableHead>
                        <TableHead className="w-[88px] text-right">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lancamentosDaAba.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-muted-foreground py-10"
                          >
                            Nenhumo recebimento nesta aba.
                          </TableCell>
                        </TableRow>
                      ) : (
                        lancamentosDaAba.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell className="font-medium">
                              {d.descricao}
                              {d.observacao ? (
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  {d.observacao}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{d.tipoNome}</Badge>
                            </TableCell>
                            <TableCell className="tabular-nums text-muted-foreground">
                              {d.competencia || "—"}
                            </TableCell>
                            <TableCell className="tabular-nums text-muted-foreground">
                              {formatDateBr(d.data)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-medium">
                              {brl(d.valor)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  d.recorrente
                                    ? "border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-300"
                                    : "text-muted-foreground"
                                }
                              >
                                {d.recorrente ? "Sim" : "Não"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  title="Editar"
                                  onClick={() => openEditRecebimento(d)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  title="Excluir"
                                  onClick={() => setDeleteRecebimentoTarget(d)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {lancamentosDaAba.length} recebimento
                  {lancamentosDaAba.length === 1 ? "" : "s"} nesta aba
                </p>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <FormDialogShell
        open={todosTiposOpen}
        onOpenChange={setTodosTiposOpen}
        icon={<Layers className="w-5 h-5" />}
        title="Todos os tipos"
        description="Nome e natureza (fixa, fixa variável ou variável) de cada centro de custo."
        className="max-w-2xl"
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTodosTiposOpen(false)}
            >
              Fechar
            </Button>
            <Button
              type="button"
              onClick={() => {
                setTodosTiposOpen(false);
                openCreateTipo();
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Novo tipo
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody className="space-y-3">
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Natureza</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Orçado/mês</TableHead>
                  <TableHead className="w-[72px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todastipos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-10"
                    >
                      Nenhum tipo cadastrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  todastipos.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.nome}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {NATUREZA_LABEL[t.natureza]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            t.ativo
                              ? "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300"
                              : "text-muted-foreground"
                          }
                        >
                          {t.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {brl(t.orcadoMensal)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Editar"
                          onClick={() => {
                            setTodosTiposOpen(false);
                            openEditTipo(t);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            {todastipos.length} tipo
            {todastipos.length === 1 ? "" : "s"} ·{" "}
            {
              todastipos.filter((t) => t.natureza === "fixa").length
            }{" "}
            fixa(s) ·{" "}
            {
              todastipos.filter((t) => t.natureza === "fixa_variavel")
                .length
            }{" "}
            fixa(s) variável(is) ·{" "}
            {
              todastipos.filter((t) => t.natureza === "variavel").length
            }{" "}
            variável(is)
          </p>
        </FormDialogBody>
      </FormDialogShell>

      <FormDialogShell
        open={tipoOpen}
        onOpenChange={setTipoOpen}
        icon={<FolderKanban className="w-5 h-5" />}
        title={
          tipoMode === "edit" ? "Editar tipo" : "Novo tipo de recebimento"
        }
        description="Ex.: Comissão, Consultoria. Informe a natureza e o orçamento mensal."
      >
        <form onSubmit={handleSubmitTipo}>
          <FormDialogBody className="space-y-4">
            <FormSection title="Tipo">
              <div className="space-y-2">
                <Label htmlFor="tipo-nome">Nome</Label>
                <Input
                  id="tipo-nome"
                  value={tipoForm.nome}
                  onChange={(e) =>
                    setTipoForm((f) => ({ ...f, nome: e.target.value }))
                  }
                  placeholder="Ex.: Estrutural, Marketing…"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Natureza</Label>
                <Select
                  value={tipoForm.natureza}
                  onValueChange={(v) =>
                    setTipoForm((f) => ({
                      ...f,
                      natureza: v as NaturezaDespesa,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixa">Fixa</SelectItem>
                    <SelectItem value="fixa_variavel">Fixa variável</SelectItem>
                    <SelectItem value="variavel">Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo-orcado">Orçamento mensal (R$)</Label>
                <Input
                  id="tipo-orcado"
                  value={tipoForm.orcadoMensal}
                  onChange={(e) =>
                    setTipoForm((f) => ({
                      ...f,
                      orcadoMensal: maskMoneyInput(e.target.value),
                    }))
                  }
                  placeholder="0,00"
                  inputMode="numeric"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <Label htmlFor="tipo-ativo">Ativo</Label>
                <Switch
                  id="tipo-ativo"
                  checked={tipoForm.ativo}
                  onCheckedChange={(v) =>
                    setTipoForm((f) => ({ ...f, ativo: v }))
                  }
                />
              </div>
            </FormSection>
          </FormDialogBody>
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTipoOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={savingTipo}>
              {savingTipo ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              Salvar
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <FormDialogShell
        open={lancamentoOpen}
        onOpenChange={setLancamentoOpen}
        icon={<Target className="w-5 h-5" />}
        title={lancamentoMode === "edit" ? "Editar recebimento" : "Novo recebimento"}
        description="Informe tipo, competência e se o recebimento deve renovar todo mês."
      >
        <form onSubmit={handleSubmitRecebimento}>
          <FormDialogBody className="space-y-4">
            <FormSection title="Lançamento">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={lancamentoForm.tipoId || undefined}
                  onValueChange={(v) => {
                    const tipo = tipos.find((t) => t.id === v);
                    setLancamentoForm((f) => ({
                      ...f,
                      tipoId: v,
                      recorrente:
                        tipo?.natureza === "fixa" ||
                        tipo?.natureza === "fixa_variavel"
                          ? true
                          : false,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposParaSelect.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome} ({NATUREZA_LABEL[t.natureza]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {tiposParaSelect.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Cadastre um tipo nesta aba antes de lançar o recebimento.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="desp-desc">Descrição</Label>
                <Input
                  id="desp-desc"
                  value={lancamentoForm.descricao}
                  onChange={(e) =>
                    setLancamentoForm((f) => ({
                      ...f,
                      descricao: e.target.value,
                    }))
                  }
                  placeholder="Ex.: Aluguel do escritório"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="desp-valor">Valor (R$)</Label>
                  <Input
                    id="desp-valor"
                    value={lancamentoForm.valor}
                    onChange={(e) =>
                      setLancamentoForm((f) => ({
                        ...f,
                        valor: maskMoneyInput(e.target.value),
                      }))
                    }
                    placeholder="0,00"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desp-comp">Competência</Label>
                  <Input
                    id="desp-comp"
                    type="month"
                    value={lancamentoForm.competencia}
                    onChange={(e) =>
                      setLancamentoForm((f) => ({
                        ...f,
                        competencia: e.target.value,
                        data: e.target.value
                          ? `${e.target.value}-01`
                          : f.data,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="desp-data">Data</Label>
                <Input
                  id="desp-data"
                  type="date"
                  value={lancamentoForm.data}
                  onChange={(e) =>
                    setLancamentoForm((f) => ({
                      ...f,
                      data: e.target.value,
                      competencia: e.target.value
                        ? e.target.value.slice(0, 7)
                        : f.competencia,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desp-obs">Observação</Label>
                <Input
                  id="desp-obs"
                  value={lancamentoForm.observacao}
                  onChange={(e) =>
                    setLancamentoForm((f) => ({
                      ...f,
                      observacao: e.target.value,
                    }))
                  }
                  placeholder="Opcional"
                />
              </div>
              {(naturezaTab === "fixa" ||
                naturezaTab === "fixa_variavel") && (
                <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <div>
                    <Label htmlFor="desp-recorrente">Renovar todo mês</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Entra no botão Renovar mês da listagem.
                    </p>
                  </div>
                  <Switch
                    id="desp-recorrente"
                    checked={lancamentoForm.recorrente}
                    onCheckedChange={(v) =>
                      setLancamentoForm((f) => ({ ...f, recorrente: v }))
                    }
                  />
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <Label htmlFor="desp-ativo">Ativo</Label>
                <Switch
                  id="desp-ativo"
                  checked={lancamentoForm.ativo}
                  onCheckedChange={(v) =>
                    setLancamentoForm((f) => ({ ...f, ativo: v }))
                  }
                />
              </div>
            </FormSection>
          </FormDialogBody>
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLancamentoOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={savingLancamento || tiposParaSelect.length === 0}
            >
              {savingLancamento ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              Salvar
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <AlertDialog
        open={Boolean(deleteTipo)}
        onOpenChange={(open) => !open && setDeleteTipo(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tipo?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao excluir &quot;{deleteTipo?.nome}&quot;, todas os recebimentos
              vinculadas também serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingTipo}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDeleteTipo();
              }}
              disabled={deletingTipo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingTipo ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteRecebimentoTarget)}
        onOpenChange={(open) => !open && setDeleteRecebimentoTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recebimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Remover &quot;{deleteRecebimentoTarget?.descricao}&quot; (
              {deleteRecebimentoTarget ? brl(deleteRecebimentoTarget.valor) : ""})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingLancamento}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmdeleteRecebimento();
              }}
              disabled={deletingLancamento}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingLancamento ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
