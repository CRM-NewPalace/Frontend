import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api";
import { useCatalog, INITIAL_STAGE_SLUG } from "@/lib/catalog-store";
import {
  CATALOG_COLORS,
  DEFAULT_CATALOG_COLOR,
  catalogColorSwatch,
  nextCatalogColor,
} from "@/lib/catalog-colors";
import {
  addFunilEtapa,
  ativarFunil,
  createFunil,
  deleteFunil,
  deleteFunilEtapa,
  fetchFunis,
  installFunilEtapasPadrao,
  updateFunil,
  updateFunilEtapa,
  type Funil,
  type FunilEtapa,
} from "@/lib/funis-api";
import {
  Check,
  Loader2,
  ListRestart,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function ColorSwatchPicker({
  value,
  onChange,
  previewLabel,
}: {
  value: string;
  onChange: (color: string) => void;
  previewLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>Cor</Label>
        {previewLabel?.trim() && (
          <Badge className={cn(value || DEFAULT_CATALOG_COLOR, "text-[10px]")}>
            {previewLabel.trim()}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {CATALOG_COLORS.map((color) => {
          const selected = value === color;
          return (
            <button
              key={color}
              type="button"
              title={color}
              aria-label={`Selecionar cor ${color}`}
              aria-pressed={selected}
              onClick={() => onChange(color)}
              className={cn(
                "h-7 w-7 rounded-md border-2 transition",
                catalogColorSwatch(color),
                selected ? "border-foreground scale-110" : "border-transparent",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ConfigFunisPanel() {
  const { refresh: refreshCatalog } = useCatalog();
  const [funis, setFunis] = useState<Funil[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPadrao, setCreatePadrao] = useState(true);
  const [createCustomStages, setCreateCustomStages] = useState("");
  const [createAtivar, setCreateAtivar] = useState(false);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const [etapaOpen, setEtapaOpen] = useState(false);
  const [etapaEdit, setEtapaEdit] = useState<FunilEtapa | null>(null);
  const [etapaLabel, setEtapaLabel] = useState("");
  const [etapaColor, setEtapaColor] = useState(DEFAULT_CATALOG_COLOR);

  const [deleteFunilId, setDeleteFunilId] = useState<string | null>(null);

  const selected = funis.find((f) => f.id === selectedId) ?? null;
  const activeEtapas = (selected?.etapas ?? []).filter((e) => e.active);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchFunis();
      setFunis(list);
      setSelectedId((prev) => {
        if (prev && list.some((f) => f.id === prev)) return prev;
        return list.find((f) => f.ativo)?.id ?? list[0]?.id ?? null;
      });
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível carregar os funis."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function afterMutation(updated: Funil) {
    setFunis((prev) => {
      const without = prev.filter((f) => f.id !== updated.id);
      const next = [...without, updated].map((f) =>
        updated.ativo && f.id !== updated.id ? { ...f, ativo: false } : f,
      );
      return next.sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.name.localeCompare(b.name));
    });
    setSelectedId(updated.id);
    await refreshCatalog();
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const name = createName.trim();
    if (!name) {
      toast.error("Informe o nome do funil.");
      return;
    }
    setSaving(true);
    try {
      let etapas: Array<{ label: string }> | undefined;
      if (!createPadrao) {
        etapas = createCustomStages
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((label) => ({ label }));
        if (etapas.length === 0) {
          toast.error("Informe ao menos uma etapa (uma por linha).");
          return;
        }
      }
      const created = await createFunil({
        name,
        usarPadrao: createPadrao,
        etapas,
        ativar: createAtivar,
      });
      toast.success(`Funil "${created.name}" criado.`);
      setCreateOpen(false);
      setCreateName("");
      setCreatePadrao(true);
      setCreateCustomStages("");
      setCreateAtivar(false);
      await afterMutation(created);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível criar o funil."));
    } finally {
      setSaving(false);
    }
  }

  async function handleRename(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const name = renameValue.trim();
    if (!name) return;
    setSaving(true);
    try {
      const updated = await updateFunil(selected.id, { name });
      toast.success("Funil renomeado.");
      setRenameOpen(false);
      await afterMutation(updated);
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível renomear."));
    } finally {
      setSaving(false);
    }
  }

  async function handleAtivar(id: string) {
    setSaving(true);
    try {
      const updated = await ativarFunil(id);
      toast.success(`Funil "${updated.name}" em uso.`);
      await afterMutation(updated);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível ativar o funil."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteFunil() {
    if (!deleteFunilId) return;
    setSaving(true);
    try {
      await deleteFunil(deleteFunilId);
      toast.success("Funil excluído.");
      setDeleteFunilId(null);
      await load();
      await refreshCatalog();
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível excluir o funil."));
    } finally {
      setSaving(false);
    }
  }

  function openAddEtapa() {
    setEtapaEdit(null);
    setEtapaLabel("");
    setEtapaColor(nextCatalogColor(activeEtapas.length));
    setEtapaOpen(true);
  }

  function openEditEtapa(etapa: FunilEtapa) {
    setEtapaEdit(etapa);
    setEtapaLabel(etapa.label);
    setEtapaColor(etapa.color || DEFAULT_CATALOG_COLOR);
    setEtapaOpen(true);
  }

  async function handleSaveEtapa(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const label = etapaLabel.trim();
    if (!label) {
      toast.error("Informe o nome da etapa.");
      return;
    }
    setSaving(true);
    try {
      const updated = etapaEdit
        ? await updateFunilEtapa(selected.id, etapaEdit.id, {
            label,
            color: etapaColor,
          })
        : await addFunilEtapa(selected.id, { label, color: etapaColor });
      toast.success(etapaEdit ? "Etapa atualizada." : "Etapa adicionada.");
      setEtapaOpen(false);
      await afterMutation(updated);
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível salvar a etapa."));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveEtapa(etapa: FunilEtapa) {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await deleteFunilEtapa(selected.id, etapa.id);
      toast.success("Etapa desativada.");
      await afterMutation(updated);
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível remover a etapa."));
    } finally {
      setSaving(false);
    }
  }

  async function handleInstallDefaults() {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await installFunilEtapasPadrao(selected.id);
      toast.success("Etapas padrão instaladas neste funil.");
      await afterMutation(updated);
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível instalar as etapas padrão."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid gap-4 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex-row justify-between items-center gap-2 flex-wrap space-y-0">
            <div>
              <CardTitle className="text-base">Funis</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Passe o cursor para ver as etapas. Ative o funil em uso no kanban.
              </p>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Novo funil
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando…
              </div>
            )}
            {!loading && funis.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum funil cadastrado.</p>
            )}
            {funis.map((f) => {
              const etapasAtivas = f.etapas.filter((e) => e.active);
              return (
                <Tooltip key={f.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setSelectedId(f.id)}
                      className={cn(
                        "w-full text-left rounded-lg border px-3 py-2.5 transition",
                        selectedId === f.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/40",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate flex-1">
                          {f.name}
                        </span>
                        {f.ativo && (
                          <Badge className="text-[10px] shrink-0">Em uso</Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {etapasAtivas.length} etapa
                        {etapasAtivas.length === 1 ? "" : "s"}
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="max-w-xs bg-popover text-popover-foreground border shadow-md"
                  >
                    <p className="font-medium mb-1.5">{f.name}</p>
                    <div className="flex flex-wrap gap-1">
                      {etapasAtivas.length === 0 ? (
                        <span className="text-muted-foreground">Sem etapas</span>
                      ) : (
                        etapasAtivas.map((e) => (
                          <Badge
                            key={e.id}
                            className={cn("text-[10px]", e.color || DEFAULT_CATALOG_COLOR)}
                          >
                            {e.label}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row justify-between items-start gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base">
                {selected ? selected.name : "Etapas do funil"}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {selected?.ativo
                  ? "Este funil está ativo no kanban e nos novos leads."
                  : "Edite as etapas ou ative este funil para usá-lo."}
              </p>
            </div>
            {selected && (
              <div className="flex flex-wrap items-center gap-2">
                {!selected.ativo && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => void handleAtivar(selected.id)}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Usar este funil
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => {
                    setRenameValue(selected.name);
                    setRenameOpen(true);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Renomear
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => void handleInstallDefaults()}
                >
                  <ListRestart className="w-4 h-4 mr-1" />
                  Etapas padrão
                </Button>
                <Button size="sm" onClick={openAddEtapa}>
                  <Plus className="w-4 h-4 mr-1" />
                  Nova etapa
                </Button>
                {!selected.ativo && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={saving || funis.length <= 1}
                    onClick={() => setDeleteFunilId(selected.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Excluir funil
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {!selected && !loading && (
              <p className="text-sm text-muted-foreground">Selecione um funil à esquerda.</p>
            )}
            {selected && activeEtapas.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma etapa ativa. Adicione etapas ou use &quot;Etapas padrão&quot;.
              </p>
            )}
            {activeEtapas.map((s) => {
              const isInitial = s.slug === INITIAL_STAGE_SLUG;
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/40"
                >
                  <Badge className={s.color || DEFAULT_CATALOG_COLOR}>{s.label}</Badge>
                  {isInitial && (
                    <Badge variant="secondary" className="text-[10px]">
                      Inicial
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">{s.slug}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditEtapa(s)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    disabled={isInitial || saving}
                    title={
                      isInitial
                        ? "Etapa inicial não pode ser removida"
                        : "Desativar"
                    }
                    onClick={() => void handleRemoveEtapa(s)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={(e) => void handleCreate(e)}>
            <DialogHeader>
              <DialogTitle>Novo funil</DialogTitle>
              <DialogDescription>
                Crie um funil com etapas padrão ou defina só as que precisar.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="funil-nome">Nome</Label>
                <Input
                  id="funil-nome"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Ex.: Funil rápido"
                  autoFocus
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={createPadrao}
                  onChange={(e) => setCreatePadrao(e.target.checked)}
                />
                Usar etapas padrão (11 etapas)
              </label>
              {!createPadrao && (
                <div className="space-y-1.5">
                  <Label htmlFor="funil-etapas">Etapas (uma por linha)</Label>
                  <textarea
                    id="funil-etapas"
                    className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm"
                    value={createCustomStages}
                    onChange={(e) => setCreateCustomStages(e.target.value)}
                    placeholder={"Novo lead\nContato\nProposta\nGanho / Venda"}
                  />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={createAtivar}
                  onChange={(e) => setCreateAtivar(e.target.checked)}
                />
                Ativar este funil agora
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <form onSubmit={(e) => void handleRename(e)}>
            <DialogHeader>
              <DialogTitle>Renomear funil</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={etapaOpen} onOpenChange={setEtapaOpen}>
        <DialogContent>
          <form onSubmit={(e) => void handleSaveEtapa(e)}>
            <DialogHeader>
              <DialogTitle>{etapaEdit ? "Editar etapa" : "Nova etapa"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input
                  value={etapaLabel}
                  onChange={(e) => setEtapaLabel(e.target.value)}
                  autoFocus
                />
              </div>
              <ColorSwatchPicker
                value={etapaColor}
                onChange={setEtapaColor}
                previewLabel={etapaLabel}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEtapaOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteFunilId)}
        onOpenChange={(o) => !o && setDeleteFunilId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir funil?</AlertDialogTitle>
            <AlertDialogDescription>
              As etapas deste funil serão removidas. Leads que usam esses slugs
              continuam no histórico, mas o funil deixa de existir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDeleteFunil()}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
