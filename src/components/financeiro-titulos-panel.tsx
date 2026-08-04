import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  baixarTitulo,
  createTitulo,
  deleteTitulo,
  fetchParceiros,
  fetchTitulos,
  updateTitulo,
} from "@/lib/financeiro-api";
import {
  brl,
  CATEGORIAS_ENTRADA,
  CATEGORIAS_SAIDA,
  CENTROS_DESPESA,
  formatDate,
  statusBadgeClass,
  statusLabel,
  type ParceiroFinanceiro,
  type PeriodoFiltro,
  type StatusTitulo,
  type TituloFinanceiro,
} from "@/lib/financeiro-mock";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock3,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const NONE = "__none__";
const FORMAS = ["Pix", "TED", "Boleto", "Dinheiro", "Cartão", "Outro"] as const;

type FormState = {
  descricao: string;
  parceiroId: string;
  categoria: string;
  centro: string;
  vencimento: string;
  valor: string;
  status: StatusTitulo;
  parcela: string;
};

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseValor(raw: string): number {
  const n = Number(
    raw
      .trim()
      .replace(/\s/g, "")
      .replace(/R\$/gi, "")
      .replace(/\./g, "")
      .replace(",", "."),
  );
  return Number.isFinite(n) ? n : NaN;
}

function emptyForm(tipo: "receber" | "pagar"): FormState {
  const cats = tipo === "receber" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;
  return {
    descricao: "",
    parceiroId: NONE,
    categoria: cats[0],
    centro: CENTROS_DESPESA[0],
    vencimento: todayIso(),
    valor: "",
    status: "aberto",
    parcela: "",
  };
}

export function FinanceiroTitulosPanel({
  tipo,
  title,
  description,
}: {
  tipo: "receber" | "pagar";
  title: string;
  description: string;
}) {
  const categorias =
    tipo === "receber" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;
  const [items, setItems] = useState<TituloFinanceiro[]>([]);
  const [parceiros, setParceiros] = useState<ParceiroFinanceiro[]>([]);
  const [search, setSearch] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("tudo");
  const [status, setStatus] = useState<StatusTitulo | "todos">("todos");
  const [centro, setCentro] = useState("todos");
  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(tipo));
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TituloFinanceiro | null>(
    null,
  );
  const [baixarTarget, setBaixarTarget] = useState<TituloFinanceiro | null>(
    null,
  );
  const [baixarData, setBaixarData] = useState(todayIso());
  const [baixarForma, setBaixarForma] = useState<string>(FORMAS[0]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [titulos, pars] = await Promise.all([
        fetchTitulos(tipo),
        fetchParceiros(),
      ]);
      setItems(titulos);
      setParceiros(pars.filter((p) => p.ativo));
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os títulos.",
      );
    }
  }, [tipo]);

  useEffect(() => {
    void load();
  }, [load]);

  const centroOptions = useMemo(
    () => [
      { value: "todos", label: "Todos os centros" },
      ...CENTROS_DESPESA.map((c) => ({ value: c, label: c })),
    ],
    [],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    return items.filter((t) => {
      if (status !== "todos" && t.status !== status) return false;
      if (centro !== "todos" && t.centro !== centro) return false;
      if (periodo !== "tudo") {
        const d = new Date(t.vencimento + "T12:00:00");
        if (periodo === "mes") {
          if (
            d.getMonth() !== now.getMonth() ||
            d.getFullYear() !== now.getFullYear()
          )
            return false;
        } else if (periodo === "trimestre") {
          if (
            Math.floor(d.getMonth() / 3) !== Math.floor(now.getMonth() / 3) ||
            d.getFullYear() !== now.getFullYear()
          )
            return false;
        } else if (periodo === "ano") {
          if (d.getFullYear() !== now.getFullYear()) return false;
        }
      }
      if (!q) return true;
      return (
        t.descricao.toLowerCase().includes(q) ||
        t.parceiro.toLowerCase().includes(q) ||
        t.categoria.toLowerCase().includes(q)
      );
    });
  }, [items, search, periodo, status, centro]);

  const kpis = useMemo(() => {
    const aberto = rows
      .filter((r) => r.status === "aberto")
      .reduce((s, r) => s + r.valor, 0);
    const atrasado = rows
      .filter((r) => r.status === "atrasado")
      .reduce((s, r) => s + r.valor, 0);
    const pago = rows
      .filter((r) => r.status === "pago")
      .reduce((s, r) => s + r.valor, 0);
    return { aberto, atrasado, pago };
  }, [rows]);

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm(tipo));
    setOpen(true);
  }

  function openEdit(t: TituloFinanceiro) {
    if (t.status === "pago") {
      toast.error("Título baixado não pode ser editado.");
      return;
    }
    setFormMode("edit");
    setEditingId(t.id);
    setForm({
      descricao: t.descricao,
      parceiroId: t.parceiroId || NONE,
      categoria: t.categoria || categorias[0],
      centro: t.centro || CENTROS_DESPESA[0],
      vencimento: t.vencimento.slice(0, 10),
      valor: String(t.valor),
      status: t.status,
      parcela: t.parcela || "",
    });
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const descricao = form.descricao.trim();
    const valor = parseValor(form.valor);
    if (descricao.length < 2) {
      toast.error("Informe a descrição.");
      return;
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        tipo,
        descricao,
        parceiroId:
          form.parceiroId === NONE ? undefined : form.parceiroId,
        categoria: form.categoria,
        centro: form.centro,
        vencimento: form.vencimento,
        valor,
        status: form.status === "pago" ? ("aberto" as const) : form.status,
        parcela: form.parcela.trim() || undefined,
      };
      if (formMode === "create") {
        await createTitulo(payload);
        toast.success("Título criado.");
      } else if (editingId) {
        await updateTitulo(editingId, {
          ...payload,
          parceiroId: form.parceiroId === NONE ? null : form.parceiroId,
        });
        toast.success("Título atualizado.");
      }
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onBaixar() {
    if (!baixarTarget) return;
    setBusy(true);
    try {
      await baixarTitulo(baixarTarget.id, {
        dataPagamento: baixarData,
        formaPagamento: baixarForma,
      });
      toast.success(
        tipo === "receber" ? "Recebimento registrado." : "Pagamento registrado.",
      );
      setBaixarTarget(null);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível baixar.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteTitulo(deleteTarget.id);
      toast.success("Título excluído.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível excluir.",
      );
    } finally {
      setBusy(false);
    }
  }

  const hasActive = Boolean(
    search ||
      periodo !== "tudo" ||
      status !== "todos" ||
      (tipo === "pagar" && centro !== "todos"),
  );

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Novo título
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3 mb-4">
        <FinanceKpiCard
          label="Em aberto"
          value={kpis.aberto}
          icon={Clock3}
          tone={tipo === "receber" ? "blue" : "orange"}
        />
        <FinanceKpiCard
          label="Atrasado"
          value={kpis.atrasado}
          icon={AlertTriangle}
          tone="red"
        />
        <FinanceKpiCard
          label={tipo === "receber" ? "Recebido (filtro)" : "Pago (filtro)"}
          value={kpis.pago}
          icon={CheckCircle2}
          tone="emerald"
        />
      </section>

      <FinanceiroFiltrosBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar título, parceiro…"
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        status={status}
        onStatusChange={setStatus}
        {...(tipo === "pagar"
          ? {
              tipo: centro,
              onTipoChange: setCentro,
              tipoOptions: centroOptions,
            }
          : {})}
        hasActive={hasActive}
        onClear={() => {
          setSearch("");
          setPeriodo("tudo");
          setStatus("todos");
          setCentro("todos");
        }}
      />

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Parceiro</TableHead>
              <TableHead>
                {tipo === "pagar" ? "Centro" : "Categoria"}
              </TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Parcela</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-10"
                >
                  Nenhum título no filtro.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {t.descricao}
                  </TableCell>
                  <TableCell className="truncate max-w-[140px]">
                    {t.parceiro || "—"}
                  </TableCell>
                  <TableCell>
                    {tipo === "pagar" ? t.centro || "—" : t.categoria || "—"}
                  </TableCell>
                  <TableCell>{formatDate(t.vencimento)}</TableCell>
                  <TableCell>{t.parcela || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {brl(t.valor)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusBadgeClass(t.status)}
                    >
                      {statusLabel(t.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-0.5">
                      {t.status !== "pago" && t.status !== "cancelado" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Baixar"
                          onClick={() => {
                            setBaixarTarget(t);
                            setBaixarData(todayIso());
                            setBaixarForma(FORMAS[0]);
                          }}
                        >
                          <Banknote className="w-3.5 h-3.5" />
                        </Button>
                      ) : null}
                      {t.status !== "pago" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(t)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      ) : null}
                      {t.status !== "pago" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteTarget(t)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        icon={<Banknote className="w-5 h-5" />}
        title={formMode === "create" ? "Novo título" : "Editar título"}
        description={
          tipo === "receber"
            ? "Conta a receber vinculada ao fluxo de caixa."
            : "Conta a pagar vinculada ao fluxo de caixa."
        }
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" form="titulo-form" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Salvar
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <form id="titulo-form" className="space-y-4" onSubmit={onSubmit}>
            <FormSection title="Dados">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Descrição *</Label>
                  <Input
                    value={form.descricao}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, descricao: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Parceiro</Label>
                  <Select
                    value={form.parceiroId}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, parceiroId: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {parceiros.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Vencimento *</Label>
                  <Input
                    type="date"
                    value={form.vencimento}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, vencimento: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Valor (R$) *</Label>
                  <Input
                    inputMode="decimal"
                    value={form.valor}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, valor: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Parcela</Label>
                  <Input
                    value={form.parcela}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, parcela: e.target.value }))
                    }
                    placeholder="Ex.: 1/3"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select
                    value={form.categoria}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, categoria: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Centro</Label>
                  <Select
                    value={form.centro}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, centro: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CENTROS_DESPESA.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        status: v as StatusTitulo,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormSection>
          </form>
        </FormDialogBody>
      </FormDialogShell>

      <FormDialogShell
        open={!!baixarTarget}
        onOpenChange={(o) => !o && setBaixarTarget(null)}
        icon={<Banknote className="w-5 h-5" />}
        title={tipo === "receber" ? "Registrar recebimento" : "Registrar pagamento"}
        description={baixarTarget?.descricao}
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBaixarTarget(null)}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={busy} onClick={() => void onBaixar()}>
              {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Confirmar baixa
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Data do pagamento</Label>
              <Input
                type="date"
                value={baixarData}
                onChange={(e) => setBaixarData(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Forma</Label>
              <Select value={baixarForma} onValueChange={setBaixarForma}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {baixarTarget ? (
              <p className="sm:col-span-2 text-sm text-muted-foreground">
                Valor:{" "}
                <span className="font-semibold text-foreground">
                  {brl(baixarTarget.valor)}
                </span>
                . O lançamento entra no fluxo de caixa como realizado.
              </p>
            ) : null}
          </div>
        </FormDialogBody>
      </FormDialogShell>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir título?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.descricao}. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void onDelete();
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
