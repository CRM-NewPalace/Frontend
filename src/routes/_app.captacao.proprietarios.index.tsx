import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  createProprietario,
  deleteProprietario,
  fetchProprietarios,
  updateProprietario,
  type PessoaTipo,
  type Proprietario,
} from "@/lib/captacao-api";
import { FILTER_BAR_SHELL, FILTER_CONTROL } from "@/lib/filter-bar";
import { TableFrame } from "@/components/operacao-ui";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { RowIconButton, TableRowActions } from "@/components/table-row-actions";
import { digitsOnly, formatCpfCnpj } from "@/lib/utils";
import { Eye, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/captacao/proprietarios/")({
  component: ProprietariosPage,
});

const emptyForm = {
  nome: "",
  tipoPessoa: "fisica" as PessoaTipo,
  cpfCnpj: "",
  telefone: "",
  email: "",
  observacoes: "",
};

function ProprietariosPage() {
  const [items, setItems] = useState<Proprietario[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Proprietario | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Proprietario | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setItems(await fetchProprietarios({ search: search || undefined }));
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível listar.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(item: Proprietario) {
    setEditing(item);
    setForm({
      nome: item.nome,
      tipoPessoa: item.tipoPessoa,
      cpfCnpj: formatCpfCnpj(
        digitsOnly(item.cpfCnpj, item.tipoPessoa === "juridica" ? 14 : 11),
      ),
      telefone: item.telefone,
      email: item.email,
      observacoes: item.observacoes,
    });
    setOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Informe o nome.");
      return;
    }
    const doc = digitsOnly(
      form.cpfCnpj,
      form.tipoPessoa === "juridica" ? 14 : 11,
    );
    if (doc && form.tipoPessoa === "fisica" && doc.length !== 11) {
      toast.error("Informe um CPF com 11 dígitos.");
      return;
    }
    if (doc && form.tipoPessoa === "juridica" && doc.length !== 14) {
      toast.error("Informe um CNPJ com 14 dígitos.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateProprietario(editing.id, { ...form, cpfCnpj: doc });
        toast.success("Proprietário atualizado.");
      } else {
        await createProprietario({ ...form, cpfCnpj: doc });
        toast.success("Proprietário cadastrado.");
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

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteProprietario(pendingDelete.id);
      toast.success("Proprietário excluído.");
      setPendingDelete(null);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível excluir.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Proprietários"
        description="Cadastro das pessoas e empresas donas dos imóveis."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Novo proprietário
          </Button>
        }
      />
      <div className={FILTER_BAR_SHELL}>
        <Input
          className={FILTER_CONTROL}
          placeholder="Buscar por nome, telefone ou e-mail"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void load();
          }}
        />
        <Button variant="outline" onClick={() => void load()}>
          Filtrar
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      ) : (
        <TableFrame>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proprietário</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead className="text-right">Imóveis</TableHead>
              <TableHead className="text-right">Captações</TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Nenhum proprietário cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <Link
                      to="/captacao/proprietarios/$id"
                      params={{ id: item.id }}
                      className="hover:underline"
                    >
                      {item.nome}
                    </Link>
                  </TableCell>
                  <TableCell>{item.telefone || "—"}</TableCell>
                  <TableCell>{item.email || "—"}</TableCell>
                  <TableCell className="text-right">
                    {item._count?.imoveis ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {item._count?.captacoes ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <TableRowActions>
                      <RowIconButton title="Ver detalhes" asChild>
                        <Link
                          to="/captacao/proprietarios/$id"
                          params={{ id: item.id }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </RowIconButton>
                      <RowIconButton
                        title="Editar"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </RowIconButton>
                      <RowIconButton
                        title="Excluir"
                        destructive
                        onClick={() => setPendingDelete(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </RowIconButton>
                    </TableRowActions>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </TableFrame>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar proprietário" : "Novo proprietário"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-3">
              <div>
                <Label>Nome</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <select
                  className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.tipoPessoa}
                  onChange={(e) => {
                    const tipo = e.target.value as PessoaTipo;
                    setForm({
                      ...form,
                      tipoPessoa: tipo,
                      cpfCnpj: formatCpfCnpj(
                        digitsOnly(form.cpfCnpj, tipo === "juridica" ? 14 : 11),
                      ),
                    });
                  }}
                >
                  <option value="fisica">Pessoa física</option>
                  <option value="juridica">Pessoa jurídica</option>
                </select>
              </div>
              <div>
                <Label>
                  {form.tipoPessoa === "juridica" ? "CNPJ" : "CPF"}
                </Label>
                <Input
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={
                    form.tipoPessoa === "juridica"
                      ? "00.000.000/0000-00"
                      : "000.000.000-00"
                  }
                  maxLength={form.tipoPessoa === "juridica" ? 18 : 14}
                  value={form.cpfCnpj}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cpfCnpj: formatCpfCnpj(
                        digitsOnly(
                          e.target.value,
                          form.tipoPessoa === "juridica" ? 14 : 11,
                        ),
                      ),
                    })
                  }
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Input
                  value={form.observacoes}
                  onChange={(e) =>
                    setForm({ ...form, observacoes: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDeleteDialog
        open={pendingDelete != null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        title="Excluir proprietário?"
        description={
          pendingDelete
            ? `“${pendingDelete.nome}” será removido. Só é possível se não houver imóveis, captações ou pós-venda.`
            : ""
        }
        loading={deleting}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
