import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FormDialogActions, FormDialogBody, FormDialogShell, FormSection,
} from "@/components/form-dialog";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  createConstrutora,
  deleteConstrutora,
  fetchConstrutoras,
  updateConstrutora,
  type Construtora,
} from "@/lib/construtoras-api";
import {
  Building, Plus, Loader2, Pencil, Trash2, Eye, Phone, MapPin, User,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/construtoras")({
  head: () => ({ meta: [{ title: "Construtoras — NP Connect" }] }),
  component: ConstrutorasPage,
});

type FormState = {
  nome: string;
  contato: string;
  endereco: string;
  viabilizadorNome: string;
  viabilizadorContato: string;
};

const emptyForm = (): FormState => ({
  nome: "",
  contato: "",
  endereco: "",
  viabilizadorNome: "",
  viabilizadorContato: "",
});

function ConstrutorasPage() {
  const user = getSession();
  const isAdmin = user?.role === "admin";

  const [items, setItems] = useState<Construtora[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit" | "view">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchConstrutoras());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as construtoras.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openView(item: Construtora) {
    setFormMode("view");
    setEditingId(item.id);
    setForm({
      nome: item.nome,
      contato: item.contato ?? "",
      endereco: item.endereco ?? "",
      viabilizadorNome: item.viabilizadorNome ?? "",
      viabilizadorContato: item.viabilizadorContato ?? "",
    });
    setOpen(true);
  }

  function openEdit(item: Construtora) {
    openView(item);
    setFormMode("edit");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin || formMode === "view") return;
    if (form.nome.trim().length < 2) {
      toast.error("Informe o nome da construtora.");
      return;
    }

    const payload = {
      nome: form.nome.trim(),
      contato: form.contato.trim() || undefined,
      endereco: form.endereco.trim() || undefined,
      viabilizadorNome: form.viabilizadorNome.trim() || undefined,
      viabilizadorContato: form.viabilizadorContato.trim() || undefined,
    };

    setSaving(true);
    try {
      if (formMode === "create") {
        await createConstrutora(payload);
        toast.success("Construtora cadastrada.");
      } else if (editingId) {
        await updateConstrutora(editingId, payload);
        toast.success("Construtora atualizada.");
      }
      setOpen(false);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId || !isAdmin) return;
    try {
      await deleteConstrutora(deleteId);
      toast.success("Construtora excluída.");
      setDeleteId(null);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível excluir.",
      );
    }
  }

  const readOnly = formMode === "view" || !isAdmin;

  return (
    <div>
      <PageHeader
        title="Construtoras"
        description={
          isAdmin
            ? "Cadastro de construtoras parceiras."
            : "Consulta de construtoras parceiras."
        }
        actions={
          isAdmin ? (
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" />
              Nova construtora
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Carregando…
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Building className="w-8 h-8 opacity-40" />
              <p>Nenhuma construtora cadastrada.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Viabilizador</TableHead>
                  <TableHead className="text-center">Empreend.</TableHead>
                  <TableHead className="text-center">Docs</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell>{item.contato || "—"}</TableCell>
                    <TableCell>
                      {item.viabilizadorNome ? (
                        <div className="space-y-0.5">
                          <div>{item.viabilizadorNome}</div>
                          {item.viabilizadorContato && (
                            <div className="text-xs text-muted-foreground">
                              {item.viabilizadorContato}
                            </div>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {item._count?.empreendimentos ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {item._count?.documentacoes ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openView(item)}
                          title="Ver"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(item)}
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(item.id)}
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        icon={<Building className="w-5 h-5" />}
        title={
          formMode === "create"
            ? "Nova construtora"
            : formMode === "edit"
              ? "Editar construtora"
              : "Construtora"
        }
      >
        <form onSubmit={handleSubmit}>
          <FormDialogBody>
            <FormSection title="Dados">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={form.nome}
                    onChange={(e) => setField("nome", e.target.value)}
                    disabled={readOnly}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contato">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> Contato
                    </span>
                  </Label>
                  <Input
                    id="contato"
                    value={form.contato}
                    onChange={(e) => setField("contato", e.target.value)}
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> Endereço
                    </span>
                  </Label>
                  <Input
                    id="endereco"
                    value={form.endereco}
                    onChange={(e) => setField("endereco", e.target.value)}
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="viabilizadorNome">
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> Viabilizador
                    </span>
                  </Label>
                  <Input
                    id="viabilizadorNome"
                    value={form.viabilizadorNome}
                    onChange={(e) =>
                      setField("viabilizadorNome", e.target.value)
                    }
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="viabilizadorContato">
                    Contato do viabilizador
                  </Label>
                  <Input
                    id="viabilizadorContato"
                    value={form.viabilizadorContato}
                    onChange={(e) =>
                      setField("viabilizadorContato", e.target.value)
                    }
                    disabled={readOnly}
                  />
                </div>
              </div>
            </FormSection>
          </FormDialogBody>
          <FormDialogActions>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {readOnly ? "Fechar" : "Cancelar"}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Salvar
              </Button>
            )}
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir construtora?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Documentações vinculadas
              permanecerão sem construtora.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
