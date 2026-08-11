import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { TriagemEvent } from "@/lib/triagem-api";
import { cn } from "@/lib/utils";
import { ClipboardList, FileText, Loader2 } from "lucide-react";

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function LeadHistoryTimeline({
  events,
  contactName,
  stageLabel,
  fallbackStage,
  loading,
}: {
  events: TriagemEvent[];
  contactName: string;
  stageLabel: (slug: string | null) => string;
  fallbackStage?: string | null;
  loading?: boolean;
}) {
  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando histórico...
      </div>
    );
  }
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
        Nenhum relato registrado para este contato.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <ClipboardList className="h-4 w-4 text-primary" />
        Linha do tempo
      </div>
      <ol className="relative space-y-0">
        {events.map((ev, index) => {
          const stageSlug = ev.stageNovo || ev.stageAnterior || fallbackStage;
          const stageName = stageSlug ? stageLabel(stageSlug) : null;
          const changedStage = Boolean(
            ev.stageAnterior &&
              ev.stageNovo &&
              ev.stageAnterior !== ev.stageNovo,
          );
          const isLast = index === events.length - 1;

          return (
            <li key={ev.id} className="relative flex gap-3 pb-6 last:pb-0">
              <div className="flex w-5 shrink-0 flex-col items-center">
                <span className="relative z-10 mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <FileText className="h-2.5 w-2.5" />
                </span>
                {!isLast && (
                  <span
                    aria-hidden
                    className="mt-1 min-h-[1.5rem] w-px flex-1 bg-border"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="text-xs tabular-nums text-muted-foreground">
                  {formatWhen(ev.createdAt)}
                </div>

                <div
                  className={cn(
                    "space-y-2.5 rounded-xl border bg-card p-3.5 shadow-sm",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                        {initials(ev.autor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 space-y-1.5">
                      <p className="text-sm leading-snug">
                        <span className="font-semibold">{ev.autor.name}</span>
                        {changedStage
                          ? " atualizou a triagem de "
                          : " registrou um relato sobre "}
                        <span className="font-semibold">{contactName}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {stageName && (
                          <Badge
                            variant="secondary"
                            className="border-primary/20 bg-primary/10 text-[10px] font-medium text-primary"
                          >
                            {changedStage
                              ? stageName
                              : `Manteve ${stageName}`}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {ev.origem === "funil" ? "Funil" : "Manual"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground sm:pl-[2.625rem]">
                    {ev.texto}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
