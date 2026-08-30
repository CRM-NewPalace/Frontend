import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { CaptacaoDetalheDialog } from "@/components/captacao-detalhe-dialog";
import { FormDialogActions } from "@/components/form-dialog";
import {
  FunilScrollControls,
  OperationFunnelBoard,
} from "@/components/operation-funnel-board";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  fetchCaptacoes,
  formatBrl,
  updateCaptacao,
  type Captacao,
} from "@/lib/captacao-api";
import { BRAND_GRADIENT_BTN, BRAND_GRADIENT_STYLE } from "@/lib/brand-gradient";
import { fetchFunilAtivo, type Funil } from "@/lib/funis-api";
import {
  applyOperacaoFunilThreshold,
  matchesMonitoramentoFiltro,
  MONITORAMENTO_FILTRO_OPTIONS,
  type MonitoramentoFiltro,
} from "@/lib/lead-monitoramento";
import { canViewTeamData } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/captacao/funil")({
  component: CaptacaoFunilPage,
});

function formatFunilDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("pt-BR");
}

function CaptacaoFunilPage() {
  const user = getSession();
  const isCorretor = user ? !canViewTeamData(user.role) : true;
  const [funil, setFunil] = useState<Funil | null>(null);
  const [items, setItems] = useState<Captacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });
  const [detail, setDetail] = useState<Captacao | null>(null);
  const [filterMonitoramento, setFilterMonitoramento] =
    useState<MonitoramentoFiltro>("todos");
  const scrollBoard = useRef<((direction: -1 | 1) => void) | null>(null);

  const onScrollChange = useCallback((state: { left: boolean; right: boolean }) => {
    setCanScroll(state);
  }, []);

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

  const decoratedItems = useMemo(() => {
    if (!funil) return items;
    return items.map((item) => applyOperacaoFunilThreshold(item, funil));
  }, [funil, items]);

  const visibleItems = useMemo(
    () =>
      decoratedItems.filter((item) =>
        matchesMonitoramentoFiltro(item.monitoramento, filterMonitoramento),
      ),
    [decoratedItems, filterMonitoramento],
  );

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

  function openDetail(cardId: string) {
    const found = decoratedItems.find((item) => item.id === cardId) ?? null;
    setDetail(found);
  }

  async function moveDetailToStage(etapaId: string) {
    if (!detail || detail.funilEtapaId === etapaId) return;
    const previous = detail;
    const stage = stages.find((item) => item.id === etapaId);
    setDetail({
      ...detail,
      funilEtapaId: etapaId,
      funilEtapa: {
        ...detail.funilEtapa,
        id: etapaId,
        label: stage?.label ?? detail.funilEtapa.label,
        color: stage?.color ?? detail.funilEtapa.color,
      },
    });
    toast.success(
      `${detail.proprietario.nome} movido para ${stage?.label ?? "a nova etapa"}`,
    );
    try {
      const updated = await updateCaptacao(detail.id, { funilEtapaId: etapaId });
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setDetail(updated);
    } catch (err) {
      setDetail(previous);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível mover a captação.",
      );
    }
  }

  return (
    <>
      <PageHeader
        title="Funil de captação"
        description="Arraste as captações entre as etapas do funil ativo."
        actionsClassName="lg:max-w-none"
        actions={
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Select
                value={filterMonitoramento}
                onValueChange={(value) =>
                  setFilterMonitoramento(value as MonitoramentoFiltro)
                }
              >
                <SelectTrigger className="h-8 w-52 rounded-full bg-background py-0">
                  <SelectValue placeholder="Monitoramento" />
                </SelectTrigger>
                <SelectContent>
                  {MONITORAMENTO_FILTRO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isCorretor && (
                <Button
                  size="sm"
                  asChild
                  className={cn("h-8 rounded-full", BRAND_GRADIENT_BTN)}
                  style={BRAND_GRADIENT_STYLE}
                >
                  <Link
                    to="/configuracoes"
                    search={{ secao: "operacao", item: "funil" }}
                  >
                    Configurar funil
                  </Link>
                </Button>
              )}
              <Button
                asChild
                size="sm"
                className={cn("h-8 rounded-full", BRAND_GRADIENT_BTN)}
                style={BRAND_GRADIENT_STYLE}
              >
                <Link to="/captacao/captacoes">
                  <Plus className="mr-1 h-4 w-4" />
                  Nova captação
                </Link>
              </Button>
            </div>
            <FunilScrollControls
              canScrollLeft={canScroll.left}
              canScrollRight={canScroll.right}
              onScroll={(direction) => scrollBoard.current?.(direction)}
            />
          </div>
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
          onCardClick={openDetail}
          onScrollChange={onScrollChange}
          scrollApiRef={scrollBoard}
          cards={visibleItems.map((item) => ({
            id: item.id,
            etapaId: item.funilEtapaId || item.funilEtapa.id,
            title: item.proprietario.nome,
            subtitle: item.imovel.titulo,
            phone: item.proprietario.telefone ?? "",
            meta: formatBrl(item.valorPretendido ?? item.valorAvaliacao),
            value: item.valorPretendido ?? item.valorAvaliacao ?? 0,
            href: `/captacao/captacoes/${item.id}`,
            footer: item.responsavel.name.split(" ")[0],
            updatedAt: formatFunilDate(item.updatedAt),
            actionLabel: "Detalhes",
            priority: item.exclusividade ? "alta" : "baixa",
            monitoramento: item.monitoramento,
            tag: item.sugestaoProprietario
              ? {
                  label: "Sugestão do proprietário",
                  className: "bg-violet-600 text-white",
                }
              : undefined,
          }))}
        />
      )}
      <CaptacaoDetalheDialog
        captacao={detail}
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        footer={
          detail ? (
            <FormDialogActions>
              <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 sm:[&_button]:w-full">
                <Button type="button" variant="outline" asChild>
                  <Link
                    to="/captacao/captacoes/$id"
                    params={{ id: detail.id }}
                  >
                    Abrir ficha
                  </Link>
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link
                    to="/captacao/proprietarios/$id"
                    params={{ id: detail.proprietario.id }}
                  >
                    Ver proprietário
                  </Link>
                </Button>
                <div className="flex min-w-0 items-center gap-2 sm:col-span-2">
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Etapa:
                  </span>
                  <Select
                    value={detail.funilEtapaId}
                    onValueChange={(value) => void moveDetailToStage(value)}
                  >
                    <SelectTrigger className="h-9 min-w-0 flex-1">
                      <SelectValue placeholder="Selecione a etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormDialogActions>
          ) : null
        }
      />
    </>
  );
}
