import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { brl, prioridadeBadgeClass, type AnaliseStatus, type Lead, type StageId } from "@/lib/crm-types";
import { getSession } from "@/lib/auth";
import { canViewTeamData } from "@/lib/permissions";
import { useLeads } from "@/lib/leads-store";
import { useCatalog } from "@/lib/catalog-store";
import {
  FormDialogActions, FormDialogBody, FormDialogShell, FormSection, DetailField,
} from "@/components/form-dialog";
import { Clock, User, Eye, Sparkles, Wallet, MapPin, ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ANALISE_STATUS_LABEL: Record<AnaliseStatus, string> = {
  pendente: "Análise pendente",
  aprovado: "Análise aprovada",
  reprovado: "Análise reprovada",
};

function analiseBadgeClass(status: AnaliseStatus) {
  if (status === "aprovado") return "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300";
  if (status === "reprovado") return "border-destructive/40 bg-destructive/10 text-destructive";
  return "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300";
}

/** Slug da etapa que dispara o fluxo de "lead perdido". */
const LOST_STAGE_SLUG = "perdido";

/** Largura da coluna (w-72) + gap (gap-3) — um passo de scroll. */
const COLUMN_STEP_PX = 288 + 12;

export const Route = createFileRoute("/_app/funil")({
  head: () => ({ meta: [{ title: "Funil de Vendas — NP Connect" }] }),
  component: Funil,
});

function Funil() {
  const navigate = useNavigate();
  const user = getSession();
  const canSeeTeam = user ? canViewTeamData(user.role) : false;
  const isCorretor = !canSeeTeam;
  const { leads: allLeads, updateLeadStage, markLeadLost, loading } = useLeads();
  const { funnelStages, motivos: motivoOptions, loading: catalogLoading, colorByLabel } = useCatalog();
  const leads = isCorretor && user
    ? allLeads.filter((l) => l.corretor === user.name || l.corretorId === user.id)
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

  /** Após mudar etapa (só corretor): pergunta se quer registrar histórico na Triagem. */
  const [triagemPrompt, setTriagemPrompt] = useState<{
    leadId: string;
    leadNome: string;
    stage: StageId;
    stageName: string;
  } | null>(null);

  function offerTriagemHistory(lead: Lead, stage: StageId) {
    if (!isCorretor) return;
    const stageName = funnelStages.find((s) => s.id === stage)?.name ?? stage;
    setTriagemPrompt({
      leadId: lead.id,
      leadNome: lead.nome,
      stage,
      stageName,
    });
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
    if (stage === LOST_STAGE_SLUG) {
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
      await updateLeadStage(leadId, stage);
    } catch (err) {
      setTriagemPrompt(null);
      toast.error(err instanceof Error ? err.message : "Não foi possível mover o lead.");
    }
  }

  async function confirmLost() {
    if (!lostTarget) return;
    const motivo =
      lostMotivo === "__outro__" ? lostMotivoOutro.trim() : lostMotivo.trim();
    if (!motivo) {
      toast.error(
        motivoOptions.length === 0
          ? "Informe o motivo da perda."
          : "Selecione o motivo da perda.",
      );
      return;
    }

    const { id, nome } = lostTarget;
    setLostTarget(null);
    setLostMotivo("");
    setLostMotivoOutro("");
    toast.success(`${nome} movido para Leads Perdidos.`);
    try {
      await markLeadLost(id, motivo);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível marcar como perdido.");
    }
  }

  function openDetail(lead: Lead) {
    if (didDrag.current) return;
    setDetailLead(lead);
  }

  async function moveDetailToStage(stage: StageId) {
    if (!detailLead || stage === detailLead.stage) return;

    // Perdido: fecha o detalhe e abre o modal de motivo (soft-delete).
    if (stage === LOST_STAGE_SLUG) {
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
    offerTriagemHistory({ ...detailLead, stage }, stage);
    try {
      await updateLeadStage(detailLead.id, stage);
    } catch (err) {
      setTriagemPrompt(null);
      setDetailLead((cur) =>
        cur && cur.id === detailLead.id ? { ...cur, stage: previousStage } : cur,
      );
      toast.error(err instanceof Error ? err.message : "Não foi possível mover o lead.");
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
                  <span className="text-xs text-muted-foreground">{stageLeads.length}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{brl(total)}</span>
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
                      <div className="text-sm font-medium truncate">{l.nome}</div>
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
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          l.prioridade === "Alta" ? "bg-destructive" : l.prioridade === "Média" ? "bg-warning" : "bg-muted-foreground"
                        }`} />
                      </div>
                    </div>
                    {l.analise && (
                      <Badge
                        variant="outline"
                        className={cn("text-[9px] px-1.5 py-0 h-5 mb-1", analiseBadgeClass(l.analise.status))}
                      >
                        {ANALISE_STATUS_LABEL[l.analise.status]}
                      </Badge>
                    )}
                    <div className="text-xs text-muted-foreground">{l.telefone}</div>
                    {l.tipo === "cliente" && !isCorretor && (
                      <div className="text-[10px] text-violet-600 dark:text-violet-300 mt-1">
                        Carteira de {l.corretor.split(" ")[0]}
                      </div>
                    )}
                    <div className="text-sm font-semibold text-primary mt-1.5">
                      {l.renda != null ? brl(l.renda) : "—"}
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1"><User className="w-3 h-3" />{l.corretor.split(" ")[0]}</div>
                      <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{l.updatedAt}</div>
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
              <FormSection icon={<Sparkles className="w-3.5 h-3.5 text-primary" />} title="Contato">
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
                  <DetailField label="E-mail" value={detailLead.email} />
                  <DetailField label="Origem" value={detailLead.origem} />
                  {!isCorretor && <DetailField label="Corretor" value={detailLead.corretor} />}
                  {detailLead.analise && (
                    <DetailField
                      label="Análise"
                      value={
                        <div className="space-y-1">
                          <Badge
                            variant="outline"
                            className={cn("text-[10px]", analiseBadgeClass(detailLead.analise.status))}
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
              <FormSection icon={<Wallet className="w-3.5 h-3.5 text-primary" />} title="Interesse e renda">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Interesse" value={detailLead.interesse} />
                  <DetailField
                    label="Renda mensal"
                    value={detailLead.renda != null ? brl(detailLead.renda) : "—"}
                  />
                  <DetailField
                    label="Prioridade"
                    value={
                      <Badge className={prioridadeBadgeClass(detailLead.prioridade)}>
                        {detailLead.prioridade}
                      </Badge>
                    }
                  />
                  {detailLead.tags.length > 0 && (
                    <div className="sm:col-span-2 space-y-1.5">
                      <div className="text-xs text-muted-foreground">Tags</div>
                      <div className="flex flex-wrap gap-1.5">
                        {detailLead.tags.map((t) => (
                          <Badge key={t} className={`text-[10px] ${colorByLabel("tag", t)}`}>{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </FormSection>
              <FormSection icon={<MapPin className="w-3.5 h-3.5 text-primary" />} title="Localização">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Cidade" value={detailLead.cidade} />
                  <DetailField label="Bairro" value={detailLead.bairro} />
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions hint={`Atualizado em ${detailLead.updatedAt}`}>
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Etapa:</span>
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
                ? `${lostTarget.nome} sairá do funil e das listas operacionais, e irá para Leads Perdidos (visível só para o administrador).`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-1">
            {motivoOptions.length > 0 ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Motivo</Label>
                  <Select value={lostMotivo} onValueChange={setLostMotivo}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
                    <SelectContent>
                      {motivoOptions.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                      <SelectItem value="__outro__">Outro…</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {lostMotivo === "__outro__" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="funil-motivo-outro" className="text-xs text-muted-foreground">Descreva o motivo</Label>
                    <Input
                      id="funil-motivo-outro"
                      value={lostMotivoOutro}
                      onChange={(e) => setLostMotivoOutro(e.target.value)}
                      placeholder="Ex.: Cliente sem interesse"
                      className="h-10"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="funil-motivo-livre" className="text-xs text-muted-foreground">Motivo</Label>
                <Input
                  id="funil-motivo-livre"
                  value={lostMotivo}
                  onChange={(e) => setLostMotivo(e.target.value)}
                  placeholder="Ex.: Cliente sem interesse"
                  className="h-10"
                />
                <p className="text-[11px] text-muted-foreground">
                  Cadastre motivos em Configurações para selecionar depois.
                </p>
              </div>
            )}
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
          if (!open) setTriagemPrompt(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <DialogTitle>Adicionar relato?</DialogTitle>
                <DialogDescription>
                  {triagemPrompt
                    ? `${triagemPrompt.leadNome} foi movido para ${triagemPrompt.stageName}. A etapa já foi registrada na Triagem. Deseja incluir um relato com mais detalhes?`
                    : null}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTriagemPrompt(null)}
            >
              Não, obrigado
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!triagemPrompt) return;
                const { leadId, stage } = triagemPrompt;
                setTriagemPrompt(null);
                void navigate({
                  to: "/triagem",
                  search: { leadId, stage },
                });
              }}
            >
              Adicionar relato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
