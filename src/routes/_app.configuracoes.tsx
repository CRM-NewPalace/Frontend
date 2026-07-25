import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useCatalog, INITIAL_STAGE_SLUG } from "@/lib/catalog-store";
import type { CatalogItem, CatalogType } from "@/lib/catalog-api";
import { ApiError } from "@/lib/api";
import { Plus, GripVertical, Pencil, Trash2, Zap, ListRestart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Imob CRM" }] }),
  component: Config,
});

const STAGE_COLORS = [
  "bg-slate-200 text-slate-700",
  "bg-blue-100 text-blue-700",
  "bg-indigo-100 text-indigo-700",
  "bg-cyan-100 text-cyan-700",
  "bg-teal-100 text-teal-700",
  "bg-amber-100 text-amber-700",
  "bg-orange-100 text-orange-700",
  "bg-violet-100 text-violet-700",
  "bg-pink-100 text-pink-700",
];

type Modelo = { id: string; nome: string; corpo: string };
type Automacao = { id: string; nome: string; descricao: string; ativa: boolean };

type ListKind = "origens" | "motivos" | "tags";

const LIST_META: Record<
  ListKind,
  { title: string; singular: string; addLabel: string; type: CatalogType }
> = {
  origens: { title: "Origens de leads", singular: "origem", addLabel: "Adicionar origem", type: "origem" },
  motivos: { title: "Motivos de perda", singular: "motivo", addLabel: "Adicionar motivo", type: "motivo_perda" },
  tags: { title: "Tags", singular: "tag", addLabel: "Adicionar tag", type: "tag" },
};

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function Config() {
  const {
    catalog,
    loading,
    error,
    funnelStages,
    addItem,
    updateItem,
    removeItem,
    installDefaultFunnel,
  } = useCatalog();

  const [modelos, setModelos] = useState<Modelo[]>([
    { id: "m1", nome: "Boas-vindas WhatsApp", corpo: "Olá {{nome}}! Bem-vindo(a) à New Palace. Sou {{corretor}} e vou te ajudar." },
    { id: "m2", nome: "Follow-up 24h", corpo: "Oi {{nome}}, tudo bem? Queria saber se conseguiu ver as opções que enviei ontem." },
    { id: "m3", nome: "Confirmação de visita", corpo: "{{nome}}, confirmando sua visita em {{data}} às {{hora}}. Qualquer imprevisto, me avise!" },
    { id: "m4", nome: "Envio de proposta", corpo: "{{nome}}, segue a proposta do {{empreendimento}}. Fico à disposição para esclarecer." },
    { id: "m5", nome: "Reengajamento", corpo: "Oi {{nome}}! Temos novidades que combinam com o que você buscava. Posso te mostrar?" },
  ]);
  const [automacoes, setAutomacoes] = useState<Automacao[]>([
    { id: "a1", nome: "Distribuir lead novo", descricao: "Atribui automaticamente a um corretor disponível.", ativa: true },
    { id: "a2", nome: "WhatsApp na mudança de etapa", descricao: "Envia template ao mover lead no funil.", ativa: false },
  ]);

  const [stageOpen, setStageOpen] = useState(false);
  const [stageName, setStageName] = useState("");
  const [saving, setSaving] = useState(false);

  const [listOpen, setListOpen] = useState(false);
  const [listKind, setListKind] = useState<ListKind>("origens");
  const [listValue, setListValue] = useState("");

  // Edição de label de qualquer item de catálogo.
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const [modeloOpen, setModeloOpen] = useState(false);
  const [editingModelo, setEditingModelo] = useState<Modelo | null>(null);
  const [modeloNome, setModeloNome] = useState("");
  const [modeloCorpo, setModeloCorpo] = useState("");

  const [autoOpen, setAutoOpen] = useState(false);
  const [autoNome, setAutoNome] = useState("");
  const [autoDesc, setAutoDesc] = useState("");

  function openAddList(kind: ListKind) {
    setListKind(kind);
    setListValue("");
    setListOpen(true);
  }

  function openEditItem(item: CatalogItem) {
    setEditItem(item);
    setEditLabel(item.label);
    setEditOpen(true);
  }

  async function handleInstallDefaults() {
    setSaving(true);
    try {
      await installDefaultFunnel();
      toast.success("Etapas padrão do funil instaladas no banco.");
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível instalar as etapas padrão."));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddStage(e: React.FormEvent) {
    e.preventDefault();
    const name = stageName.trim();
    if (!name) {
      toast.error("Informe o nome da etapa.");
      return;
    }
    setSaving(true);
    try {
      await addItem({
        type: "funil_etapa",
        label: name,
        color: STAGE_COLORS[funnelStages.length % STAGE_COLORS.length],
      });
      setStageOpen(false);
      setStageName("");
      toast.success(`Etapa "${name}" adicionada.`);
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível adicionar a etapa."));
    } finally {
      setSaving(false);
    }
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
      await addItem({ type: meta.type, label: value });
      setListOpen(false);
      setListValue("");
      toast.success(`${meta.singular[0].toUpperCase()}${meta.singular.slice(1)} "${value}" adicionada.`);
    } catch (err) {
      toast.error(errorMessage(err, `Não foi possível adicionar a ${meta.singular}.`));
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
    if (label === editItem.label) {
      setEditOpen(false);
      return;
    }
    setSaving(true);
    try {
      await updateItem(editItem.id, { label });
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

  function openCreateModelo() {
    setEditingModelo(null);
    setModeloNome("");
    setModeloCorpo("");
    setModeloOpen(true);
  }

  function openEditModelo(m: Modelo) {
    setEditingModelo(m);
    setModeloNome(m.nome);
    setModeloCorpo(m.corpo);
    setModeloOpen(true);
  }

  function handleSaveModelo(e: React.FormEvent) {
    e.preventDefault();
    const nome = modeloNome.trim();
    const corpo = modeloCorpo.trim();
    if (!nome || !corpo) {
      toast.error("Preencha nome e conteúdo do modelo.");
      return;
    }
    if (editingModelo) {
      setModelos((prev) =>
        prev.map((m) => (m.id === editingModelo.id ? { ...m, nome, corpo } : m)),
      );
      toast.success("Modelo atualizado.");
    } else {
      setModelos((prev) => [...prev, { id: `m${Date.now()}`, nome, corpo }]);
      toast.success(`Modelo "${nome}" criado.`);
    }
    setModeloOpen(false);
  }

  function handleAddAutomacao(e: React.FormEvent) {
    e.preventDefault();
    const nome = autoNome.trim();
    if (!nome) {
      toast.error("Informe o nome da automação.");
      return;
    }
    setAutomacoes((prev) => [
      ...prev,
      {
        id: `a${Date.now()}`,
        nome,
        descricao: autoDesc.trim() || "Automação personalizada.",
        ativa: true,
      },
    ]);
    setAutoOpen(false);
    setAutoNome("");
    setAutoDesc("");
    toast.success(`Automação "${nome}" criada.`);
  }

  const listItemsByKind: Record<ListKind, CatalogItem[]> = {
    origens: catalog.origem,
    motivos: catalog.motivo_perda,
    tags: catalog.tag,
  };

  return (
    <div>
      <PageHeader title="Configurações" description="Personalize funil, origens, tags e automações." />

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Tabs defaultValue="funil">
        <TabsList>
          <TabsTrigger value="funil">Funil</TabsTrigger>
          <TabsTrigger value="origens">Origens</TabsTrigger>
          <TabsTrigger value="motivos">Motivos de perda</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="modelos">Modelos</TabsTrigger>
          <TabsTrigger value="automacoes">Automações</TabsTrigger>
        </TabsList>

        <TabsContent value="funil">
          <Card>
            <CardHeader className="flex-row justify-between items-center gap-2 flex-wrap">
              <div>
                <CardTitle className="text-base">Etapas do funil</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Persistidas no banco. Novos leads entram em &quot;Novo lead&quot;.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => void handleInstallDefaults()}
                >
                  <ListRestart className="w-4 h-4 mr-1" />
                  Etapas padrão
                </Button>
                <Button size="sm" onClick={() => { setStageName(""); setStageOpen(true); }}>
                  <Plus className="w-4 h-4 mr-1" />Nova etapa
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
              {!loading && catalog.funil_etapa.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma etapa cadastrada. Use &quot;Etapas padrão&quot; ou crie a sua.
                </p>
              )}
              {catalog.funil_etapa.map((s) => {
                const isInitial = s.slug === INITIAL_STAGE_SLUG;
                return (
                  <div key={s.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/40">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <Badge className={s.color ?? "bg-slate-200 text-slate-700"}>{s.label}</Badge>
                    {isInitial && (
                      <Badge variant="secondary" className="text-[10px]">Inicial</Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">{s.slug}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditItem(s)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      disabled={isInitial}
                      title={isInitial ? "Etapa inicial não pode ser removida" : "Desativar"}
                      onClick={() => handleRemoveItem(s)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {(Object.keys(LIST_META) as ListKind[]).map((kind) => (
          <TabsContent key={kind} value={kind}>
            <Card>
              <CardHeader className="flex-row justify-between items-center">
                <CardTitle className="text-base">{LIST_META[kind].title}</CardTitle>
                <Button size="sm" onClick={() => openAddList(kind)}>
                  <Plus className="w-4 h-4 mr-1" />Adicionar
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
                {!loading && listItemsByKind[kind].length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>
                )}
                {listItemsByKind[kind].map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-2.5 border rounded-lg hover:bg-muted/40">
                    <Badge variant="outline" className="text-sm py-1 px-3">{item.label}</Badge>
                    <div className="ml-auto flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditItem(item)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveItem(item)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="modelos">
          <Card>
            <CardHeader className="flex-row justify-between items-center">
              <CardTitle className="text-base">Modelos de mensagem</CardTitle>
              <Button size="sm" onClick={openCreateModelo}>
                <Plus className="w-4 h-4 mr-1" />Novo modelo
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {modelos.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{m.nome}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{m.corpo}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openEditModelo(m)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Editar
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automacoes">
          <Card>
            <CardHeader className="flex-row justify-between items-center">
              <CardTitle className="text-base">Automações</CardTitle>
              <Button size="sm" onClick={() => { setAutoNome(""); setAutoDesc(""); setAutoOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" />Nova automação
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {automacoes.map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium flex items-center gap-2">
                      {a.nome}
                      <Badge variant={a.ativa ? "default" : "secondary"} className="text-[10px]">
                        {a.ativa ? "Ativa" : "Pausada"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{a.descricao}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAutomacoes((prev) =>
                        prev.map((x) => (x.id === a.id ? { ...x, ativa: !x.ativa } : x)),
                      );
                      toast.success(a.ativa ? "Automação pausada." : "Automação ativada.");
                    }}
                  >
                    {a.ativa ? "Pausar" : "Ativar"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={stageOpen} onOpenChange={setStageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova etapa</DialogTitle>
            <DialogDescription>Adicione uma etapa ao funil de vendas.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStage} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="stage-name">Nome da etapa</Label>
              <Input
                id="stage-name"
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                placeholder="Ex.: Análise de crédito"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStageOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}><Plus className="w-4 h-4" />Adicionar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setListOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}><Plus className="w-4 h-4" />Adicionar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar item</DialogTitle>
            <DialogDescription>Altere o nome exibido no CRM.</DialogDescription>
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={modeloOpen} onOpenChange={setModeloOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingModelo ? "Editar modelo" : "Novo modelo"}</DialogTitle>
            <DialogDescription>
              Use variáveis como {"{{nome}}"}, {"{{corretor}}"} e {"{{empreendimento}}"}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveModelo} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="modelo-nome">Nome</Label>
              <Input
                id="modelo-nome"
                value={modeloNome}
                onChange={(e) => setModeloNome(e.target.value)}
                placeholder="Ex.: Confirmação de proposta"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modelo-corpo">Conteúdo</Label>
              <Textarea
                id="modelo-corpo"
                value={modeloCorpo}
                onChange={(e) => setModeloCorpo(e.target.value)}
                placeholder="Texto da mensagem..."
                rows={5}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModeloOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingModelo ? "Salvar" : "Criar modelo"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={autoOpen} onOpenChange={setAutoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova automação</DialogTitle>
            <DialogDescription>Defina um gatilho automático para a operação.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAutomacao} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="auto-nome">Nome</Label>
              <Input
                id="auto-nome"
                value={autoNome}
                onChange={(e) => setAutoNome(e.target.value)}
                placeholder="Ex.: Notificar gerente em proposta"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="auto-desc">Descrição</Label>
              <Input
                id="auto-desc"
                value={autoDesc}
                onChange={(e) => setAutoDesc(e.target.value)}
                placeholder="O que essa automação faz"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAutoOpen(false)}>Cancelar</Button>
              <Button type="submit"><Plus className="w-4 h-4" />Criar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
