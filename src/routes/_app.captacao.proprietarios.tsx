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
  fetchProprietarios,
  updateProprietario,
  type PessoaTipo,
  type Proprietario,
} from "@/lib/captacao-api";
import { FILTER_BAR_SHELL, FILTER_CONTROL } from "@/lib/filter-bar";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/captacao/proprietarios")({
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
      cpfCnpj: item.cpfCnpj,
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
    setSaving(true);
    try {
      if (editing) {
        await updateProprietario(editing.id, form);
        toast.success("Proprietário atualizado.");
      } else {
        await createProprietario(form);
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proprietário</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead className="text-right">Imóveis</TableHead>
              <TableHead className="text-right">Captações</TableHead>
              <TableHead />
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
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link
                        to="/captacao/imoveis"
                        search={{ proprietarioId: item.id }}
                      >
                        Imóveis
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
                  onChange={(e) =>
                    setForm({ ...form, tipoPessoa: e.target.value as PessoaTipo })
                  }
                >
                  <option value="fisica">Pessoa física</option>
                  <option value="juridica">Pessoa jurídica</option>
                </select>
              </div>
              <div>
                <Label>CPF/CNPJ</Label>
                <Input
                  value={form.cpfCnpj}
                  onChange={(e) => setForm({ ...form, cpfCnpj: e.target.value })}
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
    </>
  );
}
