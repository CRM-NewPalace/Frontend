import { useState, type DragEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  funnelColumnBg,
  funnelColumnBorder,
  STATUS_CHIP_CLASS,
} from "@/lib/catalog-colors";
import { cn } from "@/lib/utils";

export type OperationFunnelStage = {
  id: string;
  label: string;
  color?: string | null;
};

export type OperationFunnelCard = {
  id: string;
  etapaId: string;
  title: string;
  subtitle?: string;
  meta?: string;
  href: string;
  imageUrl?: string | null;
};

export function OperationFunnelBoard({
  stages,
  cards,
  movingId,
  onMove,
}: {
  stages: OperationFunnelStage[];
  cards: OperationFunnelCard[];
  movingId?: string | null;
  onMove: (cardId: string, etapaId: string) => void;
}) {
  const [activeDrop, setActiveDrop] = useState<string | null>(null);

  function handleDrop(etapaId: string, event: DragEvent) {
    event.preventDefault();
    setActiveDrop(null);
    const cardId = event.dataTransfer.getData("text/plain");
    if (!cardId) return;
    const card = cards.find((item) => item.id === cardId);
    if (!card || card.etapaId === etapaId) return;
    onMove(cardId, etapaId);
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {stages.map((stage, index) => {
        const columnCards = cards.filter((card) => card.etapaId === stage.id);
        return (
          <div
            key={stage.id}
            onDragOver={(event) => {
              event.preventDefault();
              setActiveDrop(stage.id);
            }}
            onDragLeave={() => {
              if (activeDrop === stage.id) setActiveDrop(null);
            }}
            onDrop={(event) => handleDrop(stage.id, event)}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-xl p-3 transition-[box-shadow,background-color] duration-200",
              funnelColumnBg(index, stages.length),
              activeDrop === stage.id &&
                "scale-[1.01] ring-2 ring-primary/40 shadow-lg shadow-primary/10",
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <Badge
                variant="outline"
                className={cn(
                  STATUS_CHIP_CLASS,
                  "border-black/10 shadow-none",
                  stage.color,
                )}
                title={stage.label}
              >
                {stage.label}
              </Badge>
              <span className="text-xs tabular-nums text-muted-foreground">
                {columnCards.length}
              </span>
            </div>
            <div className="min-h-24 flex-1 space-y-2">
              {columnCards.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                  Arraste um card para esta etapa
                </p>
              ) : (
                columnCards.map((card) => (
                  <Card
                    key={card.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", card.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    className={cn(
                      "cursor-grab overflow-hidden border bg-card p-3 shadow-sm active:cursor-grabbing",
                      funnelColumnBorder(index, stages.length),
                      movingId === card.id && "opacity-60",
                    )}
                  >
                    <a
                      href={card.href}
                      draggable={false}
                      className="block space-y-1"
                    >
                      {card.imageUrl ? (
                        <img
                          src={card.imageUrl}
                          alt=""
                          className="-mx-3 -mt-3 mb-2 h-24 w-[calc(100%+1.5rem)] object-cover"
                        />
                      ) : null}
                      <p className="text-sm font-medium leading-snug">
                        {card.title}
                      </p>
                      {card.subtitle ? (
                        <p className="text-xs text-muted-foreground">
                          {card.subtitle}
                        </p>
                      ) : null}
                      {card.meta ? (
                        <p className="text-xs font-semibold tabular-nums">
                          {card.meta}
                        </p>
                      ) : null}
                    </a>
                  </Card>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
