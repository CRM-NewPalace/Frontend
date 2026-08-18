import { useState } from "react";
import { ClipboardList, Eye, Loader2, Plus, User } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DetailField,
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import {
  HistoryTimeline,
  MAX_TRIAGEM_TEXTO,
  formatTriagemWhen,
  useTriagemHistory,
} from "@/components/triagem-history-timeline";
import { ApiError } from "@/lib/api";
import { brl, prioridadeBadgeClass, type Lead } from "@/lib/crm-types";
import { displayEmail } from "@/lib/email";
import { createTriagemEvent } from "@/lib/triagem-api";
import { prependTriagemHistoryCached } from "@/lib/triagem-history-cache";

export function TriagemFunilDialog({
  lead,
  open,
  onOpenChange,
  stageName,
  canWrite,
  onOpenDetails,
}: {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stageName: (slug: string | null) => string;
  canWrite: boolean;
  onOpenDetails: () => void;
}) {
  const { events, setEvents, loading } = useTriagemHistory(
    open && lead ? lead.id : null,
  );
  const [quickTexto, setQuickTexto] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  const latest = events[0] ?? null;
  const lastTriagemAt =
    lead?.monitoramento?.lastTriagemAt ?? latest?.createdAt ?? null;

  async function submitQuickRelato() {
    if (!lead || !canWrite) return;
    const texto = quickTexto.trim();
    if (!texto) {
      toast.error("Escreva o relato da triagem.");
      return;
    }
    if (texto.length > MAX_TRIAGEM_TEXTO) {
      toast.error(
        `O relato deve ter no máximo ${MAX_TRIAGEM_TEXTO} caracteres.`,
      );
      return;
    }

    setQuickSaving(true);
    try {
      const created = await createTriagemEvent({
        leadId: lead.id,
        texto,
        origem: "manual",
      });
      prependTriagemHistoryCached(lead.id, created);
      setEvents((prev) => [
        created,
        ...prev.filter((e) => e.id !== created.id),
      ]);
      setQuickTexto("");
      toast.success("Relato registrado. A etapa do funil foi mantida.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o relato.",
      );
    } finally {
      setQuickSaving(false);
    }
  }

  return (
    <FormDialogShell
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuickTexto("");
        onOpenChange(next);
      }}
      icon={<ClipboardList className="w-5 h-5" />}
      title={lead ? `Triagem · ${lead.nome}` : "Triagem"}
      description={
        lead
          ? `${lead.tipo === "cliente" ? "Cliente" : "Lead"} · ${stageName(lead.stage)} · consulte os relatos sem sair do funil.`
          : undefined
      }
      className="max-w-2xl"
      footer={
        <FormDialogActions
          hint={
            lastTriagemAt
              ? `Última triagem em ${formatTriagemWhen(lastTriagemAt)}`
              : "Ainda sem relatos neste contato"
          }
        >
          <Button type="button" variant="outline" onClick={onOpenDetails}>
            <Eye className="w-4 h-4 mr-1" />
            Ver detalhes
          </Button>
        </FormDialogActions>
      }
    >
      {lead && (
        <FormDialogBody>
          <FormSection
            icon={<User className="w-3.5 h-3.5 text-primary" />}
            title="Dados do contato"
            description="Resumo para consultar a triagem sem abrir a ficha completa."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailField label="Telefone" value={lead.telefone} />
              <DetailField
                label="E-mail"
                value={displayEmail(lead.email) || "—"}
              />
              <DetailField label="Corretor" value={lead.corretor} />
              <DetailField
                label="Prioridade"
                value={
                  <Badge className={prioridadeBadgeClass(lead.prioridade)}>
                    {lead.prioridade}
                  </Badge>
                }
              />
              <DetailField label="Interesse" value={lead.interesse} />
              <DetailField
                label="Renda mensal"
                value={lead.renda != null ? brl(lead.renda) : "—"}
              />
              <DetailField label="Cidade" value={lead.cidade} />
              <DetailField label="Bairro" value={lead.bairro} />
            </div>
          </FormSection>

          {latest && (
            <FormSection
              icon={<ClipboardList className="w-3.5 h-3.5 text-primary" />}
              title="Último relato"
              description={`${latest.autor.name} · ${formatTriagemWhen(latest.createdAt)}`}
            >
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {latest.texto}
              </p>
            </FormSection>
          )}

          {canWrite && (
            <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor="funil-triagem-preview-texto"
                  className="text-sm"
                >
                  Adicionar relato
                </Label>
                <span className="text-xs text-muted-foreground">
                  {quickTexto.length}/{MAX_TRIAGEM_TEXTO}
                </span>
              </div>
              <Textarea
                id="funil-triagem-preview-texto"
                value={quickTexto}
                maxLength={MAX_TRIAGEM_TEXTO}
                rows={3}
                placeholder="Ex.: Cliente pediu retorno amanhã… (não altera a etapa)"
                disabled={quickSaving}
                onChange={(e) => setQuickTexto(e.target.value)}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  Mantém a etapa atual ({stageName(lead.stage)}).
                </p>
                <Button
                  type="button"
                  size="sm"
                  disabled={quickSaving || !quickTexto.trim()}
                  onClick={() => void submitQuickRelato()}
                >
                  {quickSaving ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-1 h-4 w-4" />
                  )}
                  Registrar
                </Button>
              </div>
            </div>
          )}

          <HistoryTimeline
            events={events}
            contactName={lead.nome}
            stageLabel={stageName}
            fallbackStage={lead.stage}
            loading={loading}
            leadId={lead.id}
            onEventUpdated={(updated) =>
              setEvents((prev) =>
                prev.map((e) => (e.id === updated.id ? updated : e)),
              )
            }
          />
        </FormDialogBody>
      )}
    </FormDialogShell>
  );
}
