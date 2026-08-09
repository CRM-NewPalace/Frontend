import { createFileRoute } from "@tanstack/react-router";
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
  createCategoria,
  deleteCategoria,
  fetchCategoriasResumo,
  updateCategoria,
  type CategoriaResumoItem,
} from "@/lib/financeiro-api";
import {
  brl,
  type PeriodoFiltro,
  type TipoMovimento,
} from "@/lib/financeiro-mock";
import {
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  Pencil,
  Plus,
  Tags,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/financeiro/categorias")({
  head: () => ({ meta: [{ title: "Categorias — Zone Connection" }] }),
  component: Page,
});

const TIPO_OPTIONS = [
  { value: "todos", label: "Entradas e saídas" },
  { value: "entrada", label: "Entradas" },
  { value: "saida", label: "Saídas" },
];

type FormState = {
  nome: string;
  tipo: TipoMovimento;
  ativo: boolean;
};

function emptyForm(): FormState {
  return { nome: "", tipo: "entrada", ativo: true };
}

function Page() {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");
  const [tipo, setTipo] = useState("todos");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [totalEntradas, setTotalEntradas] = useState(0);
  const [totalSaidas, setTotalSaidas] = useState(0);
  const [items, setItems] = useState<CategoriaResumoItem[]>([]);
  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoriaResumoItem | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCategoriasResumo({
        periodo,
        tipo: tipo === "todos" ? undefined : (tipo as TipoMovimento),
      });
      setTotalEntradas(data.totalEntradas);
      setTotalSaidas(data.totalSaidas);
      setItems(data.categorias);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as categorias.",
      );
    } finally {
      setLoading(false);
    }
  }, [periodo, tipo]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) => c.nome.toLowerCase().includes(q));
  }, [items, search]);

  const hasActive = Boolean(search || periodo !== "mes" || tipo !== "todos");

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(c: CategoriaResumoItem) {
    if (!c.id) {
      toast.error("Esta categoria só existe em lançamentos. Cadastre-a para editar.");
      return;
    }
    setFormMode("edit");
    setEditingId(c.id);
    setForm({ nome: c.nome, tipo: c.tipo, ativo: c.ativo });
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const nome = form.nome.trim();
    if (nome.length < 2) {
      toast.error("Informe o nome da categoria.");
      return;
    }
    setSaving(true);
    try {
      if (formMode === "create") {
        await createCategoria({
          nome,
          tipo: form.tipo,
          ativo: form.ativo,
        });
        toast.success("Categoria cadastrada.");
      } else if (editingId) {
        await updateCategoria(editingId, {
          nome,
          tipo: form.tipo,
          ativo: form.ativo,
        });
        toast.success("Categoria atualizada.");
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

  async function confirmDelete() {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await deleteCategoria(deleteTarget.id);
      toast.success("Categoria removida.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível remover.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Categorias"
        description="Cadastro e totais por categoria financeira (entradas e saídas)"
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Nova categoria
          </Button>
        }
      />

      <FinanceiroFiltrosBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar categoria…"
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        tipo={tipo}
        onTipoChange={setTipo}
        tipoOptions={TIPO_OPTIONS}
        hasActive={hasActive}
        onClear={() => {
          setSearch("");
          setPeriodo("mes");
          setTipo("todos");
        }}
      />

      <section className="grid gap-3 sm:grid-cols-3 mb-4">
        <FinanceKpiCard
          label="Entradas (período)"
          value={totalEntradas}
          icon={ArrowUpRight}
          tone="blue"
        />
        <FinanceKpiCard
          label="Saídas (período)"
          value={totalSaidas}
          icon={ArrowDownRight}
          tone="orange"
        />
        <FinanceKpiCard
          label="Categorias"
          value={rows.length}
          icon={Tags}
          tone="violet"
          format="number"
        />
      </section>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Realizado</TableHead>
              <TableHead className="text-right">% do tipo</TableHead>
              <TableHead className="text-right">Em aberto</TableHead>
              <TableHead className="text-right">Lançamentos</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                  Carregando…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhuma categoria encontrada.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((c) => (
                <TableRow key={c.id || `${c.tipo}-${c.nome}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {c.nome}
                      {!c.ativo ? (
                        <Badge variant="secondary">Inativa</Badge>
                      ) : null}
                      {!c.id ? (
                        <Badge variant="outline">Só em lançamentos</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.tipo === "entrada" ? (
                      <Badge className="bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/15">
                        Entrada
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-600/15 text-rose-700 hover:bg-rose-600/15">
                        Saída
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {brl(c.total)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {c.percentual.toLocaleString("pt-BR", {
                      maximumFractionDigits: 1,
                    })}
                    %
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.emAberto > 0 ? brl(c.emAberto) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {c.quantidade}
                    {c.qtdAberto > 0 ? ` · ${c.qtdAberto} abertos` : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={!c.id}
                        onClick={() => openEdit(c)}
                        aria-label="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={!c.id}
                        onClick={() => setDeleteTarget(c)}
                        aria-label="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
        icon={<Tags className="w-5 h-5" />}
        title={formMode === "edit" ? "Editar categoria" : "Nova categoria"}
        description="Usada em Contas a receber/pagar e Movimentação financeira."
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" form="categoria-form" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Salvar
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <form id="categoria-form" onSubmit={(e) => void onSubmit(e)}>
            <FormSection title="Dados">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Nome</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nome: e.target.value }))
                    }
                    placeholder="Ex.: Consultoria"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select
                    value={form.tipo}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, tipo: v as TipoMovimento }))
                    }
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
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={form.ativo ? "ativo" : "inativo"}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, ativo: v === "ativo" }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativa</SelectItem>
                      <SelectItem value="inativo">Inativa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormSection>
          </form>
        </FormDialogBody>
      </FormDialogShell>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove "{deleteTarget?.nome}" do cadastro. Lançamentos
              existentes mantêm o nome da categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
