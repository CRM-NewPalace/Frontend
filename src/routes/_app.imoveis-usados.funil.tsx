import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { OperationFunnelBoard } from "@/components/operation-funnel-board";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { fetchFunilAtivo, type Funil } from "@/lib/funis-api";
import {
  fetchVendasUsado,
  formatBrl,
  updateVendaUsado,
  VENDA_STATUS_LABEL,
  type VendaUsado,
} from "@/lib/imoveis-usados-api";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/imoveis-usados/funil")({
  component: UsadosFunilPage,
});

function UsadosFunilPage() {
  const [funil, setFunil] = useState<Funil | null>(null);
  const [items, setItems] = useState<VendaUsado[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [funilAtivo, vendas] = await Promise.all([
        fetchFunilAtivo("venda_usados"),
        fetchVendasUsado(),
      ]);
      setFunil(funilAtivo);
      setItems(vendas);
    } catch (err) {
      setFunil(null);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o funil de venda de usados.",
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
      const updated = await updateVendaUsado(cardId, { funilEtapaId: etapaId });
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      setItems(previous);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível mover o imóvel.",
      );
    } finally {
      setMovingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Funil de venda de usados"
        description="Arraste os imóveis entre as etapas do funil ativo."
        actions={
          <Button asChild size="sm">
            <Link to="/imoveis">
              <Plus className="mr-1 h-4 w-4" />
              Imóveis
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
          Não há funil de Venda de Usados ativo com etapas. Configure em
          Configurações.
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
            subtitle: `${item.imovel.proprietario?.nome ?? "Proprietário"} · ${VENDA_STATUS_LABEL[item.status]}`,
            meta: formatBrl(item.precoVenda),
            href: `/imoveis-usados/vendas/${item.id}`,
            imageUrl: item.imovel.fotoUrl,
          }))}
        />
      )}
    </>
  );
}
