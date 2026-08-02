import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  createEmpreendimento,
  fetchEmpreendimentos,
  syncEmpreendimentosFromSite,
  type Empreendimento,
} from "@/lib/empreendimentos-api";
import {
  createConstrutora,
  fetchConstrutoras,
  type Construtora,
} from "@/lib/construtoras-api";
import {
  Building2, ExternalLink, Loader2, RefreshCw, Bath, BedDouble, Ruler, Plus,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/imoveis")({
  head: () => ({ meta: [{ title: "Imóveis — Zone Connection" }] }),
  component: ImoveisPage,
});

function ImoveisPage() {
  const user = getSession();
  const isAdmin = user?.role === "admin";
  const canCreate = isAdmin || user?.role === "gerente";
  const canSyncFromSite = isAdmin && user?.tenant?.slug === "new-palace";

  const [items, setItems] = useState<Empreendimento[]>([]);
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [localidade, setLocalidade] = useState("");
  const [quartos, setQuartos] = useState("");
  const [construtoraId, setConstrutoraId] = useState("");
  const [somenteLitoral, setSomenteLitoral] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickNome, setQuickNome] = useState("");
  const [quickConstrutoraId, setQuickConstrutoraId] = useState("");
  const [quickNovaConstrutora, setQuickNovaConstrutora] = useState(false);
  const [quickConstrutoraNome, setQuickConstrutoraNome] = useState("");
  const [quickCidade, setQuickCidade] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchEmpreendimentos({ ativo: true }));
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os imóveis.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function handleSync() {
    if (!canSyncFromSite) return;
    setSyncing(true);
    try {
      const result = await syncEmpreendimentosFromSite();
      toast.success(
        `Sync concluído: ${result.created} novos, ${result.updated} atualizados (${result.total} no total).`,
      );
      if (result.detail) {
        toast.message(result.detail);
      }
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Falha ao sincronizar com o site.",
      );
    } finally {
      setSyncing(false);
    }
  }

  async function openQuickCreate() {
    setQuickNome("");
    setQuickConstrutoraId("");
    setQuickNovaConstrutora(false);
    setQuickConstrutoraNome("");
    setQuickCidade("");
    setQuickOpen(true);
    try {
      setConstrutoras(await fetchConstrutoras());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as construtoras.",
      );
    }
  }

  async function handleQuickCreate() {
    if (quickNome.trim().length < 2) {
      toast.error("Informe o nome do empreendimento.");
      return;
    }

    let construtoraId = quickConstrutoraId;
    if (quickNovaConstrutora) {
      if (quickConstrutoraNome.trim().length < 2) {
        toast.error("Informe o nome da nova construtora.");
        return;
      }
    } else if (!construtoraId) {
      toast.error("Selecione a construtora ou crie uma nova.");
      return;
    }

    setQuickSaving(true);
    try {
      if (quickNovaConstrutora) {
        const criada = await createConstrutora({
          nome: quickConstrutoraNome.trim(),
        });
        construtoraId = criada.id;
        setConstrutoras((prev) =>
          [...prev, criada].sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR"),
          ),
        );
      }

      await createEmpreendimento({
        nome: quickNome.trim(),
        construtoraId,
        cidade: quickCidade.trim() || undefined,
      });
      setQuickOpen(false);
      await loadItems();
      toast.success(
        quickNovaConstrutora
          ? "Construtora e empreendimento cadastrados."
          : "Empreendimento cadastrado.",
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível cadastrar.",
      );
    } finally {
      setQuickSaving(false);
    }
  }

  const localidades = useMemo(
    () =>
      [
        ...new Set(
          items
            .map((item) => item.cidade)
            .filter((cidade): cidade is string => Boolean(cidade)),
        ),
      ]
        .sort((a, b) => a.localeCompare(b, "pt-BR")) as string[],
    [items],
  );
  const opcoesQuartos = useMemo(
    () =>
      [...new Set(items.flatMap((item) => item.quartos ?? []))].sort(
        (a, b) => a - b,
      ),
    [items],
  );
  const opcoesConstrutoras = useMemo(
    () =>
      Array.from(
        new Map(
          items.flatMap((item) =>
            item.construtora
              ? [[item.construtora.id, item.construtora.nome] as const]
              : [],
          ),
        ),
      )
        .map(([id, nome]) => ({ id, nome }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [items],
  );
  const hasActiveFilters =
    Boolean(localidade || quartos || construtoraId || somenteLitoral);

  function clearFilters() {
    setSearch("");
    setLocalidade("");
    setQuartos("");
    setConstrutoraId("");
    setSomenteLitoral(false);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    return items.filter((item) => {
      const searchable = [
        item.nome,
        item.cidade ?? "",
        item.endereco ?? "",
        item.construtora?.nome ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      const isLitoral = searchable.includes("praia");

      return (
        (!q || searchable.includes(q)) &&
        (!localidade || item.cidade === localidade) &&
        (!quartos || item.quartos === Number(quartos)) &&
        (!construtoraId || item.construtoraId === construtoraId) &&
        (!somenteLitoral || isLitoral)
      );
    });
  }, [
    items,
    search,
    localidade,
    quartos,
    construtoraId,
    somenteLitoral,
  ]);

  return (
    <div>
      <PageHeader
        title="Imóveis"
        description={
          canSyncFromSite
            ? "Empreendimentos da imobiliária (com opção de sincronizar do site)."
            : "Cadastre e gerencie os empreendimentos desta imobiliária."
        }
        actions={
          canCreate ? (
            <div className="flex gap-2">
              <Button onClick={() => void openQuickCreate()}>
                <Plus className="w-4 h-4 mr-1" />
                Novo imóvel
              </Button>
              {canSyncFromSite && (
                <Button onClick={() => void handleSync()} disabled={syncing}>
                  {syncing ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-1" />
                  )}
                  Sincronizar do site
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      <div className="mb-4 grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="sm:col-span-2 xl:col-span-1">
          <Label htmlFor="buscar-imovel" className="mb-1.5 block text-xs">
            Buscar
          </Label>
          <Input
            id="buscar-imovel"
            placeholder="Nome ou endereço…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Localidade</Label>
          <Select
            value={localidade || "__all__"}
            onValueChange={(value) =>
              setLocalidade(value === "__all__" ? "" : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {localidades.map((cidade) => (
                <SelectItem key={cidade} value={cidade}>
                  {cidade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Quartos</Label>
          <Select
            value={quartos || "__all__"}
            onValueChange={(value) => setQuartos(value === "__all__" ? "" : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {opcoesQuartos.map((quantidade) => (
                <SelectItem key={quantidade} value={String(quantidade)}>
                  {quantidade} quarto{quantidade === 1 ? "" : "s"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Construtora</Label>
          <Select
            value={construtoraId || "__all__"}
            onValueChange={(value) =>
              setConstrutoraId(value === "__all__" ? "" : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {opcoesConstrutoras.map((construtora) => (
                <SelectItem key={construtora.id} value={construtora.id}>
                  {construtora.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant={somenteLitoral ? "default" : "outline"}
            className="flex-1"
            onClick={() => setSomenteLitoral((current) => !current)}
          >
            Litoral
          </Button>
          {(hasActiveFilters || search) && (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              Limpar
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Carregando…
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Building2 className="w-8 h-8 opacity-40" />
            <p className="text-center max-w-sm">
              {items.length === 0
                ? canCreate
                  ? "Nenhum empreendimento cadastrado. Use “Novo imóvel” para começar."
                  : "Nenhum empreendimento cadastrado ainda."
                : hasActiveFilters
                  ? "Nenhum empreendimento encontrado para os filtros selecionados."
                  : "Nenhum resultado para a busca."}
            </p>
            {items.length === 0 && canCreate && (
              <Button className="mt-2" onClick={() => void openQuickCreate()}>
                <Plus className="w-4 h-4 mr-1" />
                Novo imóvel
              </Button>
            )}
            {items.length === 0 && canSyncFromSite && (
              <Button
                className="mt-2"
                variant="outline"
                onClick={() => void handleSync()}
                disabled={syncing}
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1" />
                )}
                Sincronizar do site
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item.id} className="group overflow-hidden transition-shadow hover:shadow-lg">
              <div className="relative h-40 overflow-hidden bg-gradient-to-br from-primary/25 via-primary/10 to-muted">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building2 className="h-10 w-10 text-primary/35" />
                </div>
                {item.imagemUrl && (
                  <img
                    src={item.imagemUrl}
                    alt={`Fachada do empreendimento ${item.nome}`}
                    className="relative h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
                {item.cidade && (
                  <Badge className="absolute bottom-3 right-3 border-white/20 bg-black/45 text-white hover:bg-black/55">
                    {item.cidade}
                  </Badge>
                )}
              </div>
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">
                    {item.nome}
                  </CardTitle>
                </div>
                {item.construtora && (
                  <p className="text-xs text-muted-foreground">
                    {item.construtora.nome}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {item.endereco && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.endereco}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {item.quartos != null && (
                    <span className="inline-flex items-center gap-1">
                      <BedDouble className="w-3.5 h-3.5" />
                      {item.quartos}
                    </span>
                  )}
                  {item.banheiros != null && (
                    <span className="inline-flex items-center gap-1">
                      <Bath className="w-3.5 h-3.5" />
                      {item.banheiros}
                    </span>
                  )}
                  {item.areaM2 != null && (
                    <span className="inline-flex items-center gap-1">
                      <Ruler className="w-3.5 h-3.5" />
                      {item.areaM2} m²
                    </span>
                  )}
                </div>
                {item.externalUrl && (
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Ver no site
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo empreendimento</DialogTitle>
            <DialogDescription>
              Cadastre rapidamente um imóvel e vincule-o à construtora.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="quick-imovel-nome">Nome *</Label>
              <Input
                id="quick-imovel-nome"
                value={quickNome}
                onChange={(event) => setQuickNome(event.target.value)}
                placeholder="Ex.: Reserva dos Ipês"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Construtora *</Label>
              <Select
                value={
                  quickNovaConstrutora
                    ? "__new__"
                    : quickConstrutoraId || "__none__"
                }
                onValueChange={(value) => {
                  if (value === "__new__") {
                    setQuickNovaConstrutora(true);
                    setQuickConstrutoraId("");
                    return;
                  }
                  setQuickNovaConstrutora(false);
                  setQuickConstrutoraNome("");
                  setQuickConstrutoraId(value === "__none__" ? "" : value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecione</SelectItem>
                  <SelectItem value="__new__">+ Nova construtora</SelectItem>
                  {construtoras.map((construtora) => (
                    <SelectItem key={construtora.id} value={construtora.id}>
                      {construtora.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {quickNovaConstrutora ? (
                <Input
                  value={quickConstrutoraNome}
                  onChange={(event) =>
                    setQuickConstrutoraNome(event.target.value)
                  }
                  placeholder="Nome da construtora"
                  className="mt-2"
                  autoFocus
                />
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quick-imovel-cidade">Cidade</Label>
              <Input
                id="quick-imovel-cidade"
                value={quickCidade}
                onChange={(event) => setQuickCidade(event.target.value)}
                placeholder="Ex.: Recife"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuickOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={quickSaving}
              onClick={() => void handleQuickCreate()}
            >
              {quickSaving && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
