import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  createMovimento,
  createParceiro,
  deleteMovimento,
  fetchMovimentos,
  fetchParceiros,
  updateMovimento,
} from "@/lib/financeiro-api";
import { digitsOnly, formatCpfCnpj } from "@/lib/utils";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseMoneyInput,
} from "@/lib/money-input";
import {
  brl,
  CATEGORIAS_ENTRADA,
  CATEGORIAS_SAIDA,
  CENTROS_DESPESA,
  filterByPeriodo,
  formatDate,
  statusBadgeClass,
  statusLabel,
  type MovimentoFinanceiro,
  type ParceiroFinanceiro,
  type PeriodoFiltro,
  type StatusTitulo,
  type TipoMovimento,
  type TipoParceiro,
} from "@/lib/financeiro-mock";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Loader2,
  Pencil,
  Plus,
  Tags,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

type MovimentacaoSearch = {
  novo?: boolean;
};

export const Route = createFileRoute("/_app/financeiro/movimentacao")({
  head: () => ({
    meta: [{ title: "Movimentação financeira — Zone Connection" }],
  }),
  validateSearch: (search: Record<string, unknown>): MovimentacaoSearch => {
    const raw = search.novo;
    if (raw === true || raw === "true" || raw === "1") return { novo: true };
    return {};
  },
  component: Page,
});

const TIPO_OPTIONS = [
  { value: "todos", label: "Entradas e saídas" },
  { value: "entrada", label: "Entradas" },
  { value: "saida", label: "Saídas" },
];

const FORMAS_PAGAMENTO = [
  "Pix",
  "TED",
  "Boleto",
  "Dinheiro",
  "Cartão de crédito",
  "Cartão de débito",
  "Cheque",
  "Outro",
] as const;

const NONE = "__none__";
const EXTRA_CAT_KEY = "financeiro.extraCategorias";
const EXTRA_CENTRO_KEY = "financeiro.extraCentros";

type QuickKind = "parceiro" | "categoria" | "centro" | null;

function loadExtras(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter(
          (x): x is string => typeof x === "string" && x.trim().length > 0,
        )
      : [];
  } catch {
    return [];
  }
}

function saveExtras(key: string, values: string[]) {
  localStorage.setItem(key, JSON.stringify(values));
}

type FormState = {
  data: string;
  descricao: string;
  parceiroId: string;
  categoria: string;
  centro: string;
  tipo: TipoMovimento;
  valor: string;
  status: StatusTitulo;
  formaPagamento: string;
};

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyForm(): FormState {
  return {
    data: todayIso(),
    descricao: "",
    parceiroId: NONE,
    categoria: CATEGORIAS_ENTRADA[0],
    centro: CENTROS_DESPESA[0],
    tipo: "entrada",
    valor: "",
    status: "pago",
    formaPagamento: FORMAS_PAGAMENTO[0],
  };
}

function parseValor(raw: string): number {
  return parseMoneyInput(raw);
}

function toForm(m: MovimentoFinanceiro): FormState {
  return {
    data: m.data.slice(0, 10),
    descricao: m.descricao,
    parceiroId: m.parceiroId || NONE,
    categoria: m.categoria,
    centro: m.centro || CENTROS_DESPESA[0],
    tipo: m.tipo,
    valor: formatMoneyInput(m.valor),
    status: m.status,
    formaPagamento: m.formaPagamento || FORMAS_PAGAMENTO[0],
  };
}

function Page() {
  const navigate = useNavigate();
  const { novo } = Route.useSearch();
  const isPlatform = getSession()?.role === "super_admin";
  const parceiroLabel = isPlatform ? "Fornecedor" : "Parceiro";
  const [items, setItems] = useState<MovimentoFinanceiro[]>([]);
  const [parceiros, setParceiros] = useState<ParceiroFinanceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");
  const [status, setStatus] = useState<StatusTitulo | "todos">("todos");
  const [tipo, setTipo] = useState("todos");
  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MovimentoFinanceiro | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [extraCategorias, setExtraCategorias] = useState<string[]>(() =>
    loadExtras(EXTRA_CAT_KEY),
  );
  const [extraCentros, setExtraCentros] = useState<string[]>(() =>
    loadExtras(EXTRA_CENTRO_KEY),
  );
  const [quickKind, setQuickKind] = useState<QuickKind>(null);
  const [quickNome, setQuickNome] = useState("");
  const [quickDocumento, setQuickDocumento] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [movs, pars] = await Promise.all([
        fetchMovimentos(),
        fetchParceiros(),
      ]);
      setItems(movs);
      setParceiros(pars.filter((p) => p.ativo));
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as movimentações.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categorias: string[] = useMemo(() => {
    const base =
      form.tipo === "entrada"
        ? [...CATEGORIAS_ENTRADA]
        : [...CATEGORIAS_SAIDA];
    const fromItems = items
      .map((m) => m.categoria)
      .filter((c) => c && c.trim());
    return Array.from(
      new Set([...base, ...extraCategorias, ...fromItems]),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [form.tipo, extraCategorias, items]);

  const centros: string[] = useMemo(() => {
    const fromItems = items.map((m) => m.centro).filter((c) => c && c.trim());
    return Array.from(
      new Set([...CENTROS_DESPESA, ...extraCentros, ...fromItems]),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [extraCentros, items]);

  useEffect(() => {
    if (!categorias.includes(form.categoria)) {
      setForm((prev) => ({ ...prev, categoria: categorias[0] ?? "" }));
    }
  }, [categorias, form.categoria]);

  function openQuick(kind: Exclude<QuickKind, null>) {
    setQuickKind(kind);
    setQuickNome("");
    setQuickDocumento("");
  }

  async function handleQuickCreate(e: FormEvent) {
    e.preventDefault();
    const nome = quickNome.trim();
    if (nome.length < 2) {
      toast.error("Informe um nome com ao menos 2 caracteres.");
      return;
    }

    if (quickKind === "parceiro") {
      const documento = digitsOnly(quickDocumento);
      if (documento.length !== 11 && documento.length !== 14) {
        toast.error("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).");
        return;
      }
      setQuickSaving(true);
      try {
        const parceiroTipo: TipoParceiro = isPlatform
          ? "fornecedor"
          : form.tipo === "entrada"
            ? "cliente"
            : "fornecedor";
        const created = await createParceiro({
          nome,
          documento,
          tipo: parceiroTipo,
        });
        setParceiros((prev) =>
          [...prev, created].sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR"),
          ),
        );
        setField("parceiroId", created.id);
        setQuickKind(null);
        toast.success(`${parceiroLabel} cadastrado.`);
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : `Não foi possível criar o ${parceiroLabel.toLowerCase()}.`,
        );
      } finally {
        setQuickSaving(false);
      }
      return;
    }

    if (quickKind === "categoria") {
      if (categorias.some((c) => c.toLowerCase() === nome.toLowerCase())) {
        setField("categoria", nome);
        setQuickKind(null);
        return;
      }
      const next = [...extraCategorias, nome];
      setExtraCategorias(next);
      saveExtras(EXTRA_CAT_KEY, next);
      setField("categoria", nome);
      setQuickKind(null);
      toast.success("Categoria adicionada.");
      return;
    }

    if (quickKind === "centro") {
      if (centros.some((c) => c.toLowerCase() === nome.toLowerCase())) {
        setField("centro", nome);
        setQuickKind(null);
        return;
      }
      const next = [...extraCentros, nome];
      setExtraCentros(next);
      saveExtras(EXTRA_CENTRO_KEY, next);
      setField("centro", nome);
      setQuickKind(null);
      toast.success("Centro adicionado.");
    }
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return filterByPeriodo(items, periodo, "data").filter((m) => {
      if (status !== "todos" && m.status !== status) return false;
      if (tipo !== "todos" && m.tipo !== (tipo as TipoMovimento)) return false;
      if (!q) return true;
      return (
        m.descricao.toLowerCase().includes(q) ||
        m.parceiro.toLowerCase().includes(q) ||
        m.categoria.toLowerCase().includes(q) ||
        m.centro.toLowerCase().includes(q)
      );
    });
  }, [items, search, periodo, status, tipo]);

  const totais = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    for (const m of rows) {
      if (m.tipo === "entrada") entradas += m.valor;
      else saidas += m.valor;
    }
    return { entradas, saidas, saldo: entradas - saidas };
  }, [rows]);

  const hasActive = Boolean(
    search || periodo !== "mes" || status !== "todos" || tipo !== "todos",
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setOpen(true);
  }

  useEffect(() => {
    if (!novo) return;
    openCreate();
    void navigate({
      to: "/financeiro/movimentacao",
      search: {},
      replace: true,
    });
  }, [novo, navigate]);

  function openEdit(m: MovimentoFinanceiro) {
    setFormMode("edit");
    setEditingId(m.id);
    setForm(toForm(m));
    setOpen(true);
  }

  function upsertLocal(updated: MovimentoFinanceiro) {
    setItems((prev) =>
      [updated, ...prev.filter((m) => m.id !== updated.id)].sort((a, b) =>
        b.data.localeCompare(a.data),
      ),
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const descricao = form.descricao.trim();
    if (!descricao) {
      toast.error("Informe a descrição.");
      return;
    }
    if (!form.categoria.trim()) {
      toast.error("Informe a categoria.");
      return;
    }
    const valor = parseValor(form.valor);
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    const payload = {
      data: form.data,
      descricao,
      parceiroId:
        form.parceiroId !== NONE ? form.parceiroId : undefined,
      categoria: form.categoria.trim(),
      centro: form.centro.trim() || undefined,
      tipo: form.tipo,
      valor,
      status: form.status,
      formaPagamento: form.formaPagamento.trim() || undefined,
    };

    setSaving(true);
    try {
      if (formMode === "edit" && editingId) {
        const updated = await updateMovimento(editingId, {
          ...payload,
          parceiroId: form.parceiroId !== NONE ? form.parceiroId : null,
        });
        upsertLocal(updated);
        toast.success("Lançamento atualizado.");
      } else {
        const created = await createMovimento(payload);
        upsertLocal(created);
        toast.success("Lançamento cadastrado.");
      }
      setOpen(false);
      setForm(emptyForm());
      setEditingId(null);
      setFormMode("create");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o lançamento.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMovimento(deleteTarget.id);
      setItems((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      toast.success("Lançamento excluído.");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir o lançamento.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Movimentação financeira"
        description="Lançamentos de entrada e saída"
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Novo lançamento
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3 mb-4">
        <FinanceKpiCard
          label="Entradas filtradas"
          value={totais.entradas}
          icon={ArrowUpRight}
          tone="emerald"
        />
        <FinanceKpiCard
          label="Saídas filtradas"
          value={totais.saidas}
          icon={ArrowDownRight}
          tone="red"
        />
        <FinanceKpiCard
          label="Saldo do filtro"
          value={totais.saldo}
          icon={ArrowUpRight}
          tone="teal"
        />
      </section>

      <FinanceiroFiltrosBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={`Buscar descrição, ${parceiroLabel.toLowerCase()}, categoria…`}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        status={status}
        onStatusChange={setStatus}
        tipo={tipo}
        onTipoChange={setTipo}
        tipoOptions={TIPO_OPTIONS}
        hasActive={hasActive}
        onClear={() => {
          setSearch("");
          setPeriodo("mes");
          setStatus("todos");
          setTipo("todos");
        }}
      />

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando lançamentos…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>{parceiroLabel}</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Centro</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[88px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground py-10"
                  >
                    Nenhum lançamento para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {formatDate(m.data)}
                    </TableCell>
                    <TableCell className="font-medium max-w-[240px]">
                      {m.descricao}
                    </TableCell>
                    <TableCell>{m.parceiro || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.categoria}
                    </TableCell>
                    <TableCell>{m.centro || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          m.tipo === "entrada"
                            ? "border-transparent bg-emerald-500/15 text-emerald-700"
                            : "border-transparent bg-destructive/15 text-destructive"
                        }
                      >
                        {m.tipo === "entrada" ? "Entrada" : "Saída"}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-semibold ${
                        m.tipo === "entrada"
                          ? "text-emerald-600"
                          : "text-destructive"
                      }`}
                    >
                      {m.tipo === "entrada" ? "+" : "—"}
                      {brl(m.valor)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusBadgeClass(m.status)}
                      >
                        {statusLabel(m.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Editar"
                          onClick={() => openEdit(m)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Excluir"
                          onClick={() => setDeleteTarget(m)}
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
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {rows.length} lançamento(s)
      </p>

      <FormDialogShell
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setFormMode("create");
            setEditingId(null);
            setForm(emptyForm());
          }
        }}
        icon={<ArrowUpRight className="w-5 h-5" />}
        title={
          formMode === "edit" ? "Editar lançamento" : "Novo lançamento"
        }
        description="Registre uma entrada ou saída financeira."
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <FormDialogBody>
            <FormSection title="Dados do lançamento">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mov-data">Data *</Label>
                  <Input
                    id="mov-data"
                    type="date"
                    value={form.data}
                    onChange={(e) => setField("data", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select
                    value={form.tipo}
                    onValueChange={(v) => setField("tipo", v as TipoMovimento)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="mov-desc">Descrição *</Label>
                  <Input
                    id="mov-desc"
                    value={form.descricao}
                    onChange={(e) => setField("descricao", e.target.value)}
                    placeholder="Ex.: Comissão da venda apto 1204"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{parceiroLabel}</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={() => openQuick("parceiro")}
                    >
                      + Novo {parceiroLabel.toLowerCase()}
                    </Button>
                  </div>
                  <Select
                    value={form.parceiroId}
                    onValueChange={(v) => setField("parceiroId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>
                        Sem {parceiroLabel.toLowerCase()}
                      </SelectItem>
                      {parceiros.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Categoria *</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={() => openQuick("categoria")}
                    >
                      + Nova categoria
                    </Button>
                  </div>
                  <Select
                    value={form.categoria}
                    onValueChange={(v) => setField("categoria", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Centro</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={() => openQuick("centro")}
                    >
                      + Novo centro
                    </Button>
                  </div>
                  <Select
                    value={form.centro}
                    onValueChange={(v) => setField("centro", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {centros.map((centro) => (
                        <SelectItem key={centro} value={centro}>
                          {centro}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mov-valor">Valor *</Label>
                  <Input
                    id="mov-valor"
                    inputMode="numeric"
                    value={form.valor}
                    onChange={(e) =>
                      setField("valor", maskMoneyInput(e.target.value))
                    }
                    placeholder="0,00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setField("status", v as StatusTitulo)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Forma de pagamento</Label>
                  <Select
                    value={form.formaPagamento}
                    onValueChange={(v) => setField("formaPagamento", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAS_PAGAMENTO.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormSection>
          </FormDialogBody>
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Salvando…"
                : formMode === "edit"
                  ? "Salvar alterações"
                  : "Salvar lançamento"}
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <FormDialogShell
        open={quickKind !== null}
        onOpenChange={(o) => !o && setQuickKind(null)}
        icon={
          quickKind === "parceiro" ? (
            <Building2 className="w-5 h-5" />
          ) : (
            <Tags className="w-5 h-5" />
          )
        }
        title={
          quickKind === "parceiro"
            ? `Novo ${parceiroLabel.toLowerCase()}`
            : quickKind === "categoria"
              ? "Nova categoria"
              : "Novo centro"
        }
        description="Criação rápida para usar neste lançamento."
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuickKind(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="quick-mov-form"
              disabled={quickSaving}
            >
              {quickSaving && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              Criar
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <form
            id="quick-mov-form"
            className="space-y-3"
            onSubmit={handleQuickCreate}
          >
            <div className="space-y-1.5">
              <Label htmlFor="quick-mov-nome">Nome *</Label>
              <Input
                id="quick-mov-nome"
                value={quickNome}
                onChange={(e) => setQuickNome(e.target.value)}
                autoFocus
                required
              />
            </div>
            {quickKind === "parceiro" ? (
              <div className="space-y-1.5">
                <Label htmlFor="quick-mov-doc">CPF / CNPJ *</Label>
                <Input
                  id="quick-mov-doc"
                  inputMode="numeric"
                  autoComplete="off"
                  value={quickDocumento}
                  onChange={(e) =>
                    setQuickDocumento(formatCpfCnpj(e.target.value))
                  }
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  maxLength={18}
                  required
                />
              </div>
            ) : null}
          </form>
        </FormDialogBody>
      </FormDialogShell>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(next) => {
          if (!next && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Isso removerá permanentemente "${deleteTarget.descricao}".`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
