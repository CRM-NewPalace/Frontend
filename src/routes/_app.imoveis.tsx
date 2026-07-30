import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  fetchEmpreendimentos,
  syncEmpreendimentosFromSite,
  type Empreendimento,
} from "@/lib/empreendimentos-api";
import {
  Building2, ExternalLink, Loader2, RefreshCw, Bath, BedDouble, Ruler,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/imoveis")({
  head: () => ({ meta: [{ title: "Imóveis — NP Connect" }] }),
  component: ImoveisPage,
});

function ImoveisPage() {
  const user = getSession();
  const isAdmin = user?.role === "admin";

  const [items, setItems] = useState<Empreendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");

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
          isAdmin ? (
            <Button onClick={() => void handleSync()} disabled={syncing}>
              {syncing ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              Sincronizar do site
            </Button>
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
            <p>
              {items.length === 0
                ? isAdmin
                  ? "Nenhum empreendimento. Use “Sincronizar do site”."
                  : "Nenhum empreendimento disponível."
                : "Nenhum resultado para a busca."}
            </p>
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
    </div>
  );
}
