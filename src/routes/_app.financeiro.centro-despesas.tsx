import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import {
  createDespesa,
  createDespesaTipo,
  deleteDespesa,
  deleteDespesaTipo,
  fetchCentrosDespesa,
  fetchDespesas,
  fetchDespesaTipos,
  updateDespesa,
  updateDespesaTipo,
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
  type CentroDespesaResumo,
  type DespesaLancamento,
  type DespesaTipo,
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
  Loader2,
  Pencil,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_app/financeiro/centro-despesas")({
  head: () => ({ meta: [{ title: "Centro de despesas — Zone Connection" }] }),
  component: Page,
});

const chartConfig = {
  orcado: { label: "Orçado", color: "hsl(215 20% 55%)" },
  realizado: { label: "Realizado", color: "hsl(173 80% 36%)" },
} satisfies ChartConfig;

const NATUREZA_LABEL: Record<NaturezaDespesa, string> = {
  fixa: "Fixa",
  variavel: "Variável",
};

type TipoForm = {
  nome: string;
  natureza: NaturezaDespesa;
  orcadoMensal: string;
  ativo: boolean;
};

type DespesaForm = {
  tipoId: string;
  descricao: string;
  valor: string;
  data: string;
  observacao: string;
  ativo: boolean;
};

const emptyTipoForm = (natureza: NaturezaDespesa): TipoForm => ({
  nome: "",
  natureza,
  orcadoMensal: "",
  ativo: true,
});

const emptyDespesaForm = (tipoId = ""): DespesaForm => ({
  tipoId,
  descricao: "",
  valor: "",
  data: new Date().toISOString().slice(0, 10),
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
  const [centros, setCentros] = useState<CentroDespesaResumo[]>([]);
  const [tipos, setTipos] = useState<DespesaTipo[]>([]);
  const [despesas, setDespesas] = useState<DespesaLancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");
  const [search, setSearch] = useState("");

  const [tipoOpen, setTipoOpen] = useState(false);
  const [tipoMode, setTipoMode] = useState<"create" | "edit">("create");
  const [editingTipoId, setEditingTipoId] = useState<string | null>(null);
  const [tipoForm, setTipoForm] = useState<TipoForm>(() => emptyTipoForm("fixa"));
  const [savingTipo, setSavingTipo] = useState(false);
  const [deleteTipo, setDeleteTipo] = useState<DespesaTipo | null>(null);
  const [deletingTipo, setDeletingTipo] = useState(false);

  const [despesaOpen, setDespesaOpen] = useState(false);
  const [despesaMode, setDespesaMode] = useState<"create" | "edit">("create");
  const [editingDespesaId, setEditingDespesaId] = useState<string | null>(null);
  const [despesaForm, setDespesaForm] = useState<DespesaForm>(() =>
    emptyDespesaForm(),
  );
  const [savingDespesa, setSavingDespesa] = useState(false);
  const [deleteDespesaTarget, setDeleteDespesaTarget] =
    useState<DespesaLancamento | null>(null);
  const [deletingDespesa, setDeletingDespesa] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, t, d] = await Promise.all([
        fetchCentrosDespesa(),
        fetchDespesaTipos(),
        fetchDespesas(),
      ]);
      setCentros(c);
      setTipos(t);
      setDespesas(d);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o centro de despesas.",
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

  const despesasDaAba = useMemo(() => {
    const q = search.trim().toLowerCase();
    return despesas
      .filter((d) => d.natureza === naturezaTab)
      .filter((d) => {
        if (!q) return true;
        return (
          d.descricao.toLowerCase().includes(q) ||
          d.tipoNome.toLowerCase().includes(q) ||
          d.observacao.toLowerCase().includes(q)
        );
      });
  }, [despesas, naturezaTab, search]);

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
    const fixas = despesas
      .filter((d) => d.natureza === "fixa" && d.ativo)
      .reduce((s, d) => s + d.valor, 0);
    const variaveis = despesas
      .filter((d) => d.natureza === "variavel" && d.ativo)
      .reduce((s, d) => s + d.valor, 0);
    const orcado = chartRows.reduce((s, r) => s + r.orcado, 0);
    const realizado = chartRows.reduce((s, r) => s + r.realizado, 0);
    return {
      fixas,
      variaveis,
      total: fixas + variaveis,
      orcado,
      realizado,
      saldo: orcado - realizado,
      pct: orcado ? (realizado / orcado) * 100 : 0,
    };
  }, [despesas, chartRows]);

  function openCreateTipo() {
    setTipoMode("create");
    setEditingTipoId(null);
    setTipoForm(emptyTipoForm(naturezaTab));
    setTipoOpen(true);
  }

  function openEditTipo(t: DespesaTipo) {
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

  function openCreateDespesa() {
    const firstTipo = tiposDaAba.find((t) => t.ativo)?.id ?? "";
    setDespesaMode("create");
    setEditingDespesaId(null);
    setDespesaForm(emptyDespesaForm(firstTipo));
    setDespesaOpen(true);
  }

  function openEditDespesa(d: DespesaLancamento) {
    setDespesaMode("edit");
    setEditingDespesaId(d.id);
    setDespesaForm({
      tipoId: d.tipoId,
      descricao: d.descricao,
      valor: formatMoneyInput(d.valor),
      data: d.data.slice(0, 10),
      observacao: d.observacao || "",
      ativo: d.ativo,
    });
    setDespesaOpen(true);
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
        await updateDespesaTipo(editingTipoId, {
          nome,
          natureza: tipoForm.natureza,
          orcadoMensal,
          ativo: tipoForm.ativo,
        });
        toast.success("Tipo atualizado.");
      } else {
        await createDespesaTipo({
          nome,
          natureza: tipoForm.natureza,
          orcadoMensal,
          ativo: tipoForm.ativo,
        });
        toast.success("Tipo cadastrado.");
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

  async function handleSubmitDespesa(e: FormEvent) {
    e.preventDefault();
    const descricao = despesaForm.descricao.trim();
    const valor = parseMoney(despesaForm.valor);
    if (!despesaForm.tipoId) {
      toast.error("Selecione um tipo de despesa.");
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
    if (!despesaForm.data) {
      toast.error("Informe a data.");
      return;
    }

    setSavingDespesa(true);
    try {
      const payload = {
        tipoId: despesaForm.tipoId,
        descricao,
        valor,
        data: despesaForm.data,
        observacao: despesaForm.observacao.trim() || undefined,
        ativo: despesaForm.ativo,
      };
      if (despesaMode === "edit" && editingDespesaId) {
        await updateDespesa(editingDespesaId, payload);
        toast.success("Despesa atualizada.");
      } else {
        await createDespesa(payload);
        toast.success("Despesa cadastrada.");
      }
      setDespesaOpen(false);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar a despesa.",
      );
    } finally {
      setSavingDespesa(false);
    }
  }

  async function confirmDeleteTipo() {
    if (!deleteTipo) return;
    setDeletingTipo(true);
    try {
      await deleteDespesaTipo(deleteTipo.id);
      toast.success(`Tipo "${deleteTipo.nome}" removido.`);
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

  async function confirmDeleteDespesa() {
    if (!deleteDespesaTarget) return;
    setDeletingDespesa(true);
    try {
      await deleteDespesa(deleteDespesaTarget.id);
      toast.success("Despesa removida.");
      setDeleteDespesaTarget(null);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível remover a despesa.",
      );
    } finally {
      setDeletingDespesa(false);
    }
  }

  const tiposParaSelect = useMemo(() => {
    const base = tipos.filter((t) => t.ativo || t.id === despesaForm.tipoId);
    if (despesaMode === "create") {
      return base.filter((t) => t.natureza === naturezaTab);
    }
    return base;
  }, [tipos, despesaForm.tipoId, despesaMode, naturezaTab]);

  return (
    <div>
      <PageHeader
        title="Centro de despesas"
        description="Cadastre tipos fixos e variáveis e lance despesas por centro de custo"
        actions={
          <>
            <Button type="button" variant="outline" onClick={openCreateTipo}>
              <Plus className="w-4 h-4 mr-1" />
              Novo tipo
            </Button>
            <Button type="button" onClick={openCreateDespesa}>
              <Plus className="w-4 h-4 mr-1" />
              Nova despesa
            </Button>
          </>
        }
      />

      <FinanceiroFiltrosBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filtrar tipo ou despesa…"
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        hasActive={Boolean(search || periodo !== "mes")}
        onClear={() => {
          setSearch("");
          setPeriodo("mes");
        }}
      />

      <section className="grid gap-3 sm:grid-cols-3 mb-4">
        <FinanceKpiCard
          label="Despesas fixas"
          value={totais.fixas}
          icon={Target}
          tone="blue"
        />
        <FinanceKpiCard
          label="Despesas variáveis"
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
          <TabsTrigger value="variavel">Variável</TabsTrigger>
        </TabsList>

        <TabsContent value={naturezaTab} className="mt-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando centro de despesas…
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
                      Cadastre um tipo {NATUREZA_LABEL[naturezaTab].toLowerCase()}{" "}
                      para ver o comparativo orçado × realizado.
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
                    Tipos {NATUREZA_LABEL[naturezaTab].toLowerCase()}s
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
                        <TableHead>Tipo</TableHead>
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
                            Nenhum tipo {NATUREZA_LABEL[naturezaTab].toLowerCase()}{" "}
                            cadastrado.
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
                                  {t.qtdDespesas} despesa
                                  {t.qtdDespesas === 1 ? "" : "s"}
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
                    Despesas {NATUREZA_LABEL[naturezaTab].toLowerCase()}s
                  </h2>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={openCreateDespesa}
                    disabled={tiposDaAba.filter((t) => t.ativo).length === 0}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Nova despesa
                  </Button>
                </div>
                <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[88px] text-right">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {despesasDaAba.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center text-muted-foreground py-10"
                          >
                            Nenhuma despesa nesta aba.
                          </TableCell>
                        </TableRow>
                      ) : (
                        despesasDaAba.map((d) => (
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
                              {formatDateBr(d.data)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-medium">
                              {brl(d.valor)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  d.ativo
                                    ? "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300"
                                    : "text-muted-foreground"
                                }
                              >
                                {d.ativo ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  title="Editar"
                                  onClick={() => openEditDespesa(d)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  title="Excluir"
                                  onClick={() => setDeleteDespesaTarget(d)}
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
                  {despesasDaAba.length} despesa
                  {despesasDaAba.length === 1 ? "" : "s"} nesta aba
                </p>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <FormDialogShell
        open={tipoOpen}
        onOpenChange={setTipoOpen}
        icon={<FolderKanban className="w-5 h-5" />}
        title={tipoMode === "edit" ? "Editar tipo" : "Novo tipo de despesa"}
        description="Classifique como fixa ou variável e defina o orçamento mensal."
      >
        <form onSubmit={handleSubmitTipo}>
          <FormDialogBody className="space-y-4">
            <FormSection>
              <div className="space-y-2">
                <Label htmlFor="tipo-nome">Nome</Label>
                <Input
                  id="tipo-nome"
                  value={tipoForm.nome}
                  onChange={(e) =>
                    setTipoForm((f) => ({ ...f, nome: e.target.value }))
                  }
                  placeholder="Ex.: Aluguel, Marketing…"
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
        open={despesaOpen}
        onOpenChange={setDespesaOpen}
        icon={<Target className="w-5 h-5" />}
        title={despesaMode === "edit" ? "Editar despesa" : "Nova despesa"}
        description="Lance o valor vinculado a um tipo fixo ou variável."
      >
        <form onSubmit={handleSubmitDespesa}>
          <FormDialogBody className="space-y-4">
            <FormSection>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={despesaForm.tipoId || undefined}
                  onValueChange={(v) =>
                    setDespesaForm((f) => ({ ...f, tipoId: v }))
                  }
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
                    Cadastre um tipo nesta aba antes de lançar a despesa.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="desp-desc">Descrição</Label>
                <Input
                  id="desp-desc"
                  value={despesaForm.descricao}
                  onChange={(e) =>
                    setDespesaForm((f) => ({
                      ...f,
                      descricao: e.target.value,
                    }))
                  }
                  placeholder="Ex.: Aluguel março"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="desp-valor">Valor (R$)</Label>
                  <Input
                    id="desp-valor"
                    value={despesaForm.valor}
                    onChange={(e) =>
                      setDespesaForm((f) => ({
                        ...f,
                        valor: maskMoneyInput(e.target.value),
                      }))
                    }
                    placeholder="0,00"
                    inputMode="numeric"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desp-data">Data</Label>
                  <Input
                    id="desp-data"
                    type="date"
                    value={despesaForm.data}
                    onChange={(e) =>
                      setDespesaForm((f) => ({ ...f, data: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="desp-obs">Observação</Label>
                <Input
                  id="desp-obs"
                  value={despesaForm.observacao}
                  onChange={(e) =>
                    setDespesaForm((f) => ({
                      ...f,
                      observacao: e.target.value,
                    }))
                  }
                  placeholder="Opcional"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <Label htmlFor="desp-ativo">Ativo</Label>
                <Switch
                  id="desp-ativo"
                  checked={despesaForm.ativo}
                  onCheckedChange={(v) =>
                    setDespesaForm((f) => ({ ...f, ativo: v }))
                  }
                />
              </div>
            </FormSection>
          </FormDialogBody>
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDespesaOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={savingDespesa || tiposParaSelect.length === 0}
            >
              {savingDespesa ? (
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
              Ao excluir &quot;{deleteTipo?.nome}&quot;, todas as despesas
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
        open={Boolean(deleteDespesaTarget)}
        onOpenChange={(open) => !open && setDeleteDespesaTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Remover &quot;{deleteDespesaTarget?.descricao}&quot; (
              {deleteDespesaTarget ? brl(deleteDespesaTarget.valor) : ""})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingDespesa}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDeleteDespesa();
              }}
              disabled={deletingDespesa}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingDespesa ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
