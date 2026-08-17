import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  brl,
  isLeadCarteiraPropria,
  prioridadeBadgeClass,
  type AnaliseStatus,
  type Lead,
  type StageId,
} from "@/lib/crm-types";
import { getSession } from "@/lib/auth";
import {
  canViewTeamData,
  isCorretorLike,
  isLeadInAtrasoScope,
} from "@/lib/permissions";
import { useLeads } from "@/lib/leads-store";
import { useCatalog } from "@/lib/catalog-store";
import {
  LeadFunilAlerta,
  leadMonitoramentoCardClass,
} from "@/components/lead-funil-alerta";
import {
  MONITORAMENTO_FILTRO_OPTIONS,
  MOTIVO_SEM_MOVIMENTACAO_LABEL,
  applyInatividadeThreshold,
  formatDateTimePt,
  formatPrazoUnidade,
  type MonitoramentoFiltro,
} from "@/lib/lead-monitoramento";
import { MeuLeadBadge } from "@/components/meu-lead-badge";
import { LostMotivoFields } from "@/components/lost-motivo-fields";
import { ApiError } from "@/lib/api";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
  DetailField,
} from "@/components/form-dialog";
import { fetchConstrutoras, type Construtora } from "@/lib/construtoras-api";
import {
  createEmpreendimento,
  fetchEmpreendimentos,
  type Empreendimento,
} from "@/lib/empreendimentos-api";
import { fetchEquipes, type Equipe } from "@/lib/equipes-api";
import { fetchFunilAtivo, type Funil } from "@/lib/funis-api";
import { createTriagemEvent } from "@/lib/triagem-api";
import {
  assumirAnalise,
  fetchAnalises,
  updateAnalise,
  type Analise,
} from "@/lib/analise-api";
import {
  createDocumentacao,
  fetchDocumentacoes,
  DEFAULT_DOCUMENTACAO_FONTES,
  DEFAULT_STATUS1,
  DEFAULT_STATUS2,
} from "@/lib/documentacao-api";
import { funnelColumnBg, nextCatalogColor, catalogColorBadgeClass, STATUS_CHIP_CLASS } from "@/lib/catalog-colors";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseOptionalMoneyInput,
} from "@/lib/money-input";
import {
  Clock,
  User,
  CircleUser,
  Eye,
  Sparkles,
  Wallet,
  Banknote,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Plus,
  Check,
  ChevronsUpDown,
  AlertTriangle,
  Briefcase,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { displayEmail } from "@/lib/email";
import { celebrateAfterDocumentacao } from "@/lib/celebrations";
import { isStatusVendido } from "@/lib/documentacao-status";
import { BRAND_GRADIENT_STYLE } from "@/lib/brand-gradient";

const ANALISE_STATUS_LABEL: Record<AnaliseStatus, string> = {
  pendente: "Pendente",
  em_analise: "Em análise",
  aprovado: "Análise aprovada",
  reprovado: "Análise reprovada",
};

function shouldShowAnaliseStatus(status: AnaliseStatus) {
  return status === "aprovado" || status === "reprovado";
}

function analiseBadgeClass(status: AnaliseStatus) {
  const size = STATUS_CHIP_CLASS;
  if (status === "aprovado")
    return `${size} border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`;
  if (status === "reprovado")
    return `${size} border-destructive/40 bg-destructive/10 text-destructive`;
  if (status === "em_analise")
    return `${size} border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300`;
  return `${size} border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300`;
}

/** Slug legado (fallback se o funil não tiver papel configurado). */
const LOST_STAGE_SLUG_FALLBACK = "perdido";
const MAX_HISTORICO_TEXTO = 400;

/** Largura da coluna (w-72) + gap (gap-3) — um passo de scroll. */
const COLUMN_STEP_PX = 288 + 12;

const FUNIL_GRADIENT_BTN =
  "border-0 bg-transparent text-white shadow-sm hover:bg-transparent hover:brightness-110";
const FUNIL_GRADIENT_STYLE = BRAND_GRADIENT_STYLE;

export const Route = createFileRoute("/_app/funil")({
  validateSearch: (search: Record<string, unknown>) => ({
    lead: typeof search.lead === "string" ? search.lead : undefined,
  }),
  head: () => ({ meta: [{ title: "Funil de Vendas — Zone Connection" }] }),
  component: Funil,
});

function Funil() {
  const { lead } = Route.useSearch();
  return <ComercialFunilBoard tipoFiltro="lead" openLeadId={lead} />;
}

export type ComercialFunilTipoFiltro = "lead" | "cliente";

export function ComercialFunilBoard({
  tipoFiltro = "lead",
  openLeadId,
}: {
  tipoFiltro?: ComercialFunilTipoFiltro;
  openLeadId?: string;
}) {
  const isClientesFunil = tipoFiltro === "cliente";
  const user = getSession();
  const canSeeTeam = user ? canViewTeamData(user.role) : false;
  const isCorretor = !canSeeTeam;
  const canWriteTriagem =
    isCorretor || user?.role === "gerente";
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isGerente = user?.role === "gerente";
  const isManager = canSeeTeam;
  const {
    leads: allLeads,
    assignees,
    updateLeadStage,
    markLeadLost,
    applyLead,
    loading,
  } = useLeads();
  const {
    funnelStages,
    loading: catalogLoading,
    colorByLabel,
    stageByPapel,
  } = useCatalog();
  const lostStageSlug = stageByPapel("perdido") ?? LOST_STAGE_SLUG_FALLBACK;

  function isLostStage(stage: StageId): boolean {
    const found = funnelStages.find((s) => s.id === stage);
    if (found?.papel === "perdido") return true;
    return stage === lostStageSlug || stage === LOST_STAGE_SLUG_FALLBACK;
  }

  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [funilAtivo, setFunilAtivo] = useState<Funil | null>(null);
  const [filterEquipeId, setFilterEquipeId] = useState("__all__");
  const [filterCorretorId, setFilterCorretorId] = useState("__all__");
  const [filterMeusLeads, setFilterMeusLeads] = useState(false);
  const [filterMonitoramento, setFilterMonitoramento] =
    useState<MonitoramentoFiltro>("todos");
  const [corretorFilterOpen, setCorretorFilterOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchFunilAtivo()
      .then((funil) => {
        if (!cancelled) setFunilAtivo(funil);
      })
      .catch(() => {
        if (!cancelled) setFunilAtivo(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAdmin && !isGerente) return;
    let cancelled = false;
    void fetchEquipes()
      .then((list) => {
        if (!cancelled) setEquipes(list);
      })
      .catch(() => {
        if (!cancelled) setEquipes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, isGerente]);

  const corretorOptions = useMemo(() => {
    let list = assignees.filter((a) => !a.role || isCorretorLike(a.role));
    if (
      isAdmin &&
      filterEquipeId !== "__all__" &&
      filterEquipeId !== "__none__"
    ) {
      const eq = equipes.find((e) => e.id === filterEquipeId);
      if (eq) {
        const memberIds = new Set(eq.membros.map((m) => m.id));
        list = list.filter((a) => memberIds.has(a.id));
      }
    }
    return [...list].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    );
  }, [assignees, equipes, filterEquipeId, isAdmin]);

  const selectedCorretorLabel =
    filterCorretorId === "__all__"
      ? "Todos os corretores"
      : filterCorretorId === "__none__"
        ? "Sem corretor"
        : (corretorOptions.find((c) => c.id === filterCorretorId)?.name ??
          "Corretor");

  const teamScope = useMemo(() => {
    const memberIds = new Set<string>();
    const equipeIds = new Set<string>();
    if (user) memberIds.add(user.id);
    if (isGerente && user) {
      for (const eq of equipes) {
        if (eq.gerenteId !== user.id) continue;
        equipeIds.add(eq.id);
        for (const m of eq.membros) memberIds.add(m.id);
      }
      // Enquanto as equipes não carregam, usa o escopo já filtrado dos assignees.
      if (equipeIds.size === 0) {
        for (const a of assignees) memberIds.add(a.id);
      }
    } else {
      for (const a of assignees) memberIds.add(a.id);
    }
    return { memberIds, equipeIds };
  }, [assignees, equipes, isGerente, user]);

  const leads = useMemo(() => {
    let list = allLeads.filter((l) => l.tipo === tipoFiltro);

    // Clientes = carteira pessoal (corretor, admin e gerente só a própria).
    if (isClientesFunil && user) {
      list = list.filter(
        (l) => l.corretorId === user.id || l.corretor === user.name,
      );
    } else if (user) {
      list = list.filter((l) => isLeadInAtrasoScope(user, l, teamScope));
    }

    if (funilAtivo) {
      list = list.map((l) => {
        if (!l.monitoramento) return l;
        return {
          ...l,
          monitoramento: applyInatividadeThreshold(
            l.monitoramento,
            funilAtivo.inatividadeValor,
            funilAtivo.inatividadeUnidade,
          ),
        };
      });
    }

    if (!isClientesFunil && isAdmin && filterEquipeId !== "__all__") {
      if (filterEquipeId === "__none__") {
        list = list.filter((l) => !l.equipeId);
      } else {
        list = list.filter((l) => l.equipeId === filterEquipeId);
      }
    }

    if (!isClientesFunil && isManager && filterCorretorId !== "__all__") {
      if (filterCorretorId === "__none__") {
        list = list.filter((l) => !l.corretorId);
      } else {
        list = list.filter((l) => l.corretorId === filterCorretorId);
      }
    }

    if (!isClientesFunil && isGerente && filterMeusLeads && user) {
      list = list.filter((l) => isLeadCarteiraPropria(l, user.id));
    }

    if (filterMonitoramento !== "todos") {
      list = list.filter((l) => {
        const mon = l.monitoramento;
        if (!mon) return false;
        if (filterMonitoramento === "sem_movimentacao") {
          return mon.problemas.some((p) => p.tipo === "sem_movimentacao");
        }
        if (filterMonitoramento === "em_atraso") {
          return mon.problemas.some((p) => p.tipo === "prazo_ultrapassado");
        }
        if (filterMonitoramento === "proximo_vencimento") {
          return mon.problemas.some((p) => p.tipo === "prazo_proximo");
        }
        return (
          Boolean(mon.prazoDueAt) &&
          mon.visual === "none" &&
          !mon.problemas.some((p) => p.tipo === "prazo_ultrapassado")
        );
      });
    }

    return list;
  }, [
    allLeads,
    filterCorretorId,
    filterEquipeId,
    filterMeusLeads,
    filterMonitoramento,
    funilAtivo,
    isAdmin,
    isClientesFunil,
    isGerente,
    isManager,
    teamScope,
    tipoFiltro,
    user,
  ]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [activeDropStage, setActiveDropStage] = useState<StageId | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const didDrag = useRef(false);

  useEffect(() => {
    if (!openLeadId || loading) return;
    const found = allLeads.find((l) => l.id === openLeadId);
    if (!found) return;
    const scoped =
      !isClientesFunil &&
      user &&
      !isLeadInAtrasoScope(user, found, teamScope)
        ? null
        : found;
    if (!scoped) return;
    const decorated =
      funilAtivo && scoped.monitoramento
        ? {
            ...scoped,
            monitoramento: applyInatividadeThreshold(
              scoped.monitoramento,
              funilAtivo.inatividadeValor,
              funilAtivo.inatividadeUnidade,
            ),
          }
        : scoped;
    setDetailLead(decorated);
  }, [openLeadId, allLeads, funilAtivo, isClientesFunil, loading, teamScope, user]);

  useEffect(() => {
    if (!detailLead?.monitoramento || !funilAtivo) return;
    setDetailLead((cur) => {
      if (!cur?.monitoramento) return cur;
      return {
        ...cur,
        monitoramento: applyInatividadeThreshold(
          cur.monitoramento,
          funilAtivo.inatividadeValor,
          funilAtivo.inatividadeUnidade,
        ),
      };
    });
  }, [funilAtivo]);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragSession = useRef<{
    leadId: string;
    pointerId: number;
    startX: number;
    startY: number;
    activated: boolean;
    longPressTimer: ReturnType<typeof setTimeout> | null;
  } | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Fluxo de perda ao soltar o card na coluna "Perdido".
  const [lostTarget, setLostTarget] = useState<Lead | null>(null);
  const [lostMotivo, setLostMotivo] = useState("");
  const [lostMotivoOutro, setLostMotivoOutro] = useState("");

  /** Após mudar etapa (só corretor): formulário para registrar histórico. */
  const [triagemPrompt, setTriagemPrompt] = useState<{
    leadId: string;
    leadNome: string;
    stage: StageId;
    stageName: string;
    fromStage: StageId;
    fromStageName: string;
  } | null>(null);
  const [triagemTexto, setTriagemTexto] = useState("");
  const [triagemSaving, setTriagemSaving] = useState(false);
  const triagemFinalizedRef = useRef(false);

  /** Relato sem mudar etapa (só corretor), a partir dos detalhes do card. */
  const [manualTriagem, setManualTriagem] = useState<{
    leadId: string;
    leadNome: string;
  } | null>(null);
  const [manualTriagemTexto, setManualTriagemTexto] = useState("");
  const [manualTriagemSaving, setManualTriagemSaving] = useState(false);

  function offerTriagemHistory(lead: Lead, stage: StageId) {
    if (!isCorretor) return;
    const stageName = funnelStages.find((s) => s.id === stage)?.name ?? stage;
    const fromStageName =
      funnelStages.find((s) => s.id === lead.stage)?.name ?? lead.stage;
    triagemFinalizedRef.current = false;
    setTriagemTexto("");
    setTriagemPrompt({
      leadId: lead.id,
      leadNome: lead.nome,
      stage,
      stageName,
      fromStage: lead.stage,
      fromStageName,
    });
  }

  function closeTriagemPrompt() {
    setTriagemPrompt(null);
    setTriagemTexto("");
    setTriagemSaving(false);
  }

  async function registerFunilTriagem(texto: string) {
    if (!triagemPrompt || triagemFinalizedRef.current) return;
    triagemFinalizedRef.current = true;
    setTriagemSaving(true);
    try {
      await createTriagemEvent({
        leadId: triagemPrompt.leadId,
        texto,
        origem: "funil",
        stage: triagemPrompt.stage,
        stageAnterior: triagemPrompt.fromStage,
      });
      toast.success("Histórico registrado na Triagem.");
      closeTriagemPrompt();
    } catch (err) {
      triagemFinalizedRef.current = false;
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o histórico.",
      );
    } finally {
      setTriagemSaving(false);
    }
  }

  async function skipTriagemHistory() {
    if (!triagemPrompt || triagemSaving || triagemFinalizedRef.current) return;
    const texto = `Etapa avançada de "${triagemPrompt.fromStageName}" para "${triagemPrompt.stageName}".`;
    await registerFunilTriagem(texto);
  }

  function openManualTriagem(lead: Lead) {
    if (!canWriteTriagem) return;
    setManualTriagemTexto("");
    setManualTriagem({ leadId: lead.id, leadNome: lead.nome });
  }

  function closeManualTriagem() {
    setManualTriagem(null);
    setManualTriagemTexto("");
    setManualTriagemSaving(false);
  }

  async function saveManualTriagem() {
    if (!manualTriagem) return;
    const texto = manualTriagemTexto.trim();
    if (!texto) {
      toast.error("Escreva o relato do histórico.");
      return;
    }
    if (texto.length > MAX_HISTORICO_TEXTO) {
      toast.error(
        `O relato deve ter no máximo ${MAX_HISTORICO_TEXTO} caracteres.`,
      );
      return;
    }
    setManualTriagemSaving(true);
    try {
      await createTriagemEvent({
        leadId: manualTriagem.leadId,
        texto,
        origem: "manual",
      });
      toast.success("Histórico registrado (etapa mantida).");
      closeManualTriagem();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o histórico.",
      );
    } finally {
      setManualTriagemSaving(false);
    }
  }

  async function saveTriagemHistory() {
    if (!triagemPrompt) return;
    const texto = triagemTexto.trim();
    if (!texto) {
      toast.error("Escreva o relato do histórico ou pule esta etapa.");
      return;
    }
    if (texto.length > MAX_HISTORICO_TEXTO) {
      toast.error(
        `O relato deve ter no máximo ${MAX_HISTORICO_TEXTO} caracteres.`,
      );
      return;
    }
    await registerFunilTriagem(texto);
  }

  const updateScrollButtons = useCallback(() => {
    const el = boardRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    const ro = new ResizeObserver(updateScrollButtons);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      ro.disconnect();
    };
  }, [updateScrollButtons, funnelStages.length, loading, catalogLoading]);

  function scrollBoard(direction: -1 | 1) {
    const el = boardRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * COLUMN_STEP_PX, behavior: "smooth" });
  }

  useEffect(() => {
    return () => {
      const s = dragSession.current;
      if (s?.longPressTimer != null) clearTimeout(s.longPressTimer);
      dragSession.current = null;
    };
  }, []);

  const DRAG_THRESHOLD_PX = 8;
  const TOUCH_DRAG_DELAY_MS = 200;

  function stageFromPoint(x: number, y: number): StageId | null {
    const stack = document.elementsFromPoint(x, y);
    for (const el of stack) {
      if (!(el instanceof Element)) continue;
      if (el.closest("[data-dragging-card]")) continue;
      const col = el.closest("[data-funnel-stage]");
      const id = col?.getAttribute("data-funnel-stage");
      if (id) return id as StageId;
    }
    return null;
  }

  function clearDragTimers() {
    const s = dragSession.current;
    if (s?.longPressTimer != null) {
      clearTimeout(s.longPressTimer);
      s.longPressTimer = null;
    }
  }

  function activateCardDrag(leadId: string, target: HTMLElement, pointerId: number) {
    const s = dragSession.current;
    if (!s || s.leadId !== leadId || s.activated) return;
    s.activated = true;
    didDrag.current = true;
    try {
      target.setPointerCapture(pointerId);
    } catch {
      /* pointer already released */
    }
    setDragging(leadId);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate?.(12);
      } catch {
        /* ignore */
      }
    }
  }

  function autoScrollBoard(clientX: number) {
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const edge = 56;
    const step = 18;
    if (clientX < rect.left + edge) board.scrollLeft -= step;
    else if (clientX > rect.right - edge) board.scrollLeft += step;
  }

  function onCardPointerDown(e: React.PointerEvent<HTMLDivElement>, leadId: string) {
    if (e.button !== 0) return;
    didDrag.current = false;
    clearDragTimers();
    const target = e.currentTarget;
    dragSession.current = {
      leadId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      activated: false,
      longPressTimer: null,
    };

    // Touch/pen: long-press to drag (preserves horizontal board scroll).
    if (e.pointerType === "touch" || e.pointerType === "pen") {
      dragSession.current.longPressTimer = setTimeout(() => {
        activateCardDrag(leadId, target, e.pointerId);
      }, TOUCH_DRAG_DELAY_MS);
    }
  }

  function onCardPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const s = dragSession.current;
    if (!s || s.pointerId !== e.pointerId) return;

    const dist = Math.hypot(e.clientX - s.startX, e.clientY - s.startY);

    if (!s.activated) {
      if (e.pointerType === "touch" || e.pointerType === "pen") {
        // Finger moved before long-press → treat as scroll, cancel drag.
        if (dist > DRAG_THRESHOLD_PX) {
          clearDragTimers();
          dragSession.current = null;
        }
        return;
      }
      // Mouse: start drag after a small movement.
      if (dist < DRAG_THRESHOLD_PX) return;
      activateCardDrag(s.leadId, e.currentTarget, e.pointerId);
    }

    if (!dragSession.current?.activated) return;
    e.preventDefault();
    setActiveDropStage(stageFromPoint(e.clientX, e.clientY));
    autoScrollBoard(e.clientX);
  }

  function endCardPointer(
    e: React.PointerEvent<HTMLDivElement>,
    drop: boolean,
  ) {
    const s = dragSession.current;
    if (!s || s.pointerId !== e.pointerId) return;

    const { leadId, activated } = s;
    clearDragTimers();
    dragSession.current = null;
    setActiveDropStage(null);
    setDragging(null);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* not capturing */
    }

    if (drop && activated) {
      const stage = stageFromPoint(e.clientX, e.clientY);
      if (stage) void dropLeadOnStage(leadId, stage);
      // Keep didDrag true through the synthetic click, then reset.
      window.setTimeout(() => {
        didDrag.current = false;
      }, 0);
    }
  }

  async function dropLeadOnStage(leadId: string, stage: StageId) {
    const lead = allLeads.find((l) => l.id === leadId);
    setDragging(null);
    if (!lead || lead.stage === stage) return;

    // Perdido não é uma etapa comum: pede o motivo e faz soft-delete.
    if (isLostStage(stage)) {
      setLostMotivo("");
      setLostMotivoOutro("");
      setLostTarget(lead);
      return;
    }

    const stageName = funnelStages.find((s) => s.id === stage)?.name ?? stage;
    // Feedback imediato (a API já atualiza o board de forma otimista no store).
    toast.success(`${lead.nome} movido para ${stageName}`);
    offerTriagemHistory(lead, stage);
    try {
      await updateLeadStage(
        leadId,
        stage,
        isCorretor ? { omitTriagem: true } : undefined,
      );
    } catch (err) {
      closeTriagemPrompt();
      toast.error(
        err instanceof Error ? err.message : "Não foi possível mover o lead.",
      );
    }
  }

  async function confirmLost() {
    if (!lostTarget) return;
    const motivo =
      lostMotivo === "__outro__" ? lostMotivoOutro.trim() : lostMotivo.trim();
    if (!motivo) {
      toast.error("Selecione ou informe o motivo da perda.");
      return;
    }

    const { id, nome, tipo } = lostTarget;
    setLostTarget(null);
    setLostMotivo("");
    setLostMotivoOutro("");
    toast.success(
      tipo === "cliente"
        ? `${nome} movido para Perda de cliente.`
        : `${nome} movido para Leads Perdidos.`,
    );
    try {
      await markLeadLost(id, motivo);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível marcar como perdido.",
      );
    }
  }

  function openDetail(lead: Lead) {
    if (didDrag.current) return;
    setDetailLead(lead);
  }

  async function moveDetailToStage(stage: StageId) {
    if (!detailLead || stage === detailLead.stage) return;

    // Perdido: fecha o detalhe e abre o modal de motivo (soft-delete).
    if (isLostStage(stage)) {
      const target = detailLead;
      setDetailLead(null);
      setLostMotivo("");
      setLostMotivoOutro("");
      setLostTarget(target);
      return;
    }

    const stageName = funnelStages.find((s) => s.id === stage)?.name ?? stage;
    const previousStage = detailLead.stage;
    // Atualização otimista no próprio modal + feedback imediato.
    setDetailLead({ ...detailLead, stage });
    toast.success(`${detailLead.nome} movido para ${stageName}`);
    offerTriagemHistory(detailLead, stage);
    try {
      await updateLeadStage(
        detailLead.id,
        stage,
        isCorretor ? { omitTriagem: true } : undefined,
      );
    } catch (err) {
      closeTriagemPrompt();
      setDetailLead((cur) =>
        cur && cur.id === detailLead.id
          ? { ...cur, stage: previousStage }
          : cur,
      );
      toast.error(
        err instanceof Error ? err.message : "Não foi possível mover o lead.",
      );
    }
  }

  function openLostFromDetail() {
    if (!detailLead) return;
    const target = detailLead;
    setDetailLead(null);
    setLostMotivo("");
    setLostMotivoOutro("");
    setLostTarget(target);
  }

  return (
    <div>
      <PageHeader
        title={isClientesFunil ? "Funil de Clientes" : "Funil de Vendas"}
        description={
          loading || catalogLoading
            ? "Carregando funil..."
            : isClientesFunil
              ? "Sua carteira de clientes no funil — arraste os cards para mover entre etapas."
              : isCorretor
                ? "Seus leads no funil — inclusive os em atraso. Arraste os cards para mover entre etapas."
                : isGerente
                  ? "Funil da sua equipe — seus leads e os da equipe, inclusive os em atraso."
                  : "Funil da imobiliária — todos os leads de captação, inclusive os em atraso."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!isClientesFunil && isAdmin && (
              <Select
                value={filterEquipeId}
                onValueChange={(v) => {
                  setFilterEquipeId(v);
                  setFilterCorretorId("__all__");
                }}
              >
                <SelectTrigger className="h-8 w-46 bg-background">
                  <SelectValue placeholder="Equipe" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="__all__">Todas as equipes</SelectItem>
                  <SelectItem value="__none__">Sem equipe</SelectItem>
                  {equipes.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!isClientesFunil && isManager && (
              <Popover
                open={corretorFilterOpen}
                onOpenChange={setCorretorFilterOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={corretorFilterOpen}
                    className="h-8 w-46 justify-between bg-background font-normal"
                  >
                    <span className="truncate">{selectedCorretorLabel}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                  onWheel={(event) => event.stopPropagation()}
                >
                  <Command>
                    <CommandInput placeholder="Pesquisar corretor…" />
                    <CommandList className="max-h-72">
                      <CommandEmpty>Nenhum corretor encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="todos os corretores"
                          onSelect={() => {
                            setFilterCorretorId("__all__");
                            setFilterMeusLeads(false);
                            setCorretorFilterOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filterCorretorId === "__all__"
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          Todos os corretores
                        </CommandItem>
                        <CommandItem
                          value="sem corretor"
                          onSelect={() => {
                            setFilterCorretorId("__none__");
                            setFilterMeusLeads(false);
                            setCorretorFilterOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filterCorretorId === "__none__"
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          Sem corretor
                        </CommandItem>
                        {corretorOptions.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={`${c.name} ${c.id}`}
                            onSelect={() => {
                              setFilterCorretorId(c.id);
                              setFilterMeusLeads(false);
                              setCorretorFilterOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                filterCorretorId === c.id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <span className="truncate">{c.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            {!isClientesFunil && isGerente && (
              <Button
                type="button"
                variant={filterMeusLeads ? "default" : "outline"}
                className={cn(
                  "h-8 font-normal",
                  !filterMeusLeads && "bg-background",
                )}
                onClick={() => {
                  setFilterMeusLeads((v) => !v);
                  setFilterCorretorId("__all__");
                }}
              >
                <Briefcase className="mr-1.5 h-3.5 w-3.5" />
                Meus leads
              </Button>
            )}
            <Select
              value={filterMonitoramento}
              onValueChange={(v) =>
                setFilterMonitoramento(v as MonitoramentoFiltro)
              }
            >
              <SelectTrigger className="h-8 w-52 bg-background">
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
            <div className="flex items-center rounded-md border bg-background">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-r-none"
                disabled={!canScrollLeft}
                aria-label="Coluna anterior"
                title="Coluna anterior"
                onClick={() => scrollBoard(-1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="w-px h-4 bg-border" />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-l-none"
                disabled={!canScrollRight}
                aria-label="Próxima coluna"
                title="Próxima coluna"
                onClick={() => scrollBoard(1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {!isCorretor && (
              <Button
                size="sm"
                asChild
                className={FUNIL_GRADIENT_BTN}
                style={FUNIL_GRADIENT_STYLE}
              >
                <Link to="/configuracoes">Configurar funil</Link>
              </Button>
            )}
          </div>
        }
      />

      <div
        ref={boardRef}
        data-guia="funil-board"
        className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 scroll-smooth"
      >
        {funnelStages.map((stage, stageIndex) => {
          const stageLeads = leads.filter((l) => l.stage === stage.id);
          const total = stageLeads.reduce((s, l) => s + (l.renda ?? 0), 0);
          return (
            <div
              key={stage.id}
              data-funnel-stage={stage.id}
              className={cn(
                "w-72 shrink-0 flex flex-col rounded-xl p-3 transition-colors",
                funnelColumnBg(stageIndex, funnelStages.length),
                activeDropStage === stage.id &&
                  "ring-2 ring-[#079ED4]/40 brightness-[0.98]",
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      STATUS_CHIP_CLASS,
                      "border-black/10 shadow-none",
                      stage.color,
                    )}
                    title={stage.name}
                  >
                    {stage.name}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {stageLeads.length}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-foreground">
                  {brl(total)}
                </span>
              </div>
              <div className="space-y-2 min-h-16 flex-1">
                {stageLeads.map((l) => (
                  <Card
                    key={l.id}
                    data-dragging-card={dragging === l.id ? "" : undefined}
                    onPointerDown={(e) => onCardPointerDown(e, l.id)}
                    onPointerMove={onCardPointerMove}
                    onPointerUp={(e) => endCardPointer(e, true)}
                    onPointerCancel={(e) => endCardPointer(e, false)}
                    onClick={() => openDetail(l)}
                    className={cn(
                      "p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow touch-manipulation select-none",
                      dragging === l.id && "opacity-40 touch-none shadow-md",
                      leadMonitoramentoCardClass(l),
                    )}
                  >
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <div className="table-person-name flex min-w-0 items-center gap-1.5 text-sm">
                        <CircleUser
                          className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <span className="truncate">{l.nome}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isGerente &&
                          !isClientesFunil &&
                          isLeadCarteiraPropria(l, user?.id) && (
                            <MeuLeadBadge />
                          )}
                        {l.tipo === "cliente" && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 h-5 border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                            title={`Cliente da carteira de ${l.corretor}`}
                          >
                            Cliente
                          </Badge>
                        )}
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            l.prioridade === "Alta"
                              ? "bg-destructive"
                              : l.prioridade === "Média"
                                ? "bg-warning"
                                : "bg-muted-foreground"
                          }`}
                        />
                      </div>
                    </div>
                    {l.analise && shouldShowAnaliseStatus(l.analise.status) && (
                      <Badge
                        variant="outline"
                        className={cn("mb-1", analiseBadgeClass(l.analise.status))}
                        title={ANALISE_STATUS_LABEL[l.analise.status]}
                      >
                        {ANALISE_STATUS_LABEL[l.analise.status]}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden
                      />
                      <span className="truncate">{l.telefone}</span>
                    </div>
                    {l.tipo === "cliente" && !isCorretor && !isClientesFunil && (
                      <div className="text-[10px] text-violet-600 dark:text-violet-300 mt-1">
                        Carteira de {l.corretor.split(" ")[0]}
                      </div>
                    )}
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Banknote
                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="text-sm font-semibold text-primary">
                        {l.renda != null ? brl(l.renda) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {l.corretor.split(" ")[0]}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {l.updatedAt}
                      </div>
                    </div>
                    <LeadFunilAlerta
                      lead={l}
                      onUpdated={(next) => {
                        applyLead(next);
                        setDetailLead((cur) =>
                          cur && cur.id === next.id ? next : cur,
                        );
                      }}
                    />
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <FormDialogShell
        open={!!detailLead}
        onOpenChange={(o) => !o && setDetailLead(null)}
        icon={<Eye className="w-5 h-5" />}
        title={detailLead?.nome ?? "Detalhes"}
        description={
          detailLead
            ? `${detailLead.tipo === "cliente" ? "Cliente" : "Lead"} · ${funnelStages.find((s) => s.id === detailLead.stage)?.name ?? detailLead.stage} · Prioridade ${detailLead.prioridade}`
            : undefined
        }
      >
        {detailLead && (
          <>
            <FormDialogBody>
              {detailLead.monitoramento &&
                detailLead.monitoramento.problemas.length > 0 && (
                  <FormSection
                    icon={
                      <AlertTriangle
                        className={
                          detailLead.monitoramento.visual === "vermelho"
                            ? "w-3.5 h-3.5 text-red-600"
                            : "w-3.5 h-3.5 text-orange-500"
                        }
                      />
                    }
                    title="Alertas de monitoramento"
                  >
                    <div className="space-y-2">
                      {detailLead.monitoramento.problemas.map((problema) => (
                        <div
                          key={problema.tipo}
                          className="rounded-md border border-border/70 p-2 text-sm"
                        >
                          <p className="font-medium">{problema.titulo}</p>
                          <p className="text-xs text-muted-foreground">
                            {problema.detalhe}
                          </p>
                          {problema.motivos && problema.motivos.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {problema.motivos.map((motivo) => (
                                <Badge
                                  key={motivo}
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {MOTIVO_SEM_MOVIMENTACAO_LABEL[motivo]}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <DetailField
                          label="Entrada na etapa"
                          value={formatDateTimePt(
                            detailLead.monitoramento.stageEnteredAt,
                          )}
                        />
                        <DetailField
                          label="Última movimentação"
                          value={formatDateTimePt(
                            detailLead.monitoramento.lastMovementAt,
                          )}
                        />
                        <DetailField
                          label="Prazo da etapa"
                          value={
                            detailLead.monitoramento.prazoConfigurado
                              ? formatPrazoUnidade(
                                  detailLead.monitoramento.prazoConfigurado
                                    .valor,
                                  detailLead.monitoramento.prazoConfigurado
                                    .unidade,
                                )
                              : "Sem prazo"
                          }
                        />
                        <DetailField
                          label="Alerta de inatividade"
                          value={
                            detailLead.monitoramento.inatividadeConfig
                              ? formatPrazoUnidade(
                                  detailLead.monitoramento.inatividadeConfig
                                    .valor,
                                  detailLead.monitoramento.inatividadeConfig
                                    .unidade,
                                )
                              : funilAtivo
                                ? formatPrazoUnidade(
                                    funilAtivo.inatividadeValor,
                                    funilAtivo.inatividadeUnidade,
                                  )
                                : "—"
                          }
                        />
                        <DetailField
                          label="Responsável"
                          value={detailLead.corretor}
                        />
                      </div>
                      <LeadFunilAlerta
                        lead={detailLead}
                        onUpdated={(next) => {
                          applyLead(next);
                          setDetailLead(next);
                        }}
                      />
                    </div>
                  </FormSection>
                )}
              <FormSection
                icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
                title="Contato"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField
                    label="Tipo"
                    value={
                      <div className="flex flex-wrap items-center gap-1.5">
                        {detailLead.tipo === "cliente" ? (
                          <Badge
                            variant="outline"
                            className="border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                          >
                            Cliente da carteira
                          </Badge>
                        ) : (
                          <Badge variant="outline">Lead de captação</Badge>
                        )}
                        {isGerente &&
                          !isClientesFunil &&
                          isLeadCarteiraPropria(detailLead, user?.id) && (
                            <MeuLeadBadge />
                          )}
                      </div>
                    }
                  />
                  <DetailField label="Telefone" value={detailLead.telefone} />
                  <DetailField
                    label="E-mail"
                    value={displayEmail(detailLead.email) || "—"}
                  />
                  <DetailField
                    label="Origem"
                    value={
                      detailLead.origem ? (
                        <Badge
                          className={catalogColorBadgeClass(
                            colorByLabel("origem", detailLead.origem),
                          )}
                          title={detailLead.origem}
                        >
                          {detailLead.origem}
                        </Badge>
                      ) : (
                        "—"
                      )
                    }
                  />
                  {!isCorretor && (
                    <DetailField label="Corretor" value={detailLead.corretor} />
                  )}
                  {detailLead.analise &&
                    shouldShowAnaliseStatus(detailLead.analise.status) && (
                    <DetailField
                      label="Análise"
                      value={
                        <div className="space-y-1">
                          <Badge
                            variant="outline"
                            className={analiseBadgeClass(detailLead.analise.status)}
                            title={ANALISE_STATUS_LABEL[detailLead.analise.status]}
                          >
                            {ANALISE_STATUS_LABEL[detailLead.analise.status]}
                          </Badge>
                          {detailLead.analise.parecer ? (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {detailLead.analise.parecer}
                            </p>
                          ) : null}
                        </div>
                      }
                    />
                  )}
                </div>
              </FormSection>
              <FormSection
                icon={<Wallet className="w-3.5 h-3.5 text-primary" />}
                title="Interesse e renda"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Interesse" value={detailLead.interesse} />
                  <DetailField
                    label="Renda mensal"
                    value={
                      detailLead.renda != null ? brl(detailLead.renda) : "—"
                    }
                  />
                  <DetailField
                    label="Prioridade"
                    value={
                      <Badge
                        className={prioridadeBadgeClass(detailLead.prioridade)}
                      >
                        {detailLead.prioridade}
                      </Badge>
                    }
                  />
                  {detailLead.tags.length > 0 && (
                    <div className="sm:col-span-2 space-y-1.5">
                      <div className="text-xs text-muted-foreground">Tags</div>
                      <div className="flex flex-wrap gap-1.5">
                        {detailLead.tags.map((t) => (
                          <Badge
                            key={t}
                            className={cn(STATUS_CHIP_CLASS, colorByLabel("tag", t))}
                            title={t}
                          >
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </FormSection>
              <FormSection
                icon={<MapPin className="w-3.5 h-3.5 text-primary" />}
                title="Localização"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Cidade" value={detailLead.cidade} />
                  <DetailField label="Bairro" value={detailLead.bairro} />
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions hint={`Atualizado em ${detailLead.updatedAt}`}>
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                {canWriteTriagem && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openManualTriagem(detailLead)}
                  >
                    <ClipboardList className="w-4 h-4 mr-1" />
                    Registrar histórico
                  </Button>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    Etapa:
                  </span>
                  <Select
                    value={detailLead.stage}
                    onValueChange={(v) => void moveDetailToStage(v)}
                  >
                    <SelectTrigger className="h-9 min-w-45">
                      <SelectValue placeholder="Selecione a etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {funnelStages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={openLostFromDetail}
                >
                  Dar perda
                </Button>
              </div>
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>

      <AlertDialog
        open={!!lostTarget}
        onOpenChange={(o) => {
          if (!o) {
            setLostTarget(null);
            setLostMotivo("");
            setLostMotivoOutro("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Por que este lead foi perdido?</AlertDialogTitle>
            <AlertDialogDescription>
              {lostTarget
                ? lostTarget.tipo === "cliente"
                  ? `${lostTarget.nome} sairá do funil e da carteira, e irá para Perda de cliente (visível só para o corretor).`
                  : `${lostTarget.nome} sairá do funil e das listas operacionais, e irá para Leads Perdidos (visível só para o administrador).`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-1">
            <LostMotivoFields
              value={lostMotivo}
              outroValue={lostMotivoOutro}
              onChange={setLostMotivo}
              onOutroChange={setLostMotivoOutro}
              selectId="funil-lost-motivo"
              outroId="funil-motivo-outro"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmLost();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar perda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(triagemPrompt)}
        onOpenChange={(open) => {
          if (!open && triagemPrompt && !triagemSaving) {
            void skipTriagemHistory();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <DialogTitle>Registrar histórico?</DialogTitle>
                <DialogDescription>
                  {triagemPrompt
                    ? `${triagemPrompt.leadNome} foi movido para ${triagemPrompt.stageName}. Deseja registrar um relato nesta mudança de etapa?`
                    : null}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="funil-historico-texto">Relato</Label>
              <span className="text-xs text-muted-foreground">
                {triagemTexto.length}/{MAX_HISTORICO_TEXTO}
              </span>
            </div>
            <Textarea
              id="funil-historico-texto"
              value={triagemTexto}
              onChange={(e) => setTriagemTexto(e.target.value)}
              placeholder="Ex.: Cliente pediu simulação do empreendimento X…"
              maxLength={MAX_HISTORICO_TEXTO}
              rows={4}
              disabled={triagemSaving}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={triagemSaving}
              onClick={() => void skipTriagemHistory()}
            >
              Não, obrigado
            </Button>
            <Button
              type="button"
              disabled={triagemSaving}
              onClick={() => void saveTriagemHistory()}
            >
              {triagemSaving && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              Salvar histórico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(manualTriagem)}
        onOpenChange={(open) => {
          if (!open && !manualTriagemSaving) closeManualTriagem();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <DialogTitle>Registrar histórico</DialogTitle>
                <DialogDescription>
                  {manualTriagem
                    ? `Relato sobre ${manualTriagem.leadNome}. A etapa do funil não será alterada.`
                    : null}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="funil-manual-historico-texto">Relato</Label>
              <span className="text-xs text-muted-foreground">
                {manualTriagemTexto.length}/{MAX_HISTORICO_TEXTO}
              </span>
            </div>
            <Textarea
              id="funil-manual-historico-texto"
              value={manualTriagemTexto}
              onChange={(e) => setManualTriagemTexto(e.target.value)}
              placeholder="Ex.: Cliente pediu simulação do empreendimento X…"
              maxLength={MAX_HISTORICO_TEXTO}
              rows={4}
              disabled={manualTriagemSaving}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={manualTriagemSaving}
              onClick={closeManualTriagem}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={manualTriagemSaving}
              onClick={() => void saveManualTriagem()}
            >
              {manualTriagemSaving && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const ANALISTA_COLUMNS: {
  id: AnaliseStatus;
  label: string;
}[] = [
  { id: "pendente", label: "Pendente" },
  { id: "em_analise", label: "Em análise" },
  { id: "aprovado", label: "Aprovado" },
  { id: "reprovado", label: "Reprovado" },
];

function AnalistaFunilBoard() {
  const navigate = useNavigate();
  const {
    documentacaoFontes,
    documentacaoStatus1,
    documentacaoStatus2,
    addItem,
  } = useCatalog();
  const fonteOptions =
    documentacaoFontes.length > 0
      ? documentacaoFontes
      : [...DEFAULT_DOCUMENTACAO_FONTES];
  const status1Options = (() => {
    const base =
      documentacaoStatus1.length > 0
        ? documentacaoStatus1
        : [...DEFAULT_STATUS1];
    return base.includes("Em análise")
      ? base
      : ["Em análise", ...base];
  })();
  const status2Options =
    documentacaoStatus2.length > 0
      ? documentacaoStatus2
      : [...DEFAULT_STATUS2];

  const [items, setItems] = useState<Analise[]>([]);
  const [loading, setLoading] = useState(true);
  const [docPrompt, setDocPrompt] = useState<Analise | null>(null);
  const [docOpen, setDocOpen] = useState(false);
  const [docTarget, setDocTarget] = useState<Analise | null>(null);
  const [docSaving, setDocSaving] = useState(false);
  const [docFonte, setDocFonte] = useState("Outro");
  const [docStatus1, setDocStatus1] = useState("Em análise");
  const [docStatus2, setDocStatus2] = useState("Andamento");
  const [docObs, setDocObs] = useState("");
  const [docTemEntrada, setDocTemEntrada] = useState(false);
  const [docValorEntrada, setDocValorEntrada] = useState("");
  const [docTemFgts, setDocTemFgts] = useState(false);
  const [docValorFgts, setDocValorFgts] = useState("");
  const [docTemDependente, setDocTemDependente] = useState(false);
  const [quickCatalogOpen, setQuickCatalogOpen] = useState<
    null | "documentacao_fonte" | "documentacao_status1" | "documentacao_status2"
  >(null);
  const [quickCatalogLabel, setQuickCatalogLabel] = useState("");
  const [quickCatalogSaving, setQuickCatalogSaving] = useState(false);
  const [parecerTarget, setParecerTarget] = useState<Analise | null>(null);
  const [parecerStatus, setParecerStatus] = useState<AnaliseStatus>("aprovado");
  const [parecerTexto, setParecerTexto] = useState("");
  const [parecerSaving, setParecerSaving] = useState(false);
  const [vgvModalOpen, setVgvModalOpen] = useState(false);
  const [vgvValor, setVgvValor] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchAnalises());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar a fila de análise.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAssumir(item: Analise) {
    try {
      const updated = await assumirAnalise(item.id);
      setItems((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      toast.success("Processo assumido (Em análise).");
      setDocPrompt(updated);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível assumir.",
      );
    }
  }

  /** Evita auto-registro quando o usuário escolhe preencher o formulário. */
  const skipAutoDocRef = useRef(false);

  function defaultDocFonte() {
    return fonteOptions.includes("Outro")
      ? "Outro"
      : (fonteOptions[0] ?? "Outro");
  }

  function defaultDocStatus1() {
    if (status1Options.includes("Em análise")) return "Em análise";
    return status1Options[0] ?? "Em análise";
  }

  function defaultDocStatus2() {
    return status2Options.includes("Andamento")
      ? "Andamento"
      : (status2Options[0] ?? "Andamento");
  }

  async function autoRegisterDoc(item: Analise) {
    try {
      const existing = await fetchDocumentacoes();
      // Uma ficha por lead: se corretor/gerente já registrou, não cria outra.
      if (existing.some((d) => d.leadId === item.leadId)) {
        toast.success("Documentação já existente para este cliente.");
        return;
      }
      const created = await createDocumentacao({
        leadId: item.leadId,
        nome: item.nome,
        construtoraId: item.lead.construtoraId,
        empreendimentoId: item.lead.empreendimentoId,
        fonte: defaultDocFonte(),
        status1: defaultDocStatus1(),
        status2: defaultDocStatus2(),
        corretorId: item.lead.corretorId,
        vgv: null,
        obs: null,
        dataAnalise: new Date().toISOString().slice(0, 10),
        temEntrada: item.temEntrada,
        valorEntrada: item.temEntrada ? item.valorEntrada : null,
        temFgts: item.temFgts,
        valorFgts: item.temFgts ? item.valorFgts : null,
        temDependente: item.temDependente,
      });
      toast.success("Documentação registrada automaticamente.");
      void celebrateAfterDocumentacao({
        corretorId: created.corretorId ?? item.lead.corretorId,
        docCreated: true,
        becameVendido: isStatusVendido(created.status2),
      });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível registrar a documentação automaticamente.",
      );
    }
  }

  function openDocForm(item: Analise) {
    setDocTarget(item);
    setDocFonte(defaultDocFonte());
    setDocStatus1(defaultDocStatus1());
    setDocStatus2(defaultDocStatus2());
    setDocObs("");
    setDocTemEntrada(item.temEntrada);
    setDocValorEntrada(
      item.valorEntrada != null ? formatMoneyInput(item.valorEntrada) : "",
    );
    setDocTemFgts(item.temFgts);
    setDocValorFgts(
      item.valorFgts != null ? formatMoneyInput(item.valorFgts) : "",
    );
    setDocTemDependente(item.temDependente);
    setDocOpen(true);
  }

  async function saveQuickCatalog() {
    if (!quickCatalogOpen) return;
    const label = quickCatalogLabel.trim();
    if (!label) {
      toast.error("Informe um nome.");
      return;
    }
    setQuickCatalogSaving(true);
    try {
      const count =
        quickCatalogOpen === "documentacao_fonte"
          ? fonteOptions.length
          : quickCatalogOpen === "documentacao_status1"
            ? status1Options.length
            : status2Options.length;
      await addItem({
        type: quickCatalogOpen,
        label,
        color: nextCatalogColor(count),
      });
      if (quickCatalogOpen === "documentacao_fonte") setDocFonte(label);
      if (quickCatalogOpen === "documentacao_status1") setDocStatus1(label);
      if (quickCatalogOpen === "documentacao_status2") setDocStatus2(label);
      setQuickCatalogOpen(null);
      setQuickCatalogLabel("");
      toast.success(`"${label}" adicionado.`);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível adicionar.",
      );
    } finally {
      setQuickCatalogSaving(false);
    }
  }

  async function saveDoc() {
    if (!docTarget) return;
    setDocSaving(true);
    try {
      const created = await createDocumentacao({
        leadId: docTarget.leadId,
        nome: docTarget.nome,
        construtoraId: docTarget.lead.construtoraId,
        empreendimentoId: docTarget.lead.empreendimentoId,
        fonte: docFonte,
        status1: docStatus1,
        status2: docStatus2,
        corretorId: docTarget.lead.corretorId,
        vgv: null,
        obs: docObs.trim() || null,
        dataAnalise: new Date().toISOString().slice(0, 10),
        temEntrada: docTemEntrada,
        valorEntrada: docTemEntrada
          ? parseOptionalMoneyInput(docValorEntrada)
          : null,
        temFgts: docTemFgts,
        valorFgts: docTemFgts
          ? parseOptionalMoneyInput(docValorFgts)
          : null,
        temDependente: docTemDependente,
      });
      toast.success("Documentação registrada.");
      void celebrateAfterDocumentacao({
        corretorId: created.corretorId ?? docTarget.lead.corretorId,
        docCreated: true,
        becameVendido: isStatusVendido(created.status2 ?? docStatus2),
      });
      setDocOpen(false);
      setDocTarget(null);
      void navigate({ to: "/documentacao" });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível registrar a documentação.",
      );
    } finally {
      setDocSaving(false);
    }
  }

  async function saveParecer() {
    if (!parecerTarget) return;
    if (parecerStatus === "aprovado") {
      setVgvValor("");
      setVgvModalOpen(true);
      return;
    }
    await commitParecer(null);
  }

  async function confirmParecerComVgv() {
    const vgv = parseOptionalMoneyInput(vgvValor);
    if (vgv == null) {
      toast.error("Informe o VGV do processo.");
      return;
    }
    if (vgv < 0) {
      toast.error("VGV inválido.");
      return;
    }
    setVgvModalOpen(false);
    await commitParecer(vgv);
  }

  async function commitParecer(vgv: number | null) {
    if (!parecerTarget) return;
    setParecerSaving(true);
    try {
      const updated = await updateAnalise(parecerTarget.id, {
        status: parecerStatus,
        parecer: parecerTexto.trim() || null,
        ...(vgv != null ? { vgv } : {}),
      });
      setItems((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      toast.success(
        parecerStatus === "aprovado"
          ? "Processo aprovado — documentação e VGV atualizados."
          : "Processo reprovado — documentação atualizada.",
      );
      setParecerTarget(null);
      setVgvModalOpen(false);
      setVgvValor("");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setParecerSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Fila de Análise"
        description="Processos de toda a imobiliária: em análise e com resultado."
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link to="/resultado">Abrir Análise</Link>
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Carregando…
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6">
          {ANALISTA_COLUMNS.map((col, index) => {
            const colItems = items.filter((i) => i.status === col.id);
            return (
              <div
                key={col.id}
                className={cn(
                  "w-72 shrink-0 flex flex-col rounded-xl p-3",
                  funnelColumnBg(index, ANALISTA_COLUMNS.length),
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary">{col.label}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {colItems.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-16 flex-1">
                  {colItems.map((item) => (
                    <Card key={item.id} className="p-3 space-y-2 shadow-sm">
                      <div className="text-sm font-semibold text-foreground/80 truncate">
                        {item.nome}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {item.lead.tipo === "cliente" ? "Cliente · " : ""}
                        {item.lead.corretor?.name ?? "Sem responsável"}
                        {item.lead.corretor?.role === "gerente"
                          ? " (Gerente)"
                          : item.lead.corretor?.role === "admin"
                            ? " (Admin)"
                            : ""}
                        {item.lead.empreendimento
                          ? ` · ${item.lead.empreendimento.nome}`
                          : ""}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {col.id === "pendente" && (
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => void handleAssumir(item)}
                          >
                            Assumir
                          </Button>
                        )}
                        {col.id === "em_analise" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => openDocForm(item)}
                            >
                              Documentação
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setParecerTarget(item);
                                setParecerStatus("aprovado");
                                setParecerTexto(item.parecer ?? "");
                              }}
                            >
                              Parecer
                            </Button>
                          </>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={Boolean(docPrompt)}
        onOpenChange={(open) => {
          if (open) return;
          const target = docPrompt;
          setDocPrompt(null);
          if (!skipAutoDocRef.current && target) {
            void autoRegisterDoc(target);
          }
          skipAutoDocRef.current = false;
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar documentação?</AlertDialogTitle>
            <AlertDialogDescription>
              {docPrompt
                ? `O processo de ${docPrompt.nome} foi assumido. Deseja registrar a documentação agora? Construtora e empreendimento já vêm do lead. Se preferir depois, a documentação será criada automaticamente com valores padrão.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Agora não</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!docPrompt) return;
                skipAutoDocRef.current = true;
                const target = docPrompt;
                setDocPrompt(null);
                openDocForm(target);
              }}
            >
              Registrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FormDialogShell
        open={docOpen}
        onOpenChange={setDocOpen}
        icon={<ClipboardList className="w-5 h-5" />}
        title="Registrar documentação"
        description={
          docTarget
            ? `${docTarget.nome} · dados do lead já preenchidos`
            : undefined
        }
      >
        <FormDialogBody>
          <FormSection title="Do processo (automático)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <DetailField
                label="Corretor"
                value={docTarget?.lead.corretor?.name ?? "—"}
              />
              <DetailField
                label="Gerente"
                value={
                  docTarget?.lead.corretor?.equipe?.gerente.name ?? "—"
                }
              />
              <DetailField
                label="Construtora"
                value={docTarget?.lead.construtora?.nome ?? "—"}
              />
              <DetailField
                label="Empreendimento"
                value={docTarget?.lead.empreendimento?.nome ?? "—"}
              />
            </div>
          </FormSection>
          <FormSection title="Dados restantes">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>Fonte</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setQuickCatalogLabel("");
                      setQuickCatalogOpen("documentacao_fonte");
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Nova
                  </Button>
                </div>
                <Select value={docFonte} onValueChange={setDocFonte}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fonteOptions.map((label) => (
                      <SelectItem key={label} value={label}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>Status 1</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setQuickCatalogLabel("");
                      setQuickCatalogOpen("documentacao_status1");
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Novo
                  </Button>
                </div>
                <Select value={docStatus1} onValueChange={setDocStatus1}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {status1Options.map((label) => (
                      <SelectItem key={label} value={label}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>Status 2</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setQuickCatalogLabel("");
                      setQuickCatalogOpen("documentacao_status2");
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Novo
                  </Button>
                </div>
                <Select value={docStatus2} onValueChange={setDocStatus2}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {status2Options.map((label) => (
                      <SelectItem key={label} value={label}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3 sm:col-span-2 rounded-lg border border-border/60 p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Condições do cliente
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="doc-tem-entrada">Tem entrada?</Label>
                      <Switch
                        id="doc-tem-entrada"
                        checked={docTemEntrada}
                        onCheckedChange={(checked) => {
                          setDocTemEntrada(checked);
                          if (!checked) setDocValorEntrada("");
                        }}
                      />
                    </div>
                    {docTemEntrada && (
                      <Input
                        inputMode="numeric"
                        placeholder="0,00"
                        value={docValorEntrada}
                        onChange={(e) =>
                          setDocValorEntrada(maskMoneyInput(e.target.value))
                        }
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="doc-tem-fgts">Tem FGTS?</Label>
                      <Switch
                        id="doc-tem-fgts"
                        checked={docTemFgts}
                        onCheckedChange={(checked) => {
                          setDocTemFgts(checked);
                          if (!checked) setDocValorFgts("");
                        }}
                      />
                    </div>
                    {docTemFgts && (
                      <Input
                        inputMode="numeric"
                        placeholder="0,00"
                        value={docValorFgts}
                        onChange={(e) =>
                          setDocValorFgts(maskMoneyInput(e.target.value))
                        }
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:col-span-2">
                    <Label htmlFor="doc-tem-dependente">Tem dependente?</Label>
                    <Switch
                      id="doc-tem-dependente"
                      checked={docTemDependente}
                      onCheckedChange={setDocTemDependente}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>OBS</Label>
                <Input
                  value={docObs}
                  onChange={(e) => setDocObs(e.target.value)}
                />
              </div>
            </div>
          </FormSection>
        </FormDialogBody>
        <FormDialogActions>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDocOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={docSaving}
            onClick={() => void saveDoc()}
          >
            {docSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Salvar documentação
          </Button>
        </FormDialogActions>
      </FormDialogShell>

      <Dialog
        open={Boolean(parecerTarget) && !vgvModalOpen}
        onOpenChange={(o) => {
          if (!o) {
            setParecerTarget(null);
            setVgvModalOpen(false);
            setVgvValor("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Parecer da análise</DialogTitle>
            <DialogDescription>{parecerTarget?.nome}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Resultado</Label>
              <Select
                value={parecerStatus}
                onValueChange={(v) => setParecerStatus(v as AnaliseStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="reprovado">Reprovado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Parecer</Label>
              <Input
                value={parecerTexto}
                onChange={(e) => setParecerTexto(e.target.value)}
                placeholder="Observações do parecer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setParecerTarget(null)}>
              Cancelar
            </Button>
            <Button disabled={parecerSaving} onClick={() => void saveParecer()}>
              {parecerSaving && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={vgvModalOpen}
        onOpenChange={(o) => {
          if (!o) {
            setVgvModalOpen(false);
            setVgvValor("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Informe o VGV</DialogTitle>
            <DialogDescription>
              {parecerTarget
                ? `Valor geral de vendas do processo de ${parecerTarget.nome}. Esse valor atualiza a documentação e os indicadores.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-1">
            <Label htmlFor="parecer-vgv">VGV (R$)</Label>
            <Input
              id="parecer-vgv"
              inputMode="numeric"
              placeholder="0,00"
              value={vgvValor}
              onChange={(e) => setVgvValor(maskMoneyInput(e.target.value))}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setVgvModalOpen(false);
                setVgvValor("");
              }}
            >
              Voltar
            </Button>
            <Button
              type="button"
              disabled={parecerSaving}
              onClick={() => void confirmParecerComVgv()}
            >
              {parecerSaving && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              Confirmar aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(quickCatalogOpen)}
        onOpenChange={(o) => !o && setQuickCatalogOpen(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {quickCatalogOpen === "documentacao_fonte"
                ? "Nova fonte"
                : quickCatalogOpen === "documentacao_status1"
                  ? "Novo status 1"
                  : "Novo status 2"}
            </DialogTitle>
            <DialogDescription>
              O item fica disponível na fila do analista e em Configurações.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={quickCatalogLabel}
              onChange={(e) => setQuickCatalogLabel(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void saveQuickCatalog();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuickCatalogOpen(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={quickCatalogSaving}
              onClick={() => void saveQuickCatalog()}
            >
              {quickCatalogSaving && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
