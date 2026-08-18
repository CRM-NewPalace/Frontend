import { useEffect, useState, type MouseEvent, type PointerEvent } from "react";
import { AlertTriangle, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api";
import type { Lead } from "@/lib/crm-types";
import {
  adiarPrazoLead,
  fetchPrazoAdiamentos,
  mapApiLead,
} from "@/lib/leads-api";
import {
  formatDateTimePt,
  formatPrazoUnidade,
  MOTIVO_SEM_MOVIMENTACAO_LABEL,
  PRAZO_UNIDADE_OPTIONS,
  type LeadPrazoAdiamento,
  type PrazoUnidade,
} from "@/lib/lead-monitoramento";
import { cn } from "@/lib/utils";

function stopCardEvents(e: PointerEvent | MouseEvent) {
  e.stopPropagation();
}

export function leadMonitoramentoCardClass(lead: Lead): string {
  const visual = lead.monitoramento?.visual;
  if (visual === "vermelho") {
    return "border-2 border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.25)]";
  }
  if (visual === "laranja") {
    return "border-2 border-orange-400 shadow-[0_0_0_1px_rgba(251,146,60,0.25)]";
  }
  return "";
}

export function LeadFunilAlerta({
  lead,
  onUpdated,
}: {
  lead: Lead;
  onUpdated?: (lead: Lead) => void;
}) {
  const mon = lead.monitoramento;
  const [open, setOpen] = useState(false);
  const [adiarOpen, setAdiarOpen] = useState(false);
  const [adiamentos, setAdiamentos] = useState<LeadPrazoAdiamento[] | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchPrazoAdiamentos(lead.id)
      .then((rows) => {
        if (!cancelled) setAdiamentos(rows);
      })
      .catch(() => {
        if (!cancelled) setAdiamentos([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, lead.id]);

  if (!mon || mon.visual === "none" || mon.problemas.length === 0) return null;

  const isRed = mon.visual === "vermelho";
  const summary =
    mon.problemas[0]?.detalhe ??
    (isRed ? "Lead precisa de atenção" : "Prazo próximo do vencimento");
  const timeLabel = isRed
    ? (mon.tempoAtrasoLabel ?? mon.tempoSemMovimentacaoLabel)
    : (mon.tempoRestanteLabel ?? mon.permanenciaLabel);

  return (
    <TooltipProvider delayDuration={200}>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "mt-2 flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[10px] font-medium",
                  isRed
                    ? "bg-red-500/10 text-red-700 dark:text-red-300"
                    : "bg-orange-500/10 text-orange-800 dark:text-orange-300",
                )}
                onPointerDown={stopCardEvents}
                onClick={stopCardEvents}
              >
                <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{summary}</span>
                {timeLabel && (
                  <span className="ml-auto shrink-0 tabular-nums">
                    {timeLabel}
                  </span>
                )}
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent className="max-w-64">
            {mon.problemas.map((p) => p.titulo).join(" · ")}
          </TooltipContent>
        </Tooltip>
        <PopoverContent
          align="start"
          className="w-80 p-3"
          onPointerDown={stopCardEvents}
          onClick={stopCardEvents}
        >
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Monitoramento</p>
              <p className="text-xs text-muted-foreground">
                Responsável: {lead.corretor}
              </p>
            </div>
            <div className="space-y-1.5">
              {mon.problemas.map((problema) => (
                <div
                  key={problema.tipo}
                  className="rounded-md border border-border/70 p-2"
                >
                  <p className="text-xs font-semibold">{problema.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {problema.detalhe}
                  </p>
                  {problema.motivos && problema.motivos.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {problema.motivos.map((motivo) => (
                        <Badge
                          key={motivo}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {MOTIVO_SEM_MOVIMENTACAO_LABEL[motivo]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {mon.tarefasAtrasadas && mon.tarefasAtrasadas.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-red-700 dark:text-red-300">
                  Tarefas atrasadas
                </p>
                <ul className="space-y-1">
                  {mon.tarefasAtrasadas.map((tarefa) => (
                    <li
                      key={tarefa.id}
                      className="rounded-md border border-red-500/40 bg-red-500/5 p-2 text-xs"
                    >
                      <p className="font-medium">{tarefa.titulo}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Prazo: {tarefa.prazo}
                        {tarefa.funilStage ? ` · etapa ${tarefa.funilStage}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <dl className="grid grid-cols-1 gap-1 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Entrada na etapa</dt>
                <dd>{formatDateTimePt(mon.stageEnteredAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Permanência</dt>
                <dd>{mon.permanenciaLabel}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Prazo configurado</dt>
                <dd>
                  {mon.prazoConfigurado
                    ? formatPrazoUnidade(
                        mon.prazoConfigurado.valor,
                        mon.prazoConfigurado.unidade,
                      )
                    : "Sem prazo"}
                  {mon.prazoAdiado ? " · adiado" : ""}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Vencimento</dt>
                <dd>{formatDateTimePt(mon.prazoDueAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Última movimentação</dt>
                <dd>{formatDateTimePt(mon.lastMovementAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Sem movimentação</dt>
                <dd>{mon.tempoSemMovimentacaoLabel}</dd>
              </div>
              {mon.tempoRestanteLabel && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Tempo restante</dt>
                  <dd>{mon.tempoRestanteLabel}</dd>
                </div>
              )}
              {mon.tempoAtrasoLabel && (
                <div className="flex justify-between gap-2 text-red-700 dark:text-red-300">
                  <dt>Tempo em atraso</dt>
                  <dd>{mon.tempoAtrasoLabel}</dd>
                </div>
              )}
            </dl>
            {adiamentos && adiamentos.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium">Adiamentos</p>
                <ul className="space-y-1 text-[11px] text-muted-foreground">
                  {adiamentos.map((item) => (
                    <li key={item.id}>
                      {item.prazoAnteriorLabel} → {item.prazoNovoLabel} por{" "}
                      {item.autorNome} · {formatDateTimePt(item.createdAt)}
                      {item.motivo ? ` — ${item.motivo}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {mon.podeAdiar && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => setAdiarOpen(true)}
              >
                <Clock className="mr-1 h-3.5 w-3.5" />
                Adiar prazo
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <AdiarPrazoDialog
        open={adiarOpen}
        onOpenChange={setAdiarOpen}
        lead={lead}
        onUpdated={(next) => {
          onUpdated?.(next);
          setAdiarOpen(false);
          setOpen(false);
        }}
      />
    </TooltipProvider>
  );
}

function AdiarPrazoDialog({
  open,
  onOpenChange,
  lead,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  onUpdated: (lead: Lead) => void;
}) {
  const atual = lead.monitoramento?.prazoConfigurado;
  const [valor, setValor] = useState(String(atual?.valor ?? 24));
  const [unidade, setUnidade] = useState<PrazoUnidade>(atual?.unidade ?? "horas");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValor(String(lead.monitoramento?.prazoConfigurado?.valor ?? 24));
    setUnidade(lead.monitoramento?.prazoConfigurado?.unidade ?? "horas");
    setMotivo("");
  }, [open, lead.monitoramento?.prazoConfigurado]);

  async function handleSave() {
    const n = Number(valor);
    if (!Number.isInteger(n) || n < 1) {
      toast.error("Informe um prazo válido.");
      return;
    }
    setSaving(true);
    try {
      const updated = await adiarPrazoLead(lead.id, {
        valor: n,
        unidade,
        motivo: motivo.trim() || undefined,
      });
      onUpdated(mapApiLead(updated));
      toast.success("Prazo adiado e registrado no histórico.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível adiar o prazo.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onPointerDown={stopCardEvents} onClick={stopCardEvents}>
        <DialogHeader>
          <DialogTitle>Adiar prazo — {lead.nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <p className="text-xs text-muted-foreground">
            O novo prazo é contado a partir da entrada na etapa atual
            {atual
              ? ` (hoje: ${formatPrazoUnidade(atual.valor, atual.unidade)})`
              : ""}
            .
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Novo prazo</Label>
              <Input
                type="number"
                min={1}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unidade</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value as PrazoUnidade)}
              >
                {PRAZO_UNIDADE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Motivo (opcional)</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" disabled={saving} onClick={() => void handleSave()}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Confirmar adiamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
