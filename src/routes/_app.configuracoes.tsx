import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
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
  DEFAULT_CCA_COLOR,
  catalogColorBadgeClass,
  catalogColorBadgeStyle,
  catalogColorSwatchStyle,
  isHexColor,
  nextCatalogColor,
  normalizeCatalogColor,
  sameCatalogColor,
  STATUS_CHIP_CLASS,
} from "@/lib/catalog-colors";
import {
  getVistaParcelas,
  setVistaParcelas,
  type VistaParcelas,
} from "@/lib/financeiro-prefs";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { canAccessRoute } from "@/lib/permissions";
import {
  getHideImoveisFromSidebar,
  getImoveisVista,
  IMOVEIS_CAMPO_GRUPOS,
  IMOVEIS_CAMPOS,
  setHideImoveisFromSidebar,
  setImoveisVista,
  useImoveisCamposVisiveis,
  type ImoveisVista,
} from "@/lib/imoveis-nav-prefs";
import {
  getMetasVista,
  setMetasVista,
  type MetasVista,
} from "@/lib/metas-nav-prefs";
import { ImoveisPage } from "@/routes/_app.imoveis";
import { LayoutGrid, LayoutList, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfigFunisPanel } from "@/components/config-funis-panel";
import { ConfigEmpresaPanel } from "@/components/config-empresa-panel";
import { ConfigCreciPanel } from "@/components/config-creci-panel";
import { ConfigConexoesPanel } from "@/components/config-conexoes-panel";
import { userCanInformarCreci } from "@/lib/users-api";
import { CorPicker } from "@/components/cor-picker";
import {
  CONSTRUTORA_CORES_PRESET,
  construtoraBadgeStyle,
} from "@/lib/construtoras-api";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Zone Connection" }] }),
  validateSearch: (search: Record<string, unknown>): { google?: string } => {
    const google =
      typeof search.google === "string" && search.google.trim()
        ? search.google.trim()
        : undefined;
    return google ? { google } : {};
  },
  component: Config,
});

type ListKind =
  | "origens"
  | "motivos"
  | "tags"
  | "cca"
  | "docFontes"
  | "docStatus1"
  | "docStatus2"
  | "empTipos"
  | "empStatus"
  | "empTags";

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
  cca: {
    title: "CCAs",
    singular: "CCA",
    addLabel: "Adicionar CCA",
    type: "cca",
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
  empTipos: {
    title: "Tipos de empreendimento",
    singular: "tipo",
    addLabel: "Adicionar tipo",
    type: "empreendimento_tipo",
  },
  empStatus: {
    title: "Status do empreendimento",
    singular: "status",
    addLabel: "Adicionar status",
    type: "empreendimento_status",
  },
  empTags: {
    title: "Tags do empreendimento",
    singular: "tag",
    addLabel: "Adicionar tag",
    type: "empreendimento_tag",
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
          <Badge
            className={catalogColorBadgeClass(value)}
            style={catalogColorBadgeStyle(value)}
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
                "h-7 w-7 rounded-full border-2 transition-transform",
                selected
                  ? "border-foreground scale-110 ring-2 ring-foreground/20"
                  : "border-transparent hover:scale-105",
              )}
              style={catalogColorSwatchStyle(color)}
            />
          );
        })}
      </div>
    </div>
  );
}

function CatalogItemBadge({ item }: { item: CatalogItem }) {
  if (isHexColor(item.color)) {
    return (
      <Badge
        variant="secondary"
        className={cn(STATUS_CHIP_CLASS, "border-transparent")}
        style={construtoraBadgeStyle(item.color)}
        title={item.label}
      >
        {item.label}
      </Badge>
    );
  }
  return (
    <Badge
      className={catalogColorBadgeClass(item.color)}
      style={catalogColorBadgeStyle(item.color)}
      title={item.label}
    >
      {item.label}
    </Badge>
  );
}

function CatalogKindCard({
  title,
  loading,
  items,
  onAdd,
  onEdit,
  onRemove,
}: {
  title: string;
  loading: boolean;
  items: CatalogItem[];
  onAdd: () => void;
  onEdit: (item: CatalogItem) => void;
  onRemove: (item: CatalogItem) => void;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        <Button
          size="sm"
          variant="outline"
          className="h-8 shrink-0"
          onClick={onAdd}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Adicionar
        </Button>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : items.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            Nenhum item cadastrado.
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/40"
              >
                <CatalogItemBadge item={item} />
                <div className="ml-auto flex shrink-0 items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit(item)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => onRemove(item)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Config() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/configuracoes" });
  const user = getSession();
  const isAnalista = user?.role === "analista";
  const isTreinee = user?.role === "treinee";
  const isCorretor = user?.role === "corretor";
  const showCreci = Boolean(user && userCanInformarCreci(user));
  const showOpsTabs = !isAnalista && !isTreinee && !isCorretor;
  const showDocumentacao = !isTreinee && !isCorretor;
  const showMotivos = !isTreinee && !isCorretor;
  const showCatalogTabs = !isCorretor;
  const showImoveis = Boolean(
    user &&
      canAccessRoute(
        user.role,
        "/imoveis",
        user.tenant?.modules ?? null,
        user.tenant?.plano ?? null,
        user.permissions ?? null,
      ),
  );
  const showMetas = Boolean(
    user &&
      canAccessRoute(
        user.role,
        "/metas",
        user.tenant?.modules ?? null,
        user.tenant?.plano ?? null,
        user.permissions ?? null,
      ),
  );
  const { catalog, loading, error, addItem, updateItem, removeItem } =
    useCatalog();

  const defaultTab = search.google
    ? "conexoes"
    : isCorretor
      ? showCreci
        ? "creci"
        : "conexoes"
      : isTreinee
        ? "listas"
        : isAnalista
          ? "documentacao"
          : "empresa";
  const [tab, setTab] = useState(defaultTab);
  const [saving, setSaving] = useState(false);
  const [vistaParcelas, setVistaParcelasState] = useState<VistaParcelas>(() =>
    getVistaParcelas(),
  );
  const [hideImoveisFromSidebar, setHideImoveisFromSidebarState] = useState(
    () => getHideImoveisFromSidebar(),
  );
  const [imoveisVista, setImoveisVistaState] = useState<ImoveisVista>(() =>
    getImoveisVista(),
  );
  const imoveisCampos = useImoveisCamposVisiveis();
  const [metasVista, setMetasVistaState] = useState<MetasVista>(() =>
    getMetasVista(),
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
    setListColor(
      kind === "cca"
        ? CONSTRUTORA_CORES_PRESET[count % CONSTRUTORA_CORES_PRESET.length]
        : nextCatalogColor(count),
    );
    setListOpen(true);
  }

  function openEditItem(item: CatalogItem) {
    setEditItem(item);
    setEditLabel(item.label);
    setEditColor(
      item.type === "cca"
        ? isHexColor(item.color)
          ? item.color!
          : DEFAULT_CCA_COLOR
        : normalizeCatalogColor(item.color),
    );
    setEditOpen(true);
  }

  async function handleAddListItem(e: React.FormEvent) {
    e.preventDefault();
    const value = listValue.trim();
    const meta = LIST_META[listKind];
    if (!value) {
      toast.error(
        listKind === "cca" ? "Informe o CCA." : `Informe a ${meta.singular}.`,
      );
      return;
    }
    if (listKind === "cca" && !isHexColor(listColor)) {
      toast.error("Informe a cor hexadecimal do CCA (#RRGGBB).");
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
    if (editItem.type === "cca" && !isHexColor(editColor)) {
      toast.error("Informe a cor hexadecimal do CCA (#RRGGBB).");
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
      const isDocStatus =
        editItem.type === "documentacao_status1" ||
        editItem.type === "documentacao_status2" ||
        editItem.type === "documentacao_fonte";
      toast.success(
        isDocStatus && labelChanged
          ? "Status atualizado nas configurações e nas documentações."
          : "Item atualizado.",
      );
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível atualizar o item."));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!search.google) return;
    setTab("conexoes");
    if (search.google === "connected") {
      toast.success(
        "Google Agenda conectada. Novos compromissos vão para o Calendar.",
      );
    } else if (search.google === "denied") {
      toast.error("Conexão com o Google cancelada.");
    } else {
      toast.error("Não foi possível conectar o Google Agenda.");
    }
    void navigate({ to: "/configuracoes", search: {}, replace: true });
  }, [search.google, navigate]);

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
    cca: catalog.cca,
    docFontes: catalog.documentacao_fonte,
    docStatus1: catalog.documentacao_status1,
    docStatus2: catalog.documentacao_status2,
    empTipos: catalog.empreendimento_tipo,
    empStatus: catalog.empreendimento_status,
    empTags: catalog.empreendimento_tag,
  };

  return (
    <div>
      <PageHeader
        title="Configurações"
        description={
          isCorretor
            ? "Informe o CRECI e conecte o Google Agenda."
            : isTreinee
              ? "Gerencie conexões, origens, tags, CCAs e catálogos de imóveis."
              : isAnalista
                ? "Gerencie conexões, documentação, origens, motivos de perda, tags, CCAs e catálogos de imóveis."
                : "Personalize conexões, imobiliária, funil, documentação, origens, motivos, tags, CCAs e imóveis."
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          {showCreci ? (
            <TabsTrigger value="creci">Meu CRECI</TabsTrigger>
          ) : null}
          <TabsTrigger value="conexoes">Conexões</TabsTrigger>
          {showOpsTabs ? (
            <>
              <TabsTrigger value="empresa">Imobiliária</TabsTrigger>
              <TabsTrigger value="funil">Funil</TabsTrigger>
            </>
          ) : null}
          {showDocumentacao ? (
            <TabsTrigger value="documentacao">Documentação</TabsTrigger>
          ) : null}
          {showOpsTabs ? (
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          ) : null}
          {showImoveis && showCatalogTabs ? (
            <TabsTrigger value="imoveis">Imóveis</TabsTrigger>
          ) : null}
          {showMetas ? <TabsTrigger value="metas">Metas</TabsTrigger> : null}
          {showCatalogTabs ? (
            <TabsTrigger value="listas">Listas</TabsTrigger>
          ) : null}
        </TabsList>

        {showCreci ? (
          <TabsContent value="creci">
            <ConfigCreciPanel />
          </TabsContent>
        ) : null}

        <TabsContent value="conexoes">
          <ConfigConexoesPanel />
        </TabsContent>

        {showOpsTabs ? (
          <>
            <TabsContent value="empresa">
              <ConfigEmpresaPanel />
            </TabsContent>

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
                          Exibe todas as parcelas como linhas separadas na
                          tabela.
                        </p>
                      </div>
                    </label>
                  </RadioGroup>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        ) : null}

        {showImoveis && showCatalogTabs ? (
          <TabsContent value="imoveis" className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Catálogo do cadastro, aparência da lista e empreendimentos.
              Admin, gerente, analista e treinee podem criar, editar e excluir
              tipos, status e tags.
            </p>

            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold">Catálogo</h2>
                <p className="text-xs text-muted-foreground">
                  Opções usadas no formulário de imóveis.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(
                  [
                    ["empTipos", "Tipos"],
                    ["empStatus", "Status"],
                    ["empTags", "Tags"],
                  ] as const
                ).map(([kind, title]) => (
                  <CatalogKindCard
                    key={kind}
                    title={title}
                    loading={loading}
                    items={listItemsByKind[kind]}
                    onAdd={() => openAddList(kind)}
                    onEdit={openEditItem}
                    onRemove={(item) => void handleRemoveItem(item)}
                  />
                ))}
              </div>
            </section>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Lista de imóveis</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Vista padrão, campos na lista e visibilidade no menu.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border p-3">
                    <p className="mb-2 text-sm font-medium">
                      Visualização padrão
                    </p>
                    <div className="inline-flex rounded-lg border bg-muted/40 p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 px-3",
                          imoveisVista === "cards" && "bg-background shadow-sm",
                        )}
                        onClick={() => {
                          setImoveisVistaState("cards");
                          setImoveisVista("cards");
                          toast.success("Imóveis abrem em cards.");
                        }}
                      >
                        <LayoutGrid className="mr-1.5 h-4 w-4" />
                        Cards
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 px-3",
                          imoveisVista === "tabela" &&
                            "bg-background shadow-sm",
                        )}
                        onClick={() => {
                          setImoveisVistaState("tabela");
                          setImoveisVista("tabela");
                          toast.success("Imóveis abrem em tabela.");
                        }}
                      >
                        <LayoutList className="mr-1.5 h-4 w-4" />
                        Tabela
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
                    <div>
                      <p className="text-sm font-medium">Ocultar do menu</p>
                      <p className="text-xs text-muted-foreground">
                        Some do menu e fica só nesta aba.
                      </p>
                    </div>
                    <Switch
                      checked={hideImoveisFromSidebar}
                      onCheckedChange={(checked) => {
                        setHideImoveisFromSidebarState(checked);
                        setHideImoveisFromSidebar(checked);
                        toast.success(
                          checked
                            ? "Imóveis oculto do menu. Use esta aba para cadastrar."
                            : "Imóveis voltou a aparecer no menu e em Configurações.",
                        );
                      }}
                      aria-label="Ocultar Imóveis do menu lateral"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Campos visíveis</p>
                    <p className="text-xs text-muted-foreground">
                      O que aparece nos cards e na tabela.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {IMOVEIS_CAMPO_GRUPOS.map((grupo) => (
                      <div
                        key={grupo.id}
                        className="rounded-xl border bg-muted/20 p-3"
                      >
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {grupo.label}
                        </p>
                        <div className="space-y-2">
                          {IMOVEIS_CAMPOS.filter(
                            (campo) => campo.grupo === grupo.id,
                          ).map((campo) => {
                            const visivel = imoveisCampos.show(campo.id);
                            const switchId = `imovel-campo-${campo.id}`;
                            return (
                              <label
                                key={campo.id}
                                htmlFor={switchId}
                                className="flex cursor-pointer items-center justify-between gap-3"
                              >
                                <span className="text-sm">{campo.label}</span>
                                <Switch
                                  id={switchId}
                                  checked={visivel}
                                  onCheckedChange={(checked) =>
                                    imoveisCampos.setVisible(campo.id, checked)
                                  }
                                  aria-label={`Exibir ${campo.label.toLocaleLowerCase("pt-BR")}`}
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <section className="space-y-3 border-t pt-6">
              <ImoveisPage embedded />
            </section>
          </TabsContent>
        ) : null}

        {showMetas ? (
          <TabsContent value="metas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Visualização padrão</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Define como a lista de metas abre: em cards ou em tabela.
                </p>
                <div className="inline-flex rounded-lg border bg-muted/40 p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-9 px-4",
                      metasVista === "cards" && "bg-background shadow-sm",
                    )}
                    onClick={() => {
                      setMetasVistaState("cards");
                      setMetasVista("cards");
                      toast.success("Metas abrem em cards.");
                    }}
                  >
                    <LayoutGrid className="mr-1.5 h-4 w-4" />
                    Cards
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-9 px-4",
                      metasVista === "tabela" && "bg-background shadow-sm",
                    )}
                    onClick={() => {
                      setMetasVistaState("tabela");
                      setMetasVista("tabela");
                      toast.success("Metas abrem em tabela.");
                    }}
                  >
                    <LayoutList className="mr-1.5 h-4 w-4" />
                    Tabela
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        {showDocumentacao ? (
          <TabsContent value="documentacao" className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Opções usadas no formulário rápido do analista e na tela
              Documentação. Crie fontes e status para seleção rápida.
            </p>

            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold">Catálogo</h2>
                <p className="text-xs text-muted-foreground">
                  Fontes e status para seleção rápida.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(
                  [
                    ["docFontes", "Fontes"],
                    ["docStatus1", "Status 1"],
                    ["docStatus2", "Status 2"],
                  ] as const
                ).map(([kind, title]) => (
                  <CatalogKindCard
                    key={kind}
                    title={title}
                    loading={loading}
                    items={listItemsByKind[kind]}
                    onAdd={() => openAddList(kind)}
                    onEdit={openEditItem}
                    onRemove={(item) => void handleRemoveItem(item)}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Status 1 é da análise; Status 2 é do comercial.
              </p>
            </section>
          </TabsContent>
        ) : null}

        {showCatalogTabs ? (
          <TabsContent value="listas" className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Origens, tags, CCAs
              {showMotivos ? " e motivos de perda" : ""} usados no cadastro de
              leads.
            </p>
            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold">Catálogo</h2>
                <p className="text-xs text-muted-foreground">
                  Opções do formulário de leads.
                </p>
              </div>
              <div
                className={cn(
                  "grid gap-4 md:grid-cols-2",
                  showMotivos ? "xl:grid-cols-4" : "xl:grid-cols-3",
                )}
              >
                {(
                  [
                    ["origens", "Origens"],
                    ...(showMotivos
                      ? ([["motivos", "Motivos"]] as const)
                      : []),
                    ["tags", "Tags"],
                    ["cca", "CCA"],
                  ] as const
                ).map(([kind, title]) => (
                  <CatalogKindCard
                    key={kind}
                    title={title}
                    loading={loading}
                    items={listItemsByKind[kind]}
                    onAdd={() => openAddList(kind)}
                    onEdit={openEditItem}
                    onRemove={(item) => void handleRemoveItem(item)}
                  />
                ))}
              </div>
            </section>
          </TabsContent>
        ) : null}
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
            {listKind === "cca" ? (
              <CorPicker
                id="list-cca-cor"
                label="Cor hexadecimal"
                value={listColor}
                onChange={setListColor}
                previewLabel={listValue || "Prévia"}
              />
            ) : (
              <ColorSwatchPicker
                value={listColor}
                onChange={setListColor}
                previewLabel={listValue || "Prévia"}
              />
            )}
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
            {editItem?.type === "cca" ? (
              <CorPicker
                id="edit-cca-cor"
                label="Cor hexadecimal"
                value={editColor}
                onChange={setEditColor}
                previewLabel={editLabel || "Prévia"}
              />
            ) : (
              <ColorSwatchPicker
                value={editColor}
                onChange={setEditColor}
                previewLabel={editLabel || "Prévia"}
              />
            )}
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
