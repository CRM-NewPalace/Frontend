import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  AGENDAMENTO_ORIGEM_BLOCK,
  AGENDAMENTO_ORIGEM_LABEL,
  AGENDAMENTO_STATUS_LABEL,
  AGENDAMENTO_TIPO_LABEL,
  getAgendamentoOrigem,
  type Agendamento,
} from "@/lib/agenda-api";
import { cn } from "@/lib/utils";

export type AgendaViewMode = "dia" | "semana" | "mes";

const HOUR_START = 7;
const HOUR_END = 23;
const PX_PER_HOUR = 56;
const DEFAULT_DURATION_MIN = 60;

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

/** Semana começando na segunda (pt-BR). */
export function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return startOfDay(
    new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff),
  );
}

export function endOfWeek(d: Date) {
  const start = startOfWeek(d);
  return endOfDay(
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6),
  );
}

export function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getVisibleRange(view: AgendaViewMode, anchor: Date) {
  if (view === "dia") {
    return { from: startOfDay(anchor), to: endOfDay(anchor) };
  }
  if (view === "semana") {
    return { from: startOfWeek(anchor), to: endOfWeek(anchor) };
  }
  return {
    from: startOfWeek(startOfMonth(anchor)),
    to: endOfWeek(endOfMonth(anchor)),
  };
}

export function formatRangeLabel(view: AgendaViewMode, anchor: Date) {
  if (view === "dia") {
    return anchor.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }
  if (view === "semana") {
    const from = startOfWeek(anchor);
    const to = addDays(from, 6);
    const sameMonth = from.getMonth() === to.getMonth();
    if (sameMonth) {
      return `${from.getDate()} – ${to.getDate()} de ${to.toLocaleDateString(
        "pt-BR",
        {
          month: "long",
          year: "numeric",
        },
      )}`;
    }
    return `${from.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${to.toLocaleDateString(
      "pt-BR",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      },
    )}`;
  }
  return anchor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function hoursList() {
  const hours: number[] = [];
  for (let h = HOUR_START; h <= HOUR_END; h += 1) hours.push(h);
  return hours;
}

function eventBounds(item: Agendamento) {
  const start = new Date(item.startsAt);
  const end = item.endsAt
    ? new Date(item.endsAt)
    : new Date(start.getTime() + DEFAULT_DURATION_MIN * 60_000);
  return { start, end };
}

function minutesFromGridStart(d: Date) {
  return d.getHours() * 60 + d.getMinutes() - HOUR_START * 60;
}

function formatHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

function formatEventTime(item: Agendamento) {
  const { start, end } = eventBounds(item);
  const a = start.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const b = end.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${a} – ${b}`;
}

type BoardProps = {
  view: AgendaViewMode;
  anchor: Date;
  items: Agendamento[];
  loading?: boolean;
  onSelectDay: (day: Date) => void;
  onCreateAt: (day: Date, hour?: number) => void;
  onEdit: (item: Agendamento) => void;
};

export function AgendaBoard({
  view,
  anchor,
  items,
  loading,
  onSelectDay,
  onCreateAt,
  onEdit,
}: BoardProps) {
  if (view === "mes") {
    return (
      <MonthBoard
        anchor={anchor}
        items={items}
        loading={loading}
        onSelectDay={onSelectDay}
        onCreateAt={onCreateAt}
        onEdit={onEdit}
      />
    );
  }

  const days =
    view === "dia"
      ? [startOfDay(anchor)]
      : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i));

  return (
    <TimeGridBoard
      days={days}
      items={items}
      loading={loading}
      onCreateAt={onCreateAt}
      onEdit={onEdit}
    />
  );
}

function TimeGridBoard({
  days,
  items,
  loading,
  onCreateAt,
  onEdit,
}: {
  days: Date[];
  items: Agendamento[];
  loading?: boolean;
  onCreateAt: (day: Date, hour?: number) => void;
  onEdit: (item: Agendamento) => void;
}) {
  const hours = hoursList();
  const gridHeight = (HOUR_END - HOUR_START + 1) * PX_PER_HOUR;
  const today = startOfDay(new Date());
  const now = new Date();

  const byDay = useMemo(() => {
    const map = new Map<string, Agendamento[]>();
    for (const day of days) map.set(toDateInput(day), []);
    for (const item of items) {
      if (item.status === "cancelado") continue;
      const key = toDateInput(new Date(item.startsAt));
      const list = map.get(key);
      if (list) list.push(item);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    }
    return map;
  }, [days, items]);

  const showNowLine = days.some((d) => sameDay(d, today));
  const nowTop =
    ((now.getHours() * 60 + now.getMinutes() - HOUR_START * 60) / 60) *
    PX_PER_HOUR;

  return (
    <div className="relative overflow-auto rounded-xl border bg-card">
      {loading ? (
        <div className="absolute inset-0 z-20 bg-background/50 flex items-center justify-center text-sm text-muted-foreground">
          Carregando…
        </div>
      ) : null}

      <div
        className="grid min-w-160"
        style={{
          gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))`,
        }}
      >
        <div className="sticky top-0 z-10 border-b bg-card" />
        {days.map((day) => {
          const isToday = sameDay(day, today);
          return (
            <div
              key={toDateInput(day)}
              className={cn(
                "sticky top-0 z-10 border-b border-l bg-card px-2 py-2 text-center",
                isToday && "bg-primary/5",
              )}
            >
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {day.toLocaleDateString("pt-BR", { weekday: "short" })}
              </div>
              <div
                className={cn(
                  "mx-auto mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                  isToday && "bg-primary text-primary-foreground",
                )}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}

        <div className="relative border-r" style={{ height: gridHeight }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground"
              style={{ top: (h - HOUR_START) * PX_PER_HOUR }}
            >
              {formatHour(h)}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const key = toDateInput(day);
          const dayItems = byDay.get(key) ?? [];
          const isToday = sameDay(day, today);

          return (
            <div
              key={key}
              className={cn("relative border-l", isToday && "bg-primary/3")}
              style={{ height: gridHeight }}
            >
              {hours.map((h) => (
                <button
                  key={h}
                  type="button"
                  className="absolute inset-x-0 border-t border-border/60 hover:bg-muted/40 transition-colors"
                  style={{
                    top: (h - HOUR_START) * PX_PER_HOUR,
                    height: PX_PER_HOUR,
                  }}
                  aria-label={`Agendar ${key} às ${formatHour(h)}`}
                  onClick={() => onCreateAt(day, h)}
                />
              ))}

              {isToday && showNowLine && nowTop >= 0 && nowTop <= gridHeight ? (
                <div
                  className="pointer-events-none absolute inset-x-0 z-5 border-t-2 border-red-500"
                  style={{ top: nowTop }}
                >
                  <span className="absolute -left-1 -top-1.5 size-2.5 rounded-full bg-red-500" />
                </div>
              ) : null}

              {dayItems.map((item) => {
                const { start, end } = eventBounds(item);
                let topMin = minutesFromGridStart(start);
                let endMin = minutesFromGridStart(end);
                if (endMin <= topMin) endMin = topMin + DEFAULT_DURATION_MIN;
                // Clamp to visible grid
                topMin = Math.max(
                  0,
                  Math.min(topMin, (HOUR_END - HOUR_START + 1) * 60 - 15),
                );
                endMin = Math.max(
                  topMin + 20,
                  Math.min(endMin, (HOUR_END - HOUR_START + 1) * 60),
                );

                const top = (topMin / 60) * PX_PER_HOUR;
                const height = ((endMin - topMin) / 60) * PX_PER_HOUR;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(item);
                    }}
                    className={cn(
                      "absolute left-1 right-1 z-6 overflow-hidden rounded-md border px-1.5 py-1 text-left shadow-sm transition hover:brightness-110",
                      AGENDAMENTO_ORIGEM_BLOCK[getAgendamentoOrigem(item)],
                      item.status === "concluido" && "opacity-80",
                      item.status === "cancelado" && "opacity-50 grayscale",
                    )}
                    style={{ top, height: Math.max(height, 22) }}
                    title={`${AGENDAMENTO_ORIGEM_LABEL[getAgendamentoOrigem(item)]} · ${item.titulo}${item.lead ? ` · ${item.lead.nome}` : ""}`}
                  >
                    <div className="truncate text-[11px] font-semibold leading-tight">
                      {item.titulo}
                    </div>
                    {height > 36 ? (
                      <div className="truncate text-[10px] opacity-90">
                        {formatEventTime(item)}
                        {item.lead ? ` · ${item.lead.nome}` : ""}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthBoard({
  anchor,
  items,
  loading,
  onSelectDay,
  onCreateAt,
  onEdit,
}: {
  anchor: Date;
  items: Agendamento[];
  loading?: boolean;
  onSelectDay: (day: Date) => void;
  onCreateAt: (day: Date, hour?: number) => void;
  onEdit: (item: Agendamento) => void;
}) {
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  const byDay = useMemo(() => {
    const map = new Map<string, Agendamento[]>();
    for (const item of items) {
      if (item.status === "cancelado") continue;
      const key = toDateInput(new Date(item.startsAt));
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    }
    return map;
  }, [items]);

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card">
      {loading ? (
        <div className="absolute inset-0 z-20 bg-background/50 flex items-center justify-center text-sm text-muted-foreground">
          Carregando…
        </div>
      ) : null}

      <div className="grid grid-cols-7 border-b bg-muted/30">
        {weekdays.map((w) => (
          <div
            key={w}
            className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-[minmax(110px,1fr)]">
        {cells.map((day) => {
          const key = toDateInput(day);
          const inMonth = day.getMonth() === anchor.getMonth();
          const isToday = sameDay(day, today);
          const dayItems = byDay.get(key) ?? [];
          const shown = dayItems.slice(0, 3);
          const extra = dayItems.length - shown.length;

          return (
            <div
              key={key}
              className={cn(
                "border-t border-l p-1.5 min-h-27.5 flex flex-col gap-1",
                !inMonth && "bg-muted/20 text-muted-foreground",
                isToday && "bg-primary/4",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold hover:bg-muted",
                    isToday &&
                      "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                >
                  {day.getDate()}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-[10px] text-muted-foreground"
                  onClick={() => onCreateAt(day, 9)}
                >
                  +
                </Button>
              </div>

              <div className="flex flex-col gap-0.5 min-h-0">
                {shown.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onEdit(item)}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-left text-[10px] font-medium leading-tight border",
                      AGENDAMENTO_ORIGEM_BLOCK[getAgendamentoOrigem(item)],
                      item.status === "cancelado" && "opacity-50 grayscale",
                    )}
                    title={`${AGENDAMENTO_ORIGEM_LABEL[getAgendamentoOrigem(item)]} · ${AGENDAMENTO_TIPO_LABEL[item.tipo]} · ${item.titulo} · ${AGENDAMENTO_STATUS_LABEL[item.status]}`}
                  >
                    {new Date(item.startsAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    {item.titulo}
                  </button>
                ))}
                {extra > 0 ? (
                  <button
                    type="button"
                    className="text-[10px] text-muted-foreground hover:text-foreground text-left px-1"
                    onClick={() => onSelectDay(day)}
                  >
                    +{extra} mais
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
