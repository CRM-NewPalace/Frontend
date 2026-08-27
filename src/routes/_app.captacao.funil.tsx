import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { OperationFunnelBoard } from "@/components/operation-funnel-board";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import {
  fetchCaptacoes,
  formatBrl,
  updateCaptacao,
  type Captacao,
} from "@/lib/captacao-api";
import { fetchFunilAtivo, type Funil } from "@/lib/funis-api";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/captacao/funil")({
  component: CaptacaoFunilPage,
});

function CaptacaoFunilPage() {
  const [funil, setFunil] = useState<Funil | null>(null);
  const [items, setItems] = useState<Captacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [funilAtivo, captacoes] = await Promise.all([
        fetchFunilAtivo("captacao"),
        fetchCaptacoes(),
      ]);
      setFunil(funilAtivo);
      setItems(captacoes);
    } catch (err) {
      setFunil(null);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o funil de captação.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const stages = useMemo(
    () =>
      (funil?.etapas ?? [])
        .filter((etapa) => etapa.active)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((etapa) => ({
          id: etapa.id,
          label: etapa.label,
          color: etapa.color,
        })),
    [funil],
  );

  async function moveCard(cardId: string, etapaId: string) {
    const previous = items;
    setMovingId(cardId);
    setItems((current) =>
      current.map((item) =>
        item.id === cardId ? { ...item, funilEtapaId: etapaId } : item,
      ),
    );
    try {
      const updated = await updateCaptacao(cardId, { funilEtapaId: etapaId });
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      setItems(previous);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível mover a captação.",
      );
    } finally {
      setMovingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Funil de captação"
        description="Arraste as captações entre as etapas do funil ativo."
        actions={
          <Button asChild size="sm">
            <Link to="/captacao/captacoes">
              <Plus className="mr-1 h-4 w-4" />
              Nova captação
            </Link>
          </Button>
        }
      />
      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      ) : stages.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Não há funil de Captação ativo com etapas. Configure em Configurações.
        </p>
      ) : (
        <OperationFunnelBoard
          stages={stages}
          movingId={movingId}
          onMove={(cardId, etapaId) => void moveCard(cardId, etapaId)}
          cards={items.map((item) => ({
            id: item.id,
            etapaId: item.funilEtapaId || item.funilEtapa.id,
            title: item.imovel.titulo,
            subtitle: `${item.proprietario.nome} · ${item.responsavel.name}`,
            meta: formatBrl(item.valorPretendido ?? item.valorAvaliacao),
            href: `/captacao/captacoes/${item.id}`,
            imageUrl: item.imovel.fotoUrl,
          }))}
        />
      )}
    </>
  );
}
