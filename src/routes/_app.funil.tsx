import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brl, prioridadeBadgeClass, type Lead, type StageId } from "@/lib/crm-types";
import { getSession } from "@/lib/auth";
import { canViewTeamData } from "@/lib/permissions";
import { useLeads } from "@/lib/leads-store";
import { useCatalog } from "@/lib/catalog-store";
import {
  FormDialogActions, FormDialogBody, FormDialogShell, FormSection, DetailField,
} from "@/components/form-dialog";
import { Clock, User, Eye, Sparkles, Wallet, MapPin } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/funil")({
  head: () => ({ meta: [{ title: "Funil de Vendas — Imob CRM" }] }),
  component: Funil,
});

function Funil() {
  const user = getSession();
  const canSeeTeam = user ? canViewTeamData(user.role) : false;
  const isCorretor = !canSeeTeam;
  const { leads: allLeads, updateLeadStage, loading } = useLeads();
  const { funnelStages, loading: catalogLoading } = useCatalog();
  const leads = isCorretor && user
    ? allLeads.filter((l) => l.corretor === user.name || l.corretorId === user.id)
    : allLeads;
  const [dragging, setDragging] = useState<string | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const didDrag = useRef(false);

  async function onDrop(stage: StageId) {
    if (!dragging) return;
    const leadId = dragging;
    const lead = allLeads.find((l) => l.id === leadId);
    setDragging(null);
    try {
      await updateLeadStage(leadId, stage);
      if (lead) {
        const stageName = funnelStages.find((s) => s.id === stage)?.name ?? stage;
        toast.success(`${lead.nome} movido para ${stageName}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível mover o lead.");
    }
  }

  function openDetail(lead: Lead) {
    if (didDrag.current) return;
    setDetailLead(lead);
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
          !isCorretor ? (
            <Button size="sm" asChild>
              <Link to="/configuracoes">Configurar funil</Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6">
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
                          <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
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
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setDetailLead(null)}>
                Fechar
              </Button>
              <Button className="flex-1 sm:flex-none" asChild>
                <Link to="/leads" onClick={() => setDetailLead(null)}>
                  Ver em Leads
                </Link>
              </Button>
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>
    </div>
  );
}
