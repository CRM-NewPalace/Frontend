import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FUNIL_STAGES, brl, type StageId } from "@/lib/mock-data";
import { getSession } from "@/lib/mock-auth";
import { useLeads } from "@/lib/leads-store";
import { Clock, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/funil")({
  head: () => ({ meta: [{ title: "Funil de Vendas — Imob CRM" }] }),
  component: Funil,
});

function Funil() {
  const user = getSession();
  const isCorretor = user?.role === "corretor";
  const { leads: allLeads, updateLeadStage } = useLeads();
  const leads = isCorretor && user ? allLeads.filter((l) => l.corretor === user.name) : allLeads;
  const [dragging, setDragging] = useState<string | null>(null);

  function onDrop(stage: StageId) {
    if (!dragging) return;
    const lead = allLeads.find((l) => l.id === dragging);
    updateLeadStage(dragging, stage);
    setDragging(null);
    if (lead) {
      const stageName = FUNIL_STAGES.find((s) => s.id === stage)?.name ?? stage;
      toast.success(`${lead.nome} movido para ${stageName}`);
    }
  }

  return (
    <div>
      <PageHeader
        title="Funil de Vendas"
        description={
          isCorretor
            ? "Seus leads no funil — arraste os cards para mover entre etapas."
            : "Arraste os cards para mover o lead entre etapas."
        }
        actions={!isCorretor ? <Button size="sm">Configurar funil</Button> : undefined}
      />

      <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6">
        {FUNIL_STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.stage === stage.id);
          const total = stageLeads.reduce((s, l) => s + l.valor, 0);
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
                    onDragStart={() => setDragging(l.id)}
                    onDragEnd={() => setDragging(null)}
                    className={`p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                      dragging === l.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="text-sm font-medium truncate">{l.nome}</div>
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                        l.prioridade === "Alta" ? "bg-destructive" : l.prioridade === "Média" ? "bg-warning" : "bg-muted-foreground"
                      }`} />
                    </div>
                    <div className="text-xs text-muted-foreground">{l.telefone}</div>
                    <div className="text-sm font-semibold text-primary mt-1.5">{brl(l.valor)}</div>
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
    </div>
  );
}
