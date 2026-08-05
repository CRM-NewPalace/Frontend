import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCatalog } from "@/lib/catalog-store";
import type { CatalogItem, CatalogType } from "@/lib/catalog-api";
import {
  CATALOG_COLORS,
  DEFAULT_CATALOG_COLOR,
  catalogColorSwatch,
  nextCatalogColor,
} from "@/lib/catalog-colors";
import {
  getVistaParcelas,
  setVistaParcelas,
  type VistaParcelas,
} from "@/lib/financeiro-prefs";
import { ApiError } from "@/lib/api";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfigFunisPanel } from "@/components/config-funis-panel";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Zone Connection" }] }),
  component: Config,
});

type ListKind =
  | "origens"
  | "motivos"
  | "tags"
  | "docFontes"
  | "docStatus1"
  | "docStatus2";

const LIST_META: Record<
  ListKind,
  { title: string; singular: string; addLabel: string; type: CatalogType }
> = {
  origens: {
    title: "Origens de leads",
    singular: "origem",
    addLabel: "Adicionar origem",
    type: "origem",
  },
  motivos: {
    title: "Motivos de perda",
    singular: "motivo",
    addLabel: "Adicionar motivo",
    type: "motivo_perda",
  },
  tags: {
    title: "Tags",
    singular: "tag",
    addLabel: "Adicionar tag",
    type: "tag",
  },
  docFontes: {
    title: "Fontes da documentação",
    singular: "fonte",
    addLabel: "Adicionar fonte",
    type: "documentacao_fonte",
  },
  docStatus1: {
    title: "Status 1 (análise)",
    singular: "status 1",
    addLabel: "Adicionar status 1",
    type: "documentacao_status1",
  },
  docStatus2: {
    title: "Status 2 (comercial)",
    singular: "status 2",
    addLabel: "Adicionar status 2",
    type: "documentacao_status2",
  },
};

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
                "h-7 w-7 rounded-full border-2 transition-transform",
                catalogColorSwatch(color),
                selected
                  ? "border-foreground scale-110 ring-2 ring-foreground/20"
                  : "border-transparent hover:scale-105",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

function Config() {
  const { catalog, loading, error, addItem, updateItem, removeItem } =
    useCatalog();

  const [saving, setSaving] = useState(false);
  const [vistaParcelas, setVistaParcelasState] = useState<VistaParcelas>(() =>
    getVistaParcelas(),
  );

  const [listOpen, setListOpen] = useState(false);
  const [listKind, setListKind] = useState<ListKind>("origens");
  const [listValue, setListValue] = useState("");
  const [listColor, setListColor] = useState<string>(DEFAULT_CATALOG_COLOR);

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState<string>(DEFAULT_CATALOG_COLOR);

  function openAddList(kind: ListKind) {
    const count = catalog[LIST_META[kind].type].length;
    setListKind(kind);
    setListValue("");
    setListColor(nextCatalogColor(count));
    setListOpen(true);
  }

  function openEditItem(item: CatalogItem) {
    setEditItem(item);
    setEditLabel(item.label);
    setEditColor(item.color ?? DEFAULT_CATALOG_COLOR);
    setEditOpen(true);
  }

  async function handleAddListItem(e: React.FormEvent) {
    e.preventDefault();
    const value = listValue.trim();
    const meta = LIST_META[listKind];
    if (!value) {
      toast.error(`Informe a ${meta.singular}.`);
      return;
    }
    setSaving(true);
    try {
      await addItem({ type: meta.type, label: value, color: listColor });
      setListOpen(false);
      setListValue("");
      toast.success(
        `${meta.singular[0].toUpperCase()}${meta.singular.slice(1)} "${value}" adicionada.`,
      );
    } catch (err) {
      toast.error(
        errorMessage(err, `Não foi possível adicionar a ${meta.singular}.`),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    const label = editLabel.trim();
    if (!label) {
      toast.error("Informe um nome.");
      return;
    }
    const colorChanged =
      editColor !== (editItem.color ?? DEFAULT_CATALOG_COLOR);
    const labelChanged = label !== editItem.label;
    if (!labelChanged && !colorChanged) {
      setEditOpen(false);
      return;
    }
    setSaving(true);
    try {
      await updateItem(editItem.id, {
        ...(labelChanged ? { label } : {}),
        ...(colorChanged ? { color: editColor } : {}),
      });
      setEditOpen(false);
      setEditItem(null);
      toast.success("Item atualizado.");
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível atualizar o item."));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveItem(item: CatalogItem) {
    try {
      await removeItem(item.id);
      toast.success(`"${item.label}" desativado.`);
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível desativar o item."));
    }
  }

  const listItemsByKind: Record<ListKind, CatalogItem[]> = {
    origens: catalog.origem,
    motivos: catalog.motivo_perda,
    tags: catalog.tag,
    docFontes: catalog.documentacao_fonte,
    docStatus1: catalog.documentacao_status1,
    docStatus2: catalog.documentacao_status2,
  };

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Personalize funil, documentação do analista, origens, motivos e tags."
      />

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Tabs defaultValue="funil">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="funil">Funil</TabsTrigger>
          <TabsTrigger value="documentacao">Documentação</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="origens">Origens</TabsTrigger>
          <TabsTrigger value="motivos">Motivos de perda</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="funil">
          <ConfigFunisPanel />
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Visualização de parcelas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Define como Contas a pagar e Contas a receber exibem títulos
                parcelados.
              </p>
              <RadioGroup
                value={vistaParcelas}
                onValueChange={(v) => {
                  const next = v as VistaParcelas;
                  setVistaParcelasState(next);
                  setVistaParcelas(next);
                  toast.success(
                    next === "agrupado"
                      ? "Vista agrupada ativada."
                      : "Lista completa ativada.",
                  );
                }}
                className="space-y-3"
              >
                <label
                  htmlFor="vista-agrupado"
                  className="flex items-start gap-3 rounded-lg border border-border/60 p-3 cursor-pointer hover:bg-muted/40"
                >
                  <RadioGroupItem
                    id="vista-agrupado"
                    value="agrupado"
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">Conta agrupada</p>
                    <p className="text-xs text-muted-foreground">
                      Uma linha por contrato; use a seta para expandir as
                      parcelas e pagar cada uma.
                    </p>
                  </div>
                </label>
                <label
                  htmlFor="vista-lista"
                  className="flex items-start gap-3 rounded-lg border border-border/60 p-3 cursor-pointer hover:bg-muted/40"
                >
                  <RadioGroupItem
                    id="vista-lista"
                    value="lista"
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">Lista completa</p>
                    <p className="text-xs text-muted-foreground">
                      Exibe todas as parcelas como linhas separadas na tabela.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentacao" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Opções usadas no formulário rápido do analista e na tela
            Documentação. Crie fontes e status para seleção rápida.
          </p>
          {(["docFontes", "docStatus1", "docStatus2"] as ListKind[]).map(
            (kind) => (
              <Card key={kind}>
                <CardHeader className="flex-row justify-between items-center">
                  <CardTitle className="text-base">
                    {LIST_META[kind].title}
                  </CardTitle>
                  <Button size="sm" onClick={() => openAddList(kind)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {loading && (
                    <p className="text-sm text-muted-foreground">Carregando…</p>
                  )}
                  {!loading && listItemsByKind[kind].length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum item cadastrado.
                    </p>
                  )}
                  {listItemsByKind[kind].map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2.5 border rounded-lg hover:bg-muted/40"
                    >
                      <Badge
                        className={cn(
                          "text-sm py-1 px-3",
                          item.color ?? DEFAULT_CATALOG_COLOR,
                        )}
                      >
                        {item.label}
                      </Badge>
                      <div className="ml-auto flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditItem(item)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleRemoveItem(item)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ),
          )}
        </TabsContent>

        {(["origens", "motivos", "tags"] as ListKind[]).map((kind) => (
          <TabsContent key={kind} value={kind}>
            <Card>
              <CardHeader className="flex-row justify-between items-center">
                <CardTitle className="text-base">
                  {LIST_META[kind].title}
                </CardTitle>
                <Button size="sm" onClick={() => openAddList(kind)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading && (
                  <p className="text-sm text-muted-foreground">Carregando…</p>
                )}
                {!loading && listItemsByKind[kind].length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum item cadastrado.
                  </p>
                )}
                {listItemsByKind[kind].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2.5 border rounded-lg hover:bg-muted/40"
                  >
                    <Badge
                      className={cn(
                        "text-sm py-1 px-3",
                        item.color ?? DEFAULT_CATALOG_COLOR,
                      )}
                    >
                      {item.label}
                    </Badge>
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditItem(item)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleRemoveItem(item)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{LIST_META[listKind].addLabel}</DialogTitle>
            <DialogDescription>
              Cadastre uma nova {LIST_META[listKind].singular} para uso no CRM.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddListItem} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="list-value">Nome</Label>
              <Input
                id="list-value"
                value={listValue}
                onChange={(e) => setListValue(e.target.value)}
                placeholder={`Ex.: Nova ${LIST_META[listKind].singular}`}
                autoFocus
              />
            </div>
            <ColorSwatchPicker
              value={listColor}
              onChange={setListColor}
              previewLabel={listValue || "Prévia"}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setListOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar item</DialogTitle>
            <DialogDescription>
              Altere o nome e a cor exibidos no CRM.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-label">Nome</Label>
              <Input
                id="edit-label"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                autoFocus
              />
            </div>
            <ColorSwatchPicker
              value={editColor}
              onChange={setEditColor}
              previewLabel={editLabel || "Prévia"}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
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
    </div>
  );
}
