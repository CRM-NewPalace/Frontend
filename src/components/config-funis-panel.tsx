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
import { useCatalog } from "@/lib/catalog-store";
import { useLeads } from "@/lib/leads-store";
import {
  CATALOG_COLORS,
  DEFAULT_CATALOG_COLOR,
  catalogColorBadgeClass,
  catalogColorBadgeStyle,
  catalogColorSoftSurfaceClass,
  catalogColorSoftSurfaceStyle,
  catalogColorSwatchStyle,
  nextCatalogColor,
  normalizeCatalogColor,
  sameCatalogColor,
} from "@/lib/catalog-colors";
import {
  addFunilEtapa,
  ativarFunil,
  createFunil,
  deleteFunil,
  deleteFunilEtapa,
  fetchFunis,
  FUNIL_PADRAO_ETAPAS_COUNT,
  FUNIL_TIPO_LABEL,
  FUNIL_TIPOS,
  funilTipoOf,
  parseFunilTipo,
  installFunilEtapasPadrao,
  recoverFunilEtapas,
  updateFunil,
  updateFunilEtapa,
  type Funil,
  type FunilEtapa,
  type FunilEtapaPapel,
  type FunilTipo,
} from "@/lib/funis-api";
import {
  Check,
  Loader2,
  ListRestart,
  LifeBuoy,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  formatPrazoUnidade,
  PRAZO_UNIDADE_OPTIONS,
  type PrazoUnidade,
} from "@/lib/lead-monitoramento";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PAPEL_OPTIONS: Array<{
  value: FunilEtapaPapel | "";
  label: string;
}> = [
  { value: "", label: "Nenhum (intermediária)" },
  { value: "inicial", label: "Inicial" },
  { value: "analise", label: "Análise" },
  { value: "venda", label: "Venda" },
  { value: "perdido", label: "Perdido" },
];

const PAPEL_BADGE_LABEL: Record<FunilEtapaPapel, string> = {
  inicial: "Inicial",
  analise: "Análise",
  venda: "Venda",
  perdido: "Perdido",
};

type FiltroFunil = FunilTipo | "sem_tipo";

function funilNoFiltro(funil: Funil, filtro: FiltroFunil): boolean {
  const tipo = funilTipoOf(funil);
  if (filtro === "sem_tipo") return tipo === null;
  return tipo === filtro;
}

function resolveEtapaPapel(etapa: FunilEtapa): FunilEtapaPapel | null {
  if (etapa.papel) return etapa.papel;
  if (etapa.slug === "novo") return "inicial";
  if (etapa.slug === "em-analise") return "analise";
  if (etapa.slug === "ganho-venda") return "venda";
  if (etapa.slug === "perdido") return "perdido";
  return null;
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (/tipo should not exist/i.test(err.message)) {
      return "A API ainda está na versão antiga e recusa o campo tipo. Publique o Backend com a branch developer (e rode a migration de funil) e tente de novo.";
    }
    return err.message;
  }
  return fallback;
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
          <Badge
            className={cn(
              catalogColorBadgeClass(value || DEFAULT_CATALOG_COLOR),
            )}
            style={catalogColorBadgeStyle(value || DEFAULT_CATALOG_COLOR)}
            title={previewLabel.trim()}
          >
            {previewLabel.trim()}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {CATALOG_COLORS.map((color) => {
          const selected = sameCatalogColor(value, color);
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
                selected ? "border-foreground scale-110" : "border-transparent",
              )}
              style={catalogColorSwatchStyle(color)}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ConfigFunisPanel() {
  const { refresh: refreshCatalog, applyFunnelEtapas } = useCatalog();
  const { refresh: refreshLeads } = useLeads();
  const [funis, setFunis] = useState<Funil[]>([]);
  const [tipoFiltro, setTipoFiltro] = useState<FiltroFunil>("comercial");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPadrao, setCreatePadrao] = useState(true);
  const [createCustomStages, setCreateCustomStages] = useState("");
  const [createAtivar, setCreateAtivar] = useState(false);
  const [createTipo, setCreateTipo] = useState<FunilTipo>("comercial");

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const [etapaOpen, setEtapaOpen] = useState(false);
  const [etapaEdit, setEtapaEdit] = useState<FunilEtapa | null>(null);
  const [etapaLabel, setEtapaLabel] = useState("");
  const [etapaColor, setEtapaColor] = useState<string>(DEFAULT_CATALOG_COLOR);
  const [etapaPapel, setEtapaPapel] = useState<FunilEtapaPapel | "">("");
  const [etapaPrazoValor, setEtapaPrazoValor] = useState("");
  const [etapaPrazoUnidade, setEtapaPrazoUnidade] =
    useState<PrazoUnidade>("horas");
  const [etapaAlertaPercent, setEtapaAlertaPercent] = useState("20");
  const [inatividadeValor, setInatividadeValor] = useState("48");
  const [inatividadeUnidade, setInatividadeUnidade] =
    useState<PrazoUnidade>("horas");

  const [deleteFunilId, setDeleteFunilId] = useState<string | null>(null);
  const [deleteEtapa, setDeleteEtapa] = useState<FunilEtapa | null>(null);
  const [confirmDefaults, setConfirmDefaults] = useState(false);

  const funisDoTipo = funis.filter((f) => funilNoFiltro(f, tipoFiltro));
  const funisSemTipo = funis.filter((f) => funilTipoOf(f) === null);
  const selected = funisDoTipo.find((f) => f.id === selectedId) ?? null;
  const activeEtapas = (selected?.etapas ?? []).filter((e) => e.active);
  const funisParaVincular =
    tipoFiltro === "sem_tipo"
      ? []
      : funis.filter((f) => !funilNoFiltro(f, tipoFiltro));

  useEffect(() => {
    if (!selected) return;
    setInatividadeValor(String(selected.inatividadeValor ?? 48));
    setInatividadeUnidade(selected.inatividadeUnidade ?? "horas");
  }, [selected?.id, selected?.inatividadeValor, selected?.inatividadeUnidade]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchFunis();
      setFunis(list);
      setSelectedId((prev) => {
        const ofTipo = list.filter((f) => funilNoFiltro(f, tipoFiltro));
        if (prev && ofTipo.some((f) => f.id === prev)) return prev;
        return ofTipo.find((f) => f.ativo)?.id ?? ofTipo[0]?.id ?? null;
      });
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível carregar os funis."));
    } finally {
      setLoading(false);
    }
  }, [tipoFiltro]);

  useEffect(() => {
    void load();
  }, [load]);

  async function afterMutation(updated: Funil) {
    setFunis((prev) => {
      const without = prev.filter((f) => f.id !== updated.id);
      const next = [...without, updated].map((f) =>
        updated.ativo &&
          f.id !== updated.id &&
          funilTipoOf(f) !== null &&
          funilTipoOf(f) === funilTipoOf(updated)
          ? { ...f, ativo: false }
          : f,
      );
      return next.sort(
        (a, b) =>
          Number(b.ativo) - Number(a.ativo) || a.name.localeCompare(b.name),
      );
    });
    setSelectedId(updated.id);
    if (funilTipoOf(updated) === "comercial") {
      applyFunnelEtapas(updated.etapas);
    }
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
        tipo: createTipo,
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
      setTipoFiltro(parseFunilTipo(created.tipo) ?? createTipo);
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

  async function handleSaveInatividade() {
    if (!selected) return;
    const valor = Number(inatividadeValor);
    if (!Number.isInteger(valor) || valor < 1) {
      toast.error("Informe um período de inatividade válido.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateFunil(selected.id, {
        inatividadeValor: valor,
        inatividadeUnidade,
      });
      toast.success("Alerta de inatividade atualizado.");
      await afterMutation(updated);
      await refreshLeads({ silent: true });
    } catch (err) {
      toast.error(
        errorMessage(err, "Não foi possível salvar o período de inatividade."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleVincularTipo(funil: Funil, tipo: FunilTipo) {
    setSaving(true);
    try {
      const updated = await updateFunil(funil.id, { tipo });
      toast.success(
        `Funil "${updated.name}" vinculado a ${FUNIL_TIPO_LABEL[tipo]}.`,
      );
      setTipoFiltro(tipo);
      await afterMutation(updated);
      await load();
    } catch (err) {
      toast.error(
        errorMessage(err, "Não foi possível vincular o funil a este tipo."),
      );
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
    setEtapaPapel("");
    setEtapaPrazoValor("");
    setEtapaPrazoUnidade("horas");
    setEtapaAlertaPercent("20");
    setEtapaOpen(true);
  }

  function openEditEtapa(etapa: FunilEtapa) {
    setEtapaEdit(etapa);
    setEtapaLabel(etapa.label);
    setEtapaColor(normalizeCatalogColor(etapa.color));
    setEtapaPapel(resolveEtapaPapel(etapa) ?? "");
    setEtapaPrazoValor(etapa.prazoValor ? String(etapa.prazoValor) : "");
    setEtapaPrazoUnidade(etapa.prazoUnidade ?? "horas");
    setEtapaAlertaPercent(String(etapa.alertaAntecedenciaPercent ?? 20));
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
    const papel = etapaPapel === "" ? null : etapaPapel;
    const prazoRaw = etapaPrazoValor.trim();
    const prazoValor = prazoRaw === "" ? null : Number(prazoRaw);
    if (prazoRaw !== "" && (!Number.isInteger(prazoValor) || (prazoValor ?? 0) < 1)) {
      toast.error("Informe um prazo válido ou deixe em branco.");
      return;
    }
    const alertaPercent = Number(etapaAlertaPercent);
    setSaving(true);
    try {
      const payload = {
        label,
        color: etapaColor,
        papel,
        prazoValor,
        prazoUnidade: etapaPrazoUnidade,
        alertaAntecedenciaPercent:
          Number.isInteger(alertaPercent) && alertaPercent >= 1
            ? alertaPercent
            : 20,
      };
      const updated = etapaEdit
        ? await updateFunilEtapa(selected.id, etapaEdit.id, payload)
        : await addFunilEtapa(selected.id, payload);
      toast.success(etapaEdit ? "Etapa atualizada." : "Etapa adicionada.");
      setEtapaOpen(false);
      await afterMutation(updated);
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível salvar a etapa."));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveEtapa() {
    if (!selected || !deleteEtapa) return;
    setSaving(true);
    try {
      const updated = await deleteFunilEtapa(selected.id, deleteEtapa.id);
      toast.success(`Etapa "${deleteEtapa.label}" excluída.`);
      setDeleteEtapa(null);
      await afterMutation(updated);
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível excluir a etapa."));
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
      setConfirmDefaults(false);
      await afterMutation(updated);
    } catch (err) {
      toast.error(
        errorMessage(err, "Não foi possível instalar as etapas padrão."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRecoverLeadStages() {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await recoverFunilEtapas(selected.id);
      toast.success(
        "Etapas dos leads foram religadas a este funil. Elas voltam a aparecer no kanban.",
      );
      await afterMutation(updated);
    } catch (err) {
      toast.error(
        errorMessage(err, "Não foi possível recuperar as etapas dos leads."),
      );
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
                Passe o cursor para ver as etapas. Ative o funil em uso neste
                tipo de operação. O kanban comercial usa só o tipo Comercial.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setCreateTipo(
                  tipoFiltro === "sem_tipo" ? "comercial" : tipoFiltro,
                );
                setCreateOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Novo funil
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <Tabs
              value={tipoFiltro}
              onValueChange={(v) => setTipoFiltro(v as FiltroFunil)}
            >
              <TabsList className="w-full h-auto flex-wrap justify-start">
                {FUNIL_TIPOS.map((tipo) => (
                  <TabsTrigger key={tipo} value={tipo} className="text-xs">
                    {FUNIL_TIPO_LABEL[tipo]}
                  </TabsTrigger>
                ))}
                <TabsTrigger value="sem_tipo" className="text-xs">
                  Sem tipo
                  {funisSemTipo.length > 0 ? ` (${funisSemTipo.length})` : ""}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando…
              </div>
            )}
            {!loading && funisDoTipo.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {tipoFiltro === "sem_tipo"
                    ? "Todos os funis já estão vinculados a um tipo."
                    : "Nenhum funil cadastrado neste tipo."}
                </p>
                {tipoFiltro !== "sem_tipo" && funisParaVincular.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs font-medium">
                      Vincular um funil existente a{" "}
                      {FUNIL_TIPO_LABEL[tipoFiltro]}
                    </p>
                    {funisParaVincular.map((f) => {
                      const tipoAtual = funilTipoOf(f);
                      return (
                        <div
                          key={f.id}
                          className="flex items-center gap-2 rounded-lg border px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {f.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {tipoAtual
                                ? FUNIL_TIPO_LABEL[tipoAtual]
                                : "Sem tipo"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={saving}
                            onClick={() =>
                              void handleVincularTipo(f, tipoFiltro)
                            }
                          >
                            Vincular
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {funisDoTipo.map((f) => {
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
                        {funilTipoOf(f) === null ? "Sem tipo · " : ""}
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
                        <span className="text-muted-foreground">
                          Sem etapas
                        </span>
                      ) : (
                        etapasAtivas.map((e) => (
                          <Badge
                            key={e.id}
                            className={cn(
                              catalogColorBadgeClass(
                                e.color || DEFAULT_CATALOG_COLOR,
                              ),
                            )}
                            style={catalogColorBadgeStyle(
                              e.color || DEFAULT_CATALOG_COLOR,
                            )}
                            title={e.label}
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
                {selected
                  ? funilTipoOf(selected) === null
                    ? "Este funil ainda não tem tipo. Vincule-o a uma operação para usá-lo no kanban."
                    : selected.ativo
                      ? funilTipoOf(selected) === "comercial"
                        ? "Este funil está ativo no kanban e nos novos leads."
                        : "Este funil está ativo neste tipo de operação."
                      : "Edite as etapas ou ative este funil para usá-lo."
                  : "Edite as etapas ou ative este funil para usá-lo. Selecione um funil à esquerda."}
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
                  onClick={() => setConfirmDefaults(true)}
                >
                  <ListRestart className="w-4 h-4 mr-1" />
                  Etapas padrão
                </Button>
                {funilTipoOf(selected) === "comercial" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => void handleRecoverLeadStages()}
                >
                  <LifeBuoy className="w-4 h-4 mr-1" />
                  Recuperar etapas dos leads
                </Button>
                )}
                <Button size="sm" onClick={openAddEtapa}>
                  <Plus className="w-4 h-4 mr-1" />
                  Nova etapa
                </Button>
                {!selected.ativo && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={saving || funisDoTipo.length <= 1}
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
              <p className="text-sm text-muted-foreground">
                Selecione um funil à esquerda.
              </p>
            )}
            {selected && (
              <div className="rounded-lg border border-border/60 p-3 space-y-2">
                <p className="text-xs font-medium">Tipo de operação</p>
                <p className="text-[11px] text-muted-foreground">
                  Funis sem tipo não entram no kanban comercial. Vincule ao tipo
                  certo; o kanban de vendas usa só Comercial.
                </p>
                <select
                  className="h-8 w-full max-w-xs rounded-md border bg-background px-2 text-sm"
                  value={funilTipoOf(selected) ?? ""}
                  disabled={saving}
                  onChange={(e) => {
                    const tipo = parseFunilTipo(e.target.value);
                    if (!tipo) return;
                    void handleVincularTipo(selected, tipo);
                  }}
                >
                  {funilTipoOf(selected) === null && (
                    <option value="">Sem tipo — selecione para vincular</option>
                  )}
                  {FUNIL_TIPOS.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {FUNIL_TIPO_LABEL[tipo]}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {selected && (
              <div className="rounded-lg border border-border/60 p-3 space-y-2">
                <p className="text-xs font-medium">Alerta de inatividade</p>
                <p className="text-[11px] text-muted-foreground">
                  Leads sem mudança de etapa, triagem, tarefa ou atividade neste
                  período recebem borda vermelha no funil.
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Período</Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-8 w-24"
                      value={inatividadeValor}
                      onChange={(e) => setInatividadeValor(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Unidade</Label>
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                      value={inatividadeUnidade}
                      onChange={(e) =>
                        setInatividadeUnidade(e.target.value as PrazoUnidade)
                      }
                    >
                      {PRAZO_UNIDADE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => void handleSaveInatividade()}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            )}
            {selected && activeEtapas.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma etapa ativa. Adicione etapas ou use &quot;Etapas
                padrão&quot;.
              </p>
            )}
            {activeEtapas.map((s) => {
              const papel = resolveEtapaPapel(s);
              const isInitial = papel === "inicial";
              const color = s.color || DEFAULT_CATALOG_COLOR;
              return (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center gap-3 border border-border/60 rounded-lg p-3",
                    catalogColorSoftSurfaceClass(color),
                  )}
                  style={catalogColorSoftSurfaceStyle(color)}
                >
                  <Badge
                    className={catalogColorBadgeClass(color)}
                    style={catalogColorBadgeStyle(color)}
                    title={s.label}
                  >
                    {s.label}
                  </Badge>
                  {papel && (
                    <Badge variant="secondary" className="text-[10px]">
                      {PAPEL_BADGE_LABEL[papel]}
                    </Badge>
                  )}
                  {s.prazoValor ? (
                    <Badge variant="outline" className="text-[10px]">
                      Prazo {formatPrazoUnidade(s.prazoValor, s.prazoUnidade)}
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      Sem prazo
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {s.slug}
                  </span>
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
                        : "Excluir etapa"
                    }
                    onClick={() => setDeleteEtapa(s)}
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
              <div className="space-y-1.5">
                <Label>Tipo de operação</Label>
                <div className="flex flex-col gap-1.5">
                  {FUNIL_TIPOS.map((tipo) => (
                    <label key={tipo} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="funil-tipo"
                        checked={createTipo === tipo}
                        onChange={() => setCreateTipo(tipo)}
                      />
                      {FUNIL_TIPO_LABEL[tipo]}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={createPadrao}
                  onChange={(e) => setCreatePadrao(e.target.checked)}
                />
                Usar etapas padrão ({FUNIL_PADRAO_ETAPAS_COUNT[createTipo]} etapas)
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameOpen(false)}
              >
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
              <DialogTitle>
                {etapaEdit ? "Editar etapa" : "Nova etapa"}
              </DialogTitle>
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
              <div className="space-y-1.5">
                <Label htmlFor="etapa-papel">Papel no fluxo</Label>
                <select
                  id="etapa-papel"
                  className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                  value={etapaPapel}
                  onChange={(e) =>
                    setEtapaPapel(e.target.value as FunilEtapaPapel | "")
                  }
                >
                  {PAPEL_OPTIONS.map((opt) => (
                    <option key={opt.value || "none"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Análise envia à fila do analista; Venda conta na conversão;
                  Perdido dispara exclusão operacional.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Prazo máximo</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Sem prazo"
                    value={etapaPrazoValor}
                    onChange={(e) => setEtapaPrazoValor(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Unidade</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={etapaPrazoUnidade}
                    onChange={(e) =>
                      setEtapaPrazoUnidade(e.target.value as PrazoUnidade)
                    }
                  >
                    {PRAZO_UNIDADE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Alerta próximo do vencimento (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={etapaAlertaPercent}
                  onChange={(e) => setEtapaAlertaPercent(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Percentual restante do prazo para destacar o card em laranja.
                  Deixe o prazo em branco para não monitorar a etapa.
                </p>
              </div>
              <ColorSwatchPicker
                value={etapaColor}
                onChange={setEtapaColor}
                previewLabel={etapaLabel}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEtapaOpen(false)}
              >
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
        open={Boolean(deleteEtapa)}
        onOpenChange={(o) => !o && setDeleteEtapa(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir etapa{deleteEtapa ? ` “${deleteEtapa.label}”` : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A etapa some do funil. Leads que estavam nela vão para a etapa
              inicial. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
              onClick={() => void handleRemoveEtapa()}
            >
              Excluir etapa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmDefaults}
        onOpenChange={(o) => !o && setConfirmDefaults(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar etapas padrão?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso adiciona ou reativa as 11 etapas padrão do sistema neste
              funil (Novo lead, Contato, Qualificação, etc.). As etapas que
              você criou não são apagadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={() => void handleInstallDefaults()}
            >
              Restaurar padrão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteFunilId)}
        onOpenChange={(o) => !o && setDeleteFunilId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir funil?</AlertDialogTitle>
            <AlertDialogDescription>
              As etapas deste funil serão removidas. Leads não são apagados:
              as etapas que eles ainda usam são copiadas para o funil ativo.
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
