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
  fetchConstrutoras,
  type Construtora,
} from "@/lib/construtoras-api";
import {
  Building2, ExternalLink, Loader2, RefreshCw, Bath, BedDouble, Ruler, Plus,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/imoveis")({
  head: () => ({ meta: [{ title: "Imóveis — NP Connect" }] }),
  component: ImoveisPage,
});

function ImoveisPage() {
  const user = getSession();
  const isAdmin = user?.role === "admin";
  const canCreate = isAdmin || user?.role === "gerente";

  const [items, setItems] = useState<Empreendimento[]>([]);
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickNome, setQuickNome] = useState("");
  const [quickConstrutoraId, setQuickConstrutoraId] = useState("");
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
    if (!isAdmin) return;
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
    if (!quickConstrutoraId) {
      toast.error("Selecione a construtora.");
      return;
    }

    setQuickSaving(true);
    try {
      await createEmpreendimento({
        nome: quickNome.trim(),
        construtoraId: quickConstrutoraId,
        cidade: quickCidade.trim() || undefined,
      });
      setQuickOpen(false);
      await loadItems();
      toast.success("Empreendimento cadastrado.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível cadastrar o empreendimento.",
      );
    } finally {
      setQuickSaving(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.nome.toLowerCase().includes(q) ||
        (i.cidade ?? "").toLowerCase().includes(q) ||
        (i.endereco ?? "").toLowerCase().includes(q) ||
        (i.construtora?.nome ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  return (
    <div>
      <PageHeader
        title="Imóveis"
        description="Empreendimentos sincronizados do site New Palace."
        actions={
          canCreate ? (
            <div className="flex gap-2">
              <Button onClick={() => void openQuickCreate()}>
                <Plus className="w-4 h-4 mr-1" />
                Novo imóvel
              </Button>
              {isAdmin && (
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

      <div className="mb-4 max-w-md">
        <Input
          placeholder="Buscar por nome, cidade ou endereço…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
                ? isAdmin
                  ? "Nenhum empreendimento ainda. Clique em “Sincronizar do site” para importar a listagem da New Palace."
                  : "Nenhum empreendimento cadastrado ainda. Peça a um administrador para sincronizar do site New Palace."
                : "Nenhum resultado para a busca."}
            </p>
            {items.length === 0 && isAdmin && (
              <Button
                className="mt-2"
                onClick={() => void handleSync()}
                disabled={syncing}
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1" />
                )}
                Sincronizar agora
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">
                    {item.nome}
                  </CardTitle>
                  {item.cidade && (
                    <Badge variant="secondary" className="shrink-0">
                      {item.cidade}
                    </Badge>
                  )}
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
                value={quickConstrutoraId || "__none__"}
                onValueChange={(value) =>
                  setQuickConstrutoraId(value === "__none__" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecione</SelectItem>
                  {construtoras.map((construtora) => (
                    <SelectItem key={construtora.id} value={construtora.id}>
                      {construtora.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
