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
  prioridadeBadgeClass,
  type AnaliseStatus,
  type Lead,
  type StageId,
} from "@/lib/crm-types";
import { getSession } from "@/lib/auth";
import { canViewTeamData } from "@/lib/permissions";
import { useLeads } from "@/lib/leads-store";
import { useCatalog } from "@/lib/catalog-store";
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
import { nextCatalogColor } from "@/lib/catalog-colors";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseOptionalMoneyInput,
} from "@/lib/money-input";
import {
  Clock,
  User,
  Eye,
  Sparkles,
  Wallet,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Plus,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { displayEmail } from "@/lib/email";

const ANALISE_STATUS_LABEL: Record<AnaliseStatus, string> = {
  pendente: "Análise pendente",
  em_analise: "Em análise",
  aprovado: "Análise aprovada",
  reprovado: "Análise reprovada",
};

function analiseBadgeClass(status: AnaliseStatus) {
  if (status === "aprovado")
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "reprovado")
    return "border-destructive/40 bg-destructive/10 text-destructive";
  if (status === "em_analise")
    return "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  return "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300";
}

/** Slug legado (fallback se o funil não tiver papel configurado). */
const LOST_STAGE_SLUG_FALLBACK = "perdido";
const ANALISE_STAGE_SLUG_FALLBACK = "em-analise";
const MAX_HISTORICO_TEXTO = 400;

/** Largura da coluna (w-72) + gap (gap-3) — um passo de scroll. */
const COLUMN_STEP_PX = 288 + 12;

export const Route = createFileRoute("/_app/funil")({
  head: () => ({ meta: [{ title: "Funil de Vendas — Zone Connection" }] }),
  component: Funil,
});

function Funil() {
  const user = getSession();
  if (user?.role === "analista") {
    return <AnalistaFunilBoard />;
  }
  return <ComercialFunilBoard />;
}

function ComercialFunilBoard() {
  const user = getSession();
  const canSeeTeam = user ? canViewTeamData(user.role) : false;
  const isCorretor = !canSeeTeam;
  const {
    leads: allLeads,
    updateLeadStage,
    markLeadLost,
    loading,
  } = useLeads();
  const {
    funnelStages,
    loading: catalogLoading,
    colorByLabel,
    stageByPapel,
    documentacaoFontes,
    documentacaoStatus1,
    documentacaoStatus2,
  } = useCatalog();
  const analiseStageSlug =
    stageByPapel("analise") ?? ANALISE_STAGE_SLUG_FALLBACK;
  const lostStageSlug = stageByPapel("perdido") ?? LOST_STAGE_SLUG_FALLBACK;
  const docFonteOptions =
    documentacaoFontes.length > 0
      ? documentacaoFontes
      : [...DEFAULT_DOCUMENTACAO_FONTES];
  const docStatus1Options =
    documentacaoStatus1.length > 0
      ? documentacaoStatus1
      : [...DEFAULT_STATUS1];
  const docStatus2Options =
    documentacaoStatus2.length > 0
      ? documentacaoStatus2
      : [...DEFAULT_STATUS2];

  function isAnaliseStage(stage: StageId): boolean {
    const found = funnelStages.find((s) => s.id === stage);
    if (found?.papel === "analise") return true;
    return stage === analiseStageSlug || stage === ANALISE_STAGE_SLUG_FALLBACK;
  }

  function isLostStage(stage: StageId): boolean {
    const found = funnelStages.find((s) => s.id === stage);
    if (found?.papel === "perdido") return true;
    return stage === lostStageSlug || stage === LOST_STAGE_SLUG_FALLBACK;
  }

  const leads =
    isCorretor && user
      ? allLeads.filter(
          (l) => l.corretor === user.name || l.corretorId === user.id,
        )
      : allLeads;
  const [dragging, setDragging] = useState<string | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const didDrag = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Fluxo de perda ao soltar o card na coluna "Perdido".
  const [lostTarget, setLostTarget] = useState<Lead | null>(null);
  const [lostMotivo, setLostMotivo] = useState("");
  const [lostMotivoOutro, setLostMotivoOutro] = useState("");

  /** Envio para análise: exige construtora + empreendimento. */
  const [analiseTarget, setAnaliseTarget] = useState<Lead | null>(null);
  const [analiseTargetStage, setAnaliseTargetStage] = useState<StageId>(
    analiseStageSlug,
  );
  const [analiseConstrutoraId, setAnaliseConstrutoraId] = useState("");
  const [analiseEmpreendimentoId, setAnaliseEmpreendimentoId] = useState("");
  const [analiseTemEntrada, setAnaliseTemEntrada] = useState(false);
  const [analiseValorEntrada, setAnaliseValorEntrada] = useState("");
  const [analiseTemFgts, setAnaliseTemFgts] = useState(false);
  const [analiseValorFgts, setAnaliseValorFgts] = useState("");
  const [analiseTemDependente, setAnaliseTemDependente] = useState(false);
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [analiseSaving, setAnaliseSaving] = useState(false);
  /** Após enviar para análise: pergunta se registra ficha comercial. */
  const [comercialDocPrompt, setComercialDocPrompt] = useState<{
    lead: Lead;
    targetStage: StageId;
    construtoraId: string;
    empreendimentoId: string;
    temEntrada: boolean;
    valorEntrada: number | null;
    temFgts: boolean;
    valorFgts: number | null;
    temDependente: boolean;
  } | null>(null);
  const [comercialDocSaving, setComercialDocSaving] = useState(false);
  const skipComercialDocRef = useRef(false);
  const [quickEmpreendimentoOpen, setQuickEmpreendimentoOpen] = useState(false);
  const [quickEmpreendimentoNome, setQuickEmpreendimentoNome] = useState("");
  const [quickEmpreendimentoCidade, setQuickEmpreendimentoCidade] =
    useState("");
  const [quickEmpreendimentoSaving, setQuickEmpreendimentoSaving] =
    useState(false);

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

  useEffect(() => {
    void Promise.all([
      fetchConstrutoras(),
      fetchEmpreendimentos({ ativo: true }),
    ])
      .then(([c, e]) => {
        setConstrutoras(c);
        setEmpreendimentos(e);
      })
      .catch(() => {
        /* selects vazios — erro só no envio */
      });
  }, []);

  const empreendimentosFiltrados = useMemo(() => {
    if (!analiseConstrutoraId) return [];
    return empreendimentos.filter(
      (e) => e.construtoraId === analiseConstrutoraId,
    );
  }, [empreendimentos, analiseConstrutoraId]);

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

  function openAnaliseDialog(lead: Lead, stage: StageId = analiseStageSlug) {
    setAnaliseTarget(lead);
    setAnaliseTargetStage(stage);
    setAnaliseConstrutoraId(lead.construtoraId ?? "");
    setAnaliseEmpreendimentoId(lead.empreendimentoId ?? "");
    setAnaliseTemEntrada(false);
    setAnaliseValorEntrada("");
    setAnaliseTemFgts(false);
    setAnaliseValorFgts("");
    setAnaliseTemDependente(false);
  }

  const canQuickCreateEmpreendimento =
    user?.role === "admin" || user?.role === "gerente";

  function openQuickEmpreendimento() {
    if (!analiseConstrutoraId) {
      toast.error(
        "Selecione a construtora antes de cadastrar um empreendimento.",
      );
      return;
    }
    setQuickEmpreendimentoNome("");
    setQuickEmpreendimentoCidade("");
    setQuickEmpreendimentoOpen(true);
  }

  async function handleQuickCreateEmpreendimento() {
    if (!analiseConstrutoraId) return;
    if (quickEmpreendimentoNome.trim().length < 2) {
      toast.error("Informe o nome do empreendimento.");
      return;
    }

    setQuickEmpreendimentoSaving(true);
    try {
      const created = await createEmpreendimento({
        nome: quickEmpreendimentoNome.trim(),
        construtoraId: analiseConstrutoraId,
        cidade: quickEmpreendimentoCidade.trim() || undefined,
      });
      setEmpreendimentos((current) =>
        [...current, created].sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR"),
        ),
      );
      setAnaliseEmpreendimentoId(created.id);
      setQuickEmpreendimentoOpen(false);
      toast.success("Empreendimento cadastrado e selecionado.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível cadastrar o empreendimento.",
      );
    } finally {
      setQuickEmpreendimentoSaving(false);
    }
  }

  async function confirmAnaliseSend() {
    if (!analiseTarget) return;
    if (!analiseConstrutoraId || !analiseEmpreendimentoId) {
      toast.error("Selecione a construtora e o empreendimento.");
      return;
    }
    const lead = analiseTarget;
    const targetStage = analiseTargetStage;
    const stageName =
      funnelStages.find((s) => s.id === targetStage)?.name ?? "Em análise";
    const finance = {
      temEntrada: analiseTemEntrada,
      valorEntrada: analiseTemEntrada
        ? parseOptionalMoneyInput(analiseValorEntrada)
        : null,
      temFgts: analiseTemFgts,
      valorFgts: analiseTemFgts
        ? parseOptionalMoneyInput(analiseValorFgts)
        : null,
      temDependente: analiseTemDependente,
    };
    setAnaliseSaving(true);
    try {
      await updateLeadStage(lead.id, targetStage, {
        construtoraId: analiseConstrutoraId,
        empreendimentoId: analiseEmpreendimentoId,
        ...(isCorretor ? { omitTriagem: true } : {}),
        ...finance,
      });
      setAnaliseTarget(null);
      toast.success(`${lead.nome} enviado para ${stageName}`);
      setComercialDocPrompt({
        lead,
        targetStage,
        construtoraId: analiseConstrutoraId,
        empreendimentoId: analiseEmpreendimentoId,
        ...finance,
      });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Não foi possível enviar para análise.",
      );
    } finally {
      setAnaliseSaving(false);
    }
  }

  async function registerComercialDoc() {
    if (!comercialDocPrompt) return;
    const prompt = comercialDocPrompt;
    const fonte = docFonteOptions.includes("Outro")
      ? "Outro"
      : (docFonteOptions[0] ?? "Outro");
    const status1 = docStatus1Options.includes("Análise")
      ? "Análise"
      : (docStatus1Options[0] ?? "Análise");
    const status2 = docStatus2Options.includes("Andamento")
      ? "Andamento"
      : (docStatus2Options[0] ?? "Andamento");
    setComercialDocSaving(true);
    try {
      await createDocumentacao({
        leadId: prompt.lead.id,
        nome: prompt.lead.nome,
        construtoraId: prompt.construtoraId,
        empreendimentoId: prompt.empreendimentoId,
        fonte,
        status1,
        status2,
        corretorId: prompt.lead.corretorId ?? undefined,
        dataAnalise: new Date().toISOString().slice(0, 10),
        temEntrada: prompt.temEntrada,
        valorEntrada: prompt.valorEntrada,
        temFgts: prompt.temFgts,
        valorFgts: prompt.valorFgts,
        temDependente: prompt.temDependente,
      });
      toast.success("Documentação comercial registrada.");
      skipComercialDocRef.current = true;
      setComercialDocPrompt(null);
      offerTriagemHistory(prompt.lead, prompt.targetStage);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível registrar a documentação.",
      );
    } finally {
      setComercialDocSaving(false);
    }
  }

  function dismissComercialDocPrompt() {
    const prompt = comercialDocPrompt;
    skipComercialDocRef.current = true;
    setComercialDocPrompt(null);
    if (prompt) {
      offerTriagemHistory(prompt.lead, prompt.targetStage);
    }
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

  async function onDrop(stage: StageId) {
    if (!dragging) return;
    const leadId = dragging;
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

    if (isAnaliseStage(stage)) {
      openAnaliseDialog(lead, stage);
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
        ? `${nome} excluído da carteira.`
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

    if (isAnaliseStage(stage)) {
      const target = detailLead;
      setDetailLead(null);
      openAnaliseDialog(target, stage);
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
        title="Funil de Vendas"
        description={
          loading || catalogLoading
            ? "Carregando funil..."
            : isCorretor
              ? "Seus leads e clientes no funil — arraste os cards para mover entre etapas."
              : "Funil da equipe — leads de captação e clientes da carteira. Clique para ver detalhes."
        }
        actions={
          <div className="flex items-center gap-2">
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
              <Button size="sm" asChild>
                <Link to="/configuracoes">Configurar funil</Link>
              </Button>
            )}
          </div>
        }
      />

      <div
        ref={boardRef}
        className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 scroll-smooth"
      >
        {funnelStages.map((stage) => {
          const stageLeads = leads.filter((l) => l.stage === stage.id);
          const total = stageLeads.reduce((s, l) => s + (l.renda ?? 0), 0);
          return (
            <div
              key={stage.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(stage.id)}
              className="w-72 shrink-0 flex flex-col bg-muted/40 rounded-xl p-3"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className={stage.color}>{stage.name}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {stageLeads.length}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {brl(total)}
                </span>
              </div>
              <div className="space-y-2 min-h-16 flex-1">
                {stageLeads.map((l) => (
                  <Card
                    key={l.id}
                    draggable
                    onDragStart={() => {
                      didDrag.current = false;
                      setDragging(l.id);
                    }}
                    onDrag={() => {
                      didDrag.current = true;
                    }}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => openDetail(l)}
                    className={`p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                      dragging === l.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1.5 gap-2">
                      <div className="text-sm font-medium truncate">
                        {l.nome}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
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
                    {l.analise && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] px-1.5 py-0 h-5 mb-1",
                          analiseBadgeClass(l.analise.status),
                        )}
                      >
                        {ANALISE_STATUS_LABEL[l.analise.status]}
                      </Badge>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {l.telefone}
                    </div>
                    {l.tipo === "cliente" && !isCorretor && (
                      <div className="text-[10px] text-violet-600 dark:text-violet-300 mt-1">
                        Carteira de {l.corretor.split(" ")[0]}
                      </div>
                    )}
                    <div className="text-sm font-semibold text-primary mt-1.5">
                      {l.renda != null ? brl(l.renda) : "—"}
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
              <FormSection
                icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
                title="Contato"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField
                    label="Tipo"
                    value={
                      detailLead.tipo === "cliente" ? (
                        <Badge
                          variant="outline"
                          className="border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                        >
                          Cliente da carteira
                        </Badge>
                      ) : (
                        <Badge variant="outline">Lead de captação</Badge>
                      )
                    }
                  />
                  <DetailField label="Telefone" value={detailLead.telefone} />
                  <DetailField
                    label="E-mail"
                    value={displayEmail(detailLead.email) || "—"}
                  />
                  <DetailField label="Origem" value={detailLead.origem} />
                  {!isCorretor && (
                    <DetailField label="Corretor" value={detailLead.corretor} />
                  )}
                  {detailLead.analise && (
                    <DetailField
                      label="Análise"
                      value={
                        <div className="space-y-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              analiseBadgeClass(detailLead.analise.status),
                            )}
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
                            className={`text-[10px] ${colorByLabel("tag", t)}`}
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    Etapa:
                  </span>
                  <Select
                    value={detailLead.stage}
                    onValueChange={(v) => void moveDetailToStage(v)}
                  >
                    <SelectTrigger className="h-9 min-w-[180px]">
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
                  ? `${lostTarget.nome} será removido da carteira e do funil. Clientes não vão para Leads Perdidos.`
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
        open={Boolean(analiseTarget)}
        onOpenChange={(open) => {
          if (!open) setAnaliseTarget(null);
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enviar para análise</DialogTitle>
            <DialogDescription>
              {analiseTarget
                ? `Informe o imóvel e as condições de ${analiseTarget.nome}. Ao enviar, a documentação é criada automaticamente.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="space-y-1.5">
              <Label>Construtora *</Label>
              <Select
                value={analiseConstrutoraId || "__none__"}
                onValueChange={(v) => {
                  setAnaliseConstrutoraId(v === "__none__" ? "" : v);
                  setAnaliseEmpreendimentoId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {construtoras.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label>Empreendimento *</Label>
                {canQuickCreateEmpreendimento && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={openQuickEmpreendimento}
                    title="Cadastrar empreendimento"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Novo imóvel
                  </Button>
                )}
              </div>
              <Select
                value={analiseEmpreendimentoId || "__none__"}
                onValueChange={(v) =>
                  setAnaliseEmpreendimentoId(v === "__none__" ? "" : v)
                }
                disabled={!analiseConstrutoraId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      analiseConstrutoraId
                        ? "Selecione"
                        : "Selecione a construtora primeiro"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {empreendimentosFiltrados.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                      {e.cidade ? ` · ${e.cidade}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border/60 p-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Condições do cliente
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="analise-tem-entrada">Tem entrada?</Label>
                  <Switch
                    id="analise-tem-entrada"
                    checked={analiseTemEntrada}
                    onCheckedChange={(checked) => {
                      setAnaliseTemEntrada(checked);
                      if (!checked) setAnaliseValorEntrada("");
                    }}
                  />
                </div>
                {analiseTemEntrada && (
                  <Input
                    inputMode="numeric"
                    placeholder="0,00"
                    value={analiseValorEntrada}
                    onChange={(e) =>
                      setAnaliseValorEntrada(maskMoneyInput(e.target.value))
                    }
                  />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="analise-tem-fgts">Tem FGTS?</Label>
                  <Switch
                    id="analise-tem-fgts"
                    checked={analiseTemFgts}
                    onCheckedChange={(checked) => {
                      setAnaliseTemFgts(checked);
                      if (!checked) setAnaliseValorFgts("");
                    }}
                  />
                </div>
                {analiseTemFgts && (
                  <Input
                    inputMode="numeric"
                    placeholder="0,00"
                    value={analiseValorFgts}
                    onChange={(e) =>
                      setAnaliseValorFgts(maskMoneyInput(e.target.value))
                    }
                  />
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="analise-tem-dependente">Tem dependente?</Label>
                <Switch
                  id="analise-tem-dependente"
                  checked={analiseTemDependente}
                  onCheckedChange={setAnaliseTemDependente}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAnaliseTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={analiseSaving}
              onClick={() => void confirmAnaliseSend()}
            >
              {analiseSaving && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(comercialDocPrompt)}
        onOpenChange={(open) => {
          if (open) return;
          if (!skipComercialDocRef.current) {
            dismissComercialDocPrompt();
          }
          skipComercialDocRef.current = false;
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar documentação?</AlertDialogTitle>
            <AlertDialogDescription>
              {comercialDocPrompt
                ? `O processo de ${comercialDocPrompt.lead.nome} já foi enviado para análise. Deseja registrar uma documentação comercial agora? Ela fica visível para você e para o gerente da equipe.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={comercialDocSaving}
              onClick={() => dismissComercialDocPrompt()}
            >
              Agora não
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={comercialDocSaving}
              onClick={(e) => {
                e.preventDefault();
                void registerComercialDoc();
              }}
            >
              {comercialDocSaving && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              Registrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={quickEmpreendimentoOpen}
        onOpenChange={setQuickEmpreendimentoOpen}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo empreendimento</DialogTitle>
            <DialogDescription>
              O imóvel será vinculado à construtora selecionada.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="quick-empreendimento-nome">Nome *</Label>
              <Input
                id="quick-empreendimento-nome"
                value={quickEmpreendimentoNome}
                onChange={(event) =>
                  setQuickEmpreendimentoNome(event.target.value)
                }
                placeholder="Ex.: Reserva dos Ipês"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quick-empreendimento-cidade">Cidade</Label>
              <Input
                id="quick-empreendimento-cidade"
                value={quickEmpreendimentoCidade}
                onChange={(event) =>
                  setQuickEmpreendimentoCidade(event.target.value)
                }
                placeholder="Ex.: Recife"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuickEmpreendimentoOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={quickEmpreendimentoSaving}
              onClick={() => void handleQuickCreateEmpreendimento()}
            >
              {quickEmpreendimentoSaving && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              )}
              Cadastrar
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
  const status1Options =
    documentacaoStatus1.length > 0
      ? documentacaoStatus1
      : [...DEFAULT_STATUS1];
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
  const [docStatus1, setDocStatus1] = useState("Análise");
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
    return status1Options.includes("Análise")
      ? "Análise"
      : (status1Options[0] ?? "Análise");
  }

  function defaultDocStatus2() {
    return status2Options.includes("Andamento")
      ? "Andamento"
      : (status2Options[0] ?? "Andamento");
  }

  async function autoRegisterDoc(item: Analise) {
    try {
      const session = getSession();
      const existing = await fetchDocumentacoes();
      // Só pula se o próprio analista já tiver ficha (a do corretor/gerente é outra).
      if (
        session &&
        existing.some(
          (d) => d.leadId === item.leadId && d.autor.id === session.id,
        )
      ) {
        toast.success("Documentação já existente para este cliente.");
        return;
      }
      await createDocumentacao({
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
      await createDocumentacao({
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
        description="Processos de toda a imobiliária: pendentes, em análise e com resultado."
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
          {ANALISTA_COLUMNS.map((col) => {
            const colItems = items.filter((i) => i.status === col.id);
            return (
              <div
                key={col.id}
                className="w-72 shrink-0 flex flex-col bg-muted/40 rounded-xl p-3"
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
                      <div className="text-sm font-medium truncate">
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
