import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormDialogActions, FormDialogBody, FormDialogShell, FormSection,
} from "@/components/form-dialog";
import { ApiError } from "@/lib/api";
import {
  createEquipe,
  deleteEquipe,
  fetchEquipeCorretores,
  fetchEquipeGerentes,
  fetchEquipes,
  updateEquipe,
  type Equipe,
  type EquipeOptionUser,
} from "@/lib/equipes-api";
import {
  Network, Plus, Loader2, Pencil, Trash2, Users, UserCog,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/equipes")({
  head: () => ({ meta: [{ title: "Equipes — Imob CRM" }] }),
  component: EquipesPage,
});

type FormState = {
  name: string;
  gerenteId: string;
  membroIds: string[];
  status: "ativo" | "inativo";
};

const emptyForm = (): FormState => ({
  name: "",
  gerenteId: "",
  membroIds: [],
  status: "ativo",
});

function EquipesPage() {
  const [items, setItems] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [gerentes, setGerentes] = useState<EquipeOptionUser[]>([]);
  const [corretores, setCorretores] = useState<EquipeOptionUser[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchEquipes());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as equipes.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function loadOptions(equipeId?: string) {
    setOptionsLoading(true);
    try {
      const [g, c] = await Promise.all([
        fetchEquipeGerentes(equipeId),
        fetchEquipeCorretores(equipeId),
      ]);
      setGerentes(g);
      setCorretores(c);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar gerentes/corretores.",
      );
    } finally {
      setOptionsLoading(false);
    }
  }

  async function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setOpen(true);
    await loadOptions();
  }

  async function openEdit(equipe: Equipe) {
    setFormMode("edit");
    setEditingId(equipe.id);
    setForm({
      name: equipe.name,
      gerenteId: equipe.gerenteId,
      membroIds: equipe.membros.map((m) => m.id),
      status: equipe.status,
    });
    setOpen(true);
    await loadOptions(equipe.id);
  }

  function toggleMembro(id: string, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      membroIds: checked
        ? [...prev.membroIds, id]
        : prev.membroIds.filter((x) => x !== id),
    }));
  }

  const selectedCount = form.membroIds.length;

  const gerenteOptions = useMemo(() => {
    // Garante que o gerente atual apareça mesmo se a lista de opções falhar parcialmente.
    const map = new Map(gerentes.map((g) => [g.id, g]));
    return [...map.values()];
  }, [gerentes]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || form.name.trim().length < 2) {
      toast.error("Informe o nome da equipe.");
      return;
    }
    if (!form.gerenteId) {
      toast.error("Selecione o gerente da equipe.");
      return;
    }

    setSaving(true);
    try {
      if (formMode === "create") {
        await createEquipe({
          name: form.name.trim(),
          gerenteId: form.gerenteId,
          membroIds: form.membroIds,
          status: form.status,
        });
        toast.success("Equipe criada.");
      } else if (editingId) {
        await updateEquipe(editingId, {
          name: form.name.trim(),
          gerenteId: form.gerenteId,
          membroIds: form.membroIds,
          status: form.status,
        });
        toast.success("Equipe atualizada.");
      }
      setOpen(false);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar a equipe.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await deleteEquipe(deleteId);
      toast.success("Equipe excluída.");
      setDeleteId(null);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir a equipe.",
      );
    }
  }

  return (
    <div>
      <PageHeader
        title="Equipes"
        description="Monte as equipes: um gerente e os corretores. Cada gerente só vê os processos da própria equipe."
        actions={
          <Button size="sm" onClick={() => void openCreate()}>
            <Plus className="w-4 h-4 mr-1" />
            Nova equipe
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando equipes...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Network className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Nenhuma equipe cadastrada</p>
              <p className="text-xs text-muted-foreground mt-1">
                Crie a primeira equipe e vincule um gerente com corretores.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipe</TableHead>
                    <TableHead>Gerente</TableHead>
                    <TableHead>Corretores</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((eq) => (
                    <TableRow key={eq.id}>
                      <TableCell className="font-medium">{eq.name}</TableCell>
                      <TableCell>
                        <div className="text-sm">{eq.gerente.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {eq.gerente.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {eq.membros.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              Sem corretores
                            </span>
                          ) : (
                            eq.membros.map((m) => (
                              <Badge
                                key={m.id}
                                variant="secondary"
                                className="text-[10px] font-normal"
                              >
                                {m.name}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={eq.status === "ativo" ? "default" : "outline"}
                          className="capitalize text-[10px]"
                        >
                          {eq.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => void openEdit(eq)}
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteId(eq.id)}
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        icon={<Network className="w-5 h-5" />}
        title={formMode === "create" ? "Nova equipe" : "Editar equipe"}
        description="Defina o gerente responsável e os corretores da equipe."
        className="max-w-xl"
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col flex-1 min-h-0">
          <FormDialogBody>
            <FormSection
              icon={<UserCog className="w-3.5 h-3.5 text-primary" />}
              title="Identificação"
            >
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nome da equipe</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Ex.: Equipe Recife Norte"
                  className="h-10 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Gerente</Label>
                <Select
                  value={form.gerenteId || "__none__"}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      gerenteId: v === "__none__" ? "" : v,
                    }))
                  }
                  disabled={optionsLoading}
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder="Selecionar gerente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" disabled>
                      Selecione
                    </SelectItem>
                    {gerenteOptions.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!optionsLoading && gerenteOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum gerente disponível. Cadastre um usuário com perfil gerente.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      status: v as "ativo" | "inativo",
                    }))
                  }
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FormSection>

            <FormSection
              icon={<Users className="w-3.5 h-3.5 text-primary" />}
              title={`Corretores (${selectedCount})`}
            >
              {optionsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando corretores...
                </div>
              ) : corretores.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  Nenhum corretor disponível. Cadastre corretores em Usuários ou
                  liberte-os de outras equipes.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto rounded-lg border p-3">
                  {corretores.map((c) => {
                    const checked = form.membroIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) =>
                            toggleMembro(c.id, v === true)
                          }
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {c.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {c.email}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </FormSection>
          </FormDialogBody>

          <FormDialogActions>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || optionsLoading}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {formMode === "create" ? "Criar equipe" : "Salvar"}
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              Os corretores ficarão sem equipe. O gerente poderá ser vinculado a
              outra equipe depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
