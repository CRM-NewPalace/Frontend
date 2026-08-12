import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Banknote,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Clock3,
  Eye,
  Loader2,
  Pencil,
  Percent,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { FinanceiroFiltrosBar } from "@/components/financeiro-filtros";
import {
  DetailField,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import {
  createComissao,
  deleteComissao,
  fetchComissoes,
  fetchVendasElegiveisComissao,
  updateComissao,
  type Comissao,
  type ComissaoRelacionamento,
  type ComissaoStatus,
  type VendaElegivelComissao,
} from "@/lib/financeiro-api";
import {
  brl,
  formatDate,
  matchesPeriodoFiltro,
  statusBadgeClass,
  statusLabel,
  type PeriodoFiltro,
} from "@/lib/financeiro-mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/financeiro/comissao")({
  head: () => ({ meta: [{ title: "Comissão — Zone Connection" }] }),
  component: Page,
});

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos os status" },
  { value: "pendente", label: "Pendente" },
  { value: "liberada", label: "Liberada" },
  { value: "paga", label: "Paga" },
];

type FormState = {
  documentacaoId: string;
  percentualImobiliaria: string;
  percentualTributos: string;
  percentualCorretor: string;
  percentualGerente: string;
  percentualCaixa: string;
  percentualSocios: string;
  status: ComissaoStatus;
};

const EMPTY_FORM: FormState = {
  documentacaoId: "",
  percentualImobiliaria: "",
  percentualTributos: "",
  percentualCorretor: "",
  percentualGerente: "",
  percentualCaixa: "",
  percentualSocios: "",
  status: "pendente",
};

function relationName(
  value?: string | ComissaoRelacionamento | null,
  fallback = "—",
) {
  if (typeof value === "string") return value || fallback;
  return value?.nome || value?.name || fallback;
}

function numberValue(value: string | number | undefined) {
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toForm(comissao: Comissao): FormState {
  return {
    documentacaoId: comissao.documentacaoId,
    percentualImobiliaria: String(comissao.percentualImobiliaria ?? ""),
    percentualTributos: String(comissao.percentualTributos ?? ""),
    percentualCorretor: String(comissao.percentualCorretor ?? ""),
    percentualGerente: String(comissao.percentualGerente ?? ""),
    percentualCaixa: String(comissao.percentualCaixa ?? ""),
    percentualSocios: String(comissao.percentualSocios ?? ""),
    status: comissao.status,
  };
}

function Page() {
  const role = getSession()?.role;
  const canManage = role === "admin" || role === "super_admin";
  const commissionValue = useCallback(
    (item: Comissao) =>
      role === "corretor"
        ? item.valorCorretor
        : role === "gerente"
          ? item.valorGerente
          : item.comissaoLiquida,
    [role],
  );
  const commissionValueLabel = canManage ? "Total líquido" : "Total a receber";
  const commissionColumnLabel = canManage ? "Líquida" : "Sua comissão";
  const [items, setItems] = useState<Comissao[]>([]);
  const [eligibleSales, setEligibleSales] = useState<VendaElegivelComissao[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [loadingSales, setLoadingSales] = useState(false);
  const [search, setSearch] = useState("");
  // Padrão "tudo": vendas de meses anteriores (jun/jul) não somem no filtro.
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("tudo");
  const [status, setStatus] = useState("todos");
  const [equipe, setEquipe] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [salePickerOpen, setSalePickerOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Comissao | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detail, setDetail] = useState<Comissao | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchComissoes());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as comissões.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadEligibleSales = useCallback(async () => {
    setLoadingSales(true);
    try {
      setEligibleSales(await fetchVendasElegiveisComissao());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as vendas elegíveis.",
      );
    } finally {
      setLoadingSales(false);
    }
  }, []);

  const selectedSale = useMemo(
    () =>
      eligibleSales.find((sale) => sale.documentacaoId === form.documentacaoId),
    [eligibleSales, form.documentacaoId],
  );

  const editingItem = useMemo(
    () => items.find((item) => item.id === editingId),
    [items, editingId],
  );

  const saleSummary = selectedSale ?? editingItem;
  const percentages = useMemo(
    () => ({
      percentualImobiliaria: numberValue(form.percentualImobiliaria),
      percentualTributos: numberValue(form.percentualTributos),
      percentualCorretor: numberValue(form.percentualCorretor),
      percentualGerente: numberValue(form.percentualGerente),
      percentualCaixa: numberValue(form.percentualCaixa),
      percentualSocios: numberValue(form.percentualSocios),
    }),
    [form],
  );
  const splitTotal =
    percentages.percentualCorretor +
    percentages.percentualGerente +
    percentages.percentualCaixa +
    percentages.percentualSocios;
  const preview = useMemo(() => {
    const vgv = numberValue(saleSummary?.vgv);
    const gross = (vgv * percentages.percentualImobiliaria) / 100;
    const taxes = (gross * percentages.percentualTributos) / 100;
    const net = gross - taxes;
    return {
      gross,
      taxes,
      net,
      broker: (net * percentages.percentualCorretor) / 100,
      manager: (net * percentages.percentualGerente) / 100,
      cash: (net * percentages.percentualCaixa) / 100,
      partners: (net * percentages.percentualSocios) / 100,
    };
  }, [percentages, saleSummary]);

  const equipeOptions = useMemo(() => {
    const names = new Set(
      items
        .map((item) => relationName(item.equipe, ""))
        .filter((name) => name.length > 0),
    );
    return [
      { value: "todos", label: "Todas as equipes" },
      ...[...names].sort().map((name) => ({ value: name, label: name })),
    ];
  }, [items]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (status !== "todos" && item.status !== status) return false;
      if (equipe !== "todos" && relationName(item.equipe) !== equipe)
        return false;
      // Mês atual considera data da venda OU data do lançamento da comissão.
      const inPeriodo =
        matchesPeriodoFiltro(item.dataVenda, periodo) ||
        matchesPeriodoFiltro(item.createdAt, periodo);
      if (!inPeriodo) return false;
      if (!query) return true;
      return [item.corretor, item.cliente, item.empreendimento, item.equipe]
        .map((value) => relationName(value, "").toLowerCase())
        .some((value) => value.includes(query));
    });
  }, [items, search, periodo, status, equipe]);

  const kpis = useMemo(() => {
    const sum = (state?: ComissaoStatus) =>
      rows
        .filter((item) => !state || item.status === state)
        .reduce((total, item) => total + numberValue(commissionValue(item)), 0);
    return {
      total: sum(),
      pending: sum("pendente"),
      released: sum("liberada"),
      paid: sum("paga"),
      vgv: rows.reduce((total, item) => total + numberValue(item.vgv), 0),
    };
  }, [rows, commissionValue]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
    void loadEligibleSales();
  }

  function openEdit(item: Comissao) {
    setMode("edit");
    setEditingId(item.id);
    setForm(toForm(item));
    setDialogOpen(true);
  }

  function upsert(item: Comissao) {
    setItems((current) => [
      item,
      ...current.filter((existing) => existing.id !== item.id),
    ]);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mode === "create" && !form.documentacaoId) {
      toast.error("Selecione uma venda elegível.");
      return;
    }
    if (percentages.percentualImobiliaria <= 0) {
      toast.error("Informe o percentual da imobiliária.");
      return;
    }
    if (
      Object.values(percentages).some(
        (value) => !Number.isFinite(value) || value < 0 || value > 100,
      )
    ) {
      toast.error("Os percentuais devem estar entre 0 e 100.");
      return;
    }
    if (Math.abs(splitTotal - 100) > 0.001) {
      toast.error("Corretor, gerente, caixa e sócios devem somar 100%.");
      return;
    }

    setSaving(true);
    try {
      const saved =
        mode === "edit" && editingId
          ? await updateComissao(editingId, {
              ...percentages,
              status: form.status,
            })
          : await createComissao({
              documentacaoId: form.documentacaoId,
              ...percentages,
            });
      upsert(saved);
      setDialogOpen(false);
      if (mode === "create") {
        setPeriodo("tudo");
        setStatus("todos");
        setEquipe("todos");
        setSearch("");
        toast.success("Comissão lançada.");
        void loadEligibleSales();
        void load();
      } else {
        toast.success("Comissão atualizada.");
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar a comissão.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(item: Comissao, nextStatus: ComissaoStatus) {
    try {
      upsert(await updateComissao(item.id, { status: nextStatus }));
      toast.success(`Status alterado para ${statusLabel(nextStatus)}.`);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível alterar o status.",
      );
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteComissao(deleteTarget.id);
      setItems((current) =>
        current.filter((item) => item.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
      toast.success("Comissão excluída.");
      void loadEligibleSales();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir a comissão.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const hasActive = Boolean(
    search || periodo !== "tudo" || status !== "todos" || equipe !== "todos",
  );

  return (
    <div>
      <PageHeader
        title="Comissão"
        description={
          canManage
            ? "Gestão e distribuição das comissões por venda"
            : "Acompanhe as comissões disponíveis para o seu perfil"
        }
        actions={
          canManage ? (
            <Button type="button" onClick={openCreate}>
              <Plus className="mr-1 size-4" />
              Lançar comissão
            </Button>
          ) : undefined
        }
      />

      <section className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <FinanceKpiCard
          label={commissionValueLabel}
          value={kpis.total}
          icon={Percent}
          tone="blue-1"
        />
        <FinanceKpiCard
          label="Pendentes"
          value={kpis.pending}
          icon={Clock3}
          tone="blue-2"
        />
        <FinanceKpiCard
          label="Liberadas"
          value={kpis.released}
          icon={Banknote}
          tone="blue-3"
        />
        <FinanceKpiCard
          label="Pagas"
          value={kpis.paid}
          icon={CheckCircle2}
          tone="blue-4"
        />
      </section>

      <FinanceiroFiltrosBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar corretor, cliente, empreendimento…"
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        tipo={status}
        onTipoChange={setStatus}
        tipoOptions={STATUS_OPTIONS}
        extra={
          <Select value={equipe} onValueChange={setEquipe}>
            <SelectTrigger className="w-full sm:w-45">
              <SelectValue placeholder="Equipe" />
            </SelectTrigger>
            <SelectContent>
              {equipeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        hasActive={hasActive}
        onClear={() => {
          setSearch("");
          setPeriodo("tudo");
          setStatus("todos");
          setEquipe("todos");
        }}
      />

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <div className="overflow-x-auto">
          <Table className="[&_th]:px-4 [&_td]:px-4">
            <TableHeader>
              <TableRow>
                <TableHead className="h-9">Corretor</TableHead>
                <TableHead className="h-9">Equipe</TableHead>
                <TableHead className="h-9">Empreendimento</TableHead>
                <TableHead className="h-9">Cliente</TableHead>
                <TableHead className="h-9">Data</TableHead>
                <TableHead className="h-9 text-right">VGV</TableHead>
                <TableHead className="h-9 text-right">
                  {commissionColumnLabel}
                </TableHead>
                <TableHead className="h-9">Status</TableHead>
                <TableHead className="h-9 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center">
                    <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                    <span className="mt-2 block text-sm text-muted-foreground">
                      Carregando comissões…
                    </span>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center">
                    {items.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Há {items.length} comissão(ões), mas nenhuma neste
                          filtro.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPeriodo("tudo");
                            setStatus("todos");
                            setEquipe("todos");
                            setSearch("");
                          }}
                        >
                          Ver todas as comissões
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma comissão lançada ainda.
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="py-2 font-medium">
                      {relationName(item.corretor)}
                    </TableCell>
                    <TableCell className="py-2">
                      {relationName(item.equipe)}
                    </TableCell>
                    <TableCell className="py-2">
                      {relationName(item.empreendimento)}
                    </TableCell>
                    <TableCell className="py-2">
                      {relationName(item.cliente)}
                    </TableCell>
                    <TableCell className="py-2 whitespace-nowrap tabular-nums">
                      {formatDate(item.dataVenda)}
                    </TableCell>
                    <TableCell className="py-2 text-right tabular-nums">
                      {brl(numberValue(item.vgv))}
                    </TableCell>
                    <TableCell className="py-2 text-right font-semibold tabular-nums">
                      {commissionValue(item) == null
                        ? "—"
                        : brl(numberValue(commissionValue(item)))}
                    </TableCell>
                    <TableCell className="py-2">
                      {canManage ? (
                        <Select
                          value={item.status}
                          onValueChange={(value) =>
                            void handleStatus(item, value as ComissaoStatus)
                          }
                        >
                          <SelectTrigger className="h-8 w-31 border-0 bg-transparent p-0 shadow-none">
                            <Badge
                              variant="outline"
                              className={statusBadgeClass(item.status)}
                            >
                              {statusLabel(item.status)}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.slice(1).map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          variant="outline"
                          className={statusBadgeClass(item.status)}
                        >
                          {statusLabel(item.status)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDetail(item)}
                        aria-label="Ver detalhes da comissão"
                        title="Ver detalhes"
                      >
                        <Eye className="size-4" />
                      </Button>
                      {canManage && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(item)}
                            aria-label="Editar comissão"
                            title="Editar"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(item)}
                            aria-label="Excluir comissão"
                            title="Excluir"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <p className="mt-2 mb-4 text-xs text-muted-foreground">
        VGV filtrado: {brl(kpis.vgv)} · {rows.length} de {items.length}{" "}
        comissão(ões)
      </p>

      <FormDialogShell
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        icon={<Percent className="size-5" />}
        title={mode === "create" ? "Lançar comissão" : "Editar comissão"}
        description="Defina os percentuais e confira a distribuição antes de salvar."
        className="max-w-3xl"
        footer={
          <FormDialogActions
            hint={`Distribuição: ${splitTotal.toLocaleString("pt-BR")}% de 100%`}
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" form="commission-form" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Salvar comissão
            </Button>
          </FormDialogActions>
        }
      >
        <form
          id="commission-form"
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <FormDialogBody>
            {mode === "create" && (
              <FormSection title="Venda elegível">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Venda</Label>
                    <span className="text-xs text-muted-foreground">
                      {loadingSales
                        ? "Carregando…"
                        : `${eligibleSales.length} elegível(is)`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Todas as vendas ficam disponíveis e podem receber mais de
                    um lançamento de comissão.
                  </p>
                  <Popover
                    open={salePickerOpen}
                    onOpenChange={setSalePickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        className="h-auto min-h-10 w-full justify-between py-2 font-normal"
                        disabled={loadingSales}
                      >
                        {loadingSales ? (
                          "Carregando vendas…"
                        ) : selectedSale ? (
                          <span className="min-w-0 flex-1 text-left">
                            <span className="block truncate font-medium">
                              {relationName(selectedSale.cliente)}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {relationName(selectedSale.empreendimento)} ·{" "}
                              {formatDate(selectedSale.dataVenda)} ·{" "}
                              {brl(numberValue(selectedSale.vgv))}
                            </span>
                          </span>
                        ) : (
                          "Selecione uma venda"
                        )}
                        {loadingSales ? (
                          <Loader2 className="size-4 shrink-0 animate-spin" />
                        ) : (
                          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-(--radix-popover-trigger-width) p-0"
                      align="start"
                    >
                      <Command>
                        <CommandInput placeholder="Buscar cliente, corretor ou empreendimento…" />
                        <CommandList className="max-h-72">
                          <CommandEmpty>Nenhuma venda elegível.</CommandEmpty>
                          <CommandGroup>
                            {eligibleSales.map((sale) => (
                              <CommandItem
                                key={sale.documentacaoId}
                                value={`${relationName(sale.cliente)} ${relationName(sale.empreendimento)} ${relationName(sale.corretor)} ${formatDate(sale.dataVenda)} ${sale.documentacaoId}`}
                                onSelect={() => {
                                  setField(
                                    "documentacaoId",
                                    sale.documentacaoId,
                                  );
                                  setSalePickerOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "size-4 shrink-0",
                                    form.documentacaoId === sale.documentacaoId
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-medium">
                                    {relationName(sale.cliente)}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {relationName(sale.empreendimento)} ·{" "}
                                    {relationName(sale.corretor)}
                                  </p>
                                  <p className="truncate text-xs tabular-nums text-muted-foreground">
                                    {formatDate(sale.dataVenda)} ·{" "}
                                    {brl(numberValue(sale.vgv))}
                                  </p>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </FormSection>
            )}

            {saleSummary && (
              <FormSection title="Resumo da venda">
                <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <Summary
                    label="Cliente"
                    value={relationName(saleSummary.cliente)}
                  />
                  <Summary
                    label="Empreendimento"
                    value={relationName(saleSummary.empreendimento)}
                  />
                  <Summary
                    label="Corretor"
                    value={relationName(saleSummary.corretor)}
                  />
                  <Summary
                    label="Gerente"
                    value={relationName(saleSummary.gerente)}
                  />
                  <Summary
                    label="Data da venda"
                    value={formatDate(saleSummary.dataVenda)}
                  />
                  <Summary
                    label="VGV"
                    value={brl(numberValue(saleSummary.vgv))}
                  />
                </div>
              </FormSection>
            )}

            <FormSection title="Percentuais">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <PercentField
                  label="Imobiliária"
                  value={form.percentualImobiliaria}
                  onChange={(value) => setField("percentualImobiliaria", value)}
                />
                <PercentField
                  label="Tributos"
                  value={form.percentualTributos}
                  onChange={(value) => setField("percentualTributos", value)}
                />
                <PercentField
                  label="Corretor"
                  value={form.percentualCorretor}
                  onChange={(value) => setField("percentualCorretor", value)}
                />
                <PercentField
                  label="Gerente"
                  value={form.percentualGerente}
                  onChange={(value) => setField("percentualGerente", value)}
                />
                <PercentField
                  label="Caixa"
                  value={form.percentualCaixa}
                  onChange={(value) => setField("percentualCaixa", value)}
                />
                <PercentField
                  label="Sócios"
                  value={form.percentualSocios}
                  onChange={(value) => setField("percentualSocios", value)}
                />
              </div>
              <p
                className={cn(
                  "text-xs",
                  Math.abs(splitTotal - 100) < 0.001
                    ? "text-emerald-600"
                    : "text-destructive",
                )}
              >
                Corretor + gerente + caixa + sócios:{" "}
                {splitTotal.toLocaleString("pt-BR")}% (deve somar 100%)
              </p>
              {mode === "edit" && (
                <div className="max-w-xs space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setField("status", value as ComissaoStatus)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.slice(1).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </FormSection>

            <FormSection title="Prévia do cálculo" className="bg-muted/20">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Summary label="Comissão bruta" value={brl(preview.gross)} />
                <Summary label="Tributos" value={brl(preview.taxes)} />
                <Summary
                  label="Comissão líquida"
                  value={brl(preview.net)}
                  emphasized
                />
                <Summary label="Corretor" value={brl(preview.broker)} />
                <Summary label="Gerente" value={brl(preview.manager)} />
                <Summary label="Caixa" value={brl(preview.cash)} />
                <Summary label="Sócios" value={brl(preview.partners)} />
              </div>
              <p className="text-xs text-muted-foreground">
                Bruta = VGV × % imobiliária; líquida = bruta − tributos;
                distribuição calculada sobre a líquida.
              </p>
            </FormSection>
          </FormDialogBody>
        </form>
      </FormDialogShell>

      <FormDialogShell
        open={Boolean(detail)}
        onOpenChange={(open) => !open && setDetail(null)}
        icon={<Eye className="size-5" />}
        title="Detalhes da comissão"
        description={
          detail
            ? `${relationName(detail.cliente)} · ${relationName(detail.empreendimento)}`
            : undefined
        }
        className="max-w-2xl"
        footer={
          <FormDialogActions>
            <Button type="button" variant="outline" onClick={() => setDetail(null)}>
              Fechar
            </Button>
            {canManage && detail && (
              <Button
                type="button"
                onClick={() => {
                  const item = detail;
                  setDetail(null);
                  openEdit(item);
                }}
              >
                <Pencil className="mr-2 size-4" />
                Editar
              </Button>
            )}
          </FormDialogActions>
        }
      >
        {detail && (
          <FormDialogBody>
            <FormSection title="Venda">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField label="Cliente" value={relationName(detail.cliente)} />
                <DetailField
                  label="Empreendimento"
                  value={relationName(detail.empreendimento)}
                />
                <DetailField
                  label="Corretor"
                  value={relationName(detail.corretor)}
                />
                <DetailField
                  label="Gerente"
                  value={relationName(detail.gerente)}
                />
                <DetailField
                  label="Equipe"
                  value={relationName(detail.equipe)}
                />
                <DetailField
                  label="Data da venda"
                  value={formatDate(detail.dataVenda)}
                />
                <DetailField
                  label="VGV"
                  value={brl(numberValue(detail.vgv))}
                />
                <DetailField
                  label="Status"
                  value={
                    <Badge
                      variant="outline"
                      className={statusBadgeClass(detail.status)}
                    >
                      {statusLabel(detail.status)}
                    </Badge>
                  }
                />
              </div>
            </FormSection>

            <FormSection title="Percentuais">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField
                  label="Imobiliária"
                  value={`${numberValue(detail.percentualImobiliaria).toLocaleString("pt-BR")}%`}
                />
                <DetailField
                  label="Tributos"
                  value={`${numberValue(detail.percentualTributos).toLocaleString("pt-BR")}%`}
                />
                <DetailField
                  label="Corretor"
                  value={`${numberValue(detail.percentualCorretor).toLocaleString("pt-BR")}%`}
                />
                <DetailField
                  label="Gerente"
                  value={`${numberValue(detail.percentualGerente).toLocaleString("pt-BR")}%`}
                />
                <DetailField
                  label="Caixa"
                  value={`${numberValue(detail.percentualCaixa).toLocaleString("pt-BR")}%`}
                />
                <DetailField
                  label="Sócios"
                  value={`${numberValue(detail.percentualSocios).toLocaleString("pt-BR")}%`}
                />
              </div>
            </FormSection>

            <FormSection title="Valores calculados" className="bg-muted/20">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField
                  label="Comissão bruta"
                  value={brl(numberValue(detail.comissaoBruta))}
                />
                <DetailField
                  label="Tributos"
                  value={brl(numberValue(detail.valorTributos))}
                />
                <DetailField
                  label="Comissão líquida"
                  value={
                    <span className="font-semibold text-primary">
                      {brl(numberValue(detail.comissaoLiquida))}
                    </span>
                  }
                />
                <DetailField
                  label="Corretor"
                  value={brl(numberValue(detail.valorCorretor))}
                />
                <DetailField
                  label="Gerente"
                  value={brl(numberValue(detail.valorGerente))}
                />
                <DetailField
                  label="Caixa"
                  value={brl(numberValue(detail.valorCaixa))}
                />
                <DetailField
                  label="Sócios"
                  value={brl(numberValue(detail.valorSocios))}
                />
              </div>
            </FormSection>
          </FormDialogBody>
        )}
      </FormDialogShell>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comissão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá a comissão de{" "}
              {relationName(deleteTarget?.cliente)} e não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PercentField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pr-8"
          required
        />
        <Percent className="absolute right-2.5 top-2.5 size-4 text-muted-foreground" />
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "wrap-break-word",
          emphasized && "font-semibold text-primary",
        )}
      >
        {value}
      </p>
    </div>
  );
}
