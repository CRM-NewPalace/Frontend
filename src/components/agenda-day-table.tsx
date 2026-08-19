import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AGENDAMENTO_ORIGEM_DOT,
  AGENDAMENTO_ORIGEM_LABEL,
  AGENDAMENTO_STATUS_LABEL,
  AGENDAMENTO_TIPO_CARD,
  AGENDAMENTO_TIPO_SOFT,
  AGENDAMENTO_VISUAL_LABEL,
  getAgendamentoCardTitle,
  getAgendamentoOrigem,
  getAgendamentoVisual,
  isAgendamentoAniversario,
  isAgendamentoBloqueio,
  type Agendamento,
  type AgendamentoStatus,
  type AgendamentoTipo,
} from "@/lib/agenda-api";
import type { Role } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { STATUS_CHIP_CLASS } from "@/lib/catalog-colors";
import {
  Ban,
  Cake,
  CalendarDays,
  Check,
  CheckSquare,
  Clock,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { sameDay } from "@/components/agenda-board";
import { toast } from "sonner";

/** Horários da tabela: 07:00 até 00:00. */
const DAY_HOURS = [
  7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0,
] as const;

const STATUS_BADGE: Record<AgendamentoStatus, string> = {
  agendado: `${STATUS_CHIP_CLASS} bg-sky-500/15 text-sky-800 dark:text-sky-200`,
  concluido: `${STATUS_CHIP_CLASS} bg-emerald-500/15 text-emerald-800 dark:text-emerald-200`,
  cancelado: `${STATUS_CHIP_CLASS} bg-red-500/15 text-red-800 dark:text-red-200`,
};

const TIPO_ICON: Record<AgendamentoTipo, LucideIcon> = {
  visita: MapPin,
  ligacao: Phone,
  reuniao: Users,
  tarefa: CheckSquare,
  outro: CalendarDays,
  bloqueio: Ban,
};

function eventIcon(item: Agendamento): LucideIcon {
  if (isAgendamentoAniversario(item)) return Cake;
  return TIPO_ICON[item.tipo] ?? CalendarDays;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeRange(item: Agendamento) {
  const start = new Date(item.startsAt);
  const startLabel = formatTime(start);
  if (!item.endsAt) return startLabel;
  return `${startLabel} – ${formatTime(new Date(item.endsAt))}`;
}

function slotBounds(day: Date, hour: number) {
  const start = new Date(day);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(day);
  if (hour === 23) end.setHours(23, 59, 59, 999);
  else if (hour === 0) end.setHours(0, 59, 59, 999);
  else end.setHours(hour + 1, 0, 0, 0);
  return { start, end };
}

function findCoveringBloqueio(
  day: Date,
  hour: number,
  items: Agendamento[],
): Agendamento | null {
  const { start, end } = slotBounds(day, hour);
  for (const item of items) {
    if (!isAgendamentoBloqueio(item) || item.status === "cancelado") continue;
    if (!sameDay(new Date(item.startsAt), day)) continue;
    const bStart = new Date(item.startsAt);
    const bEnd = item.endsAt ? new Date(item.endsAt) : bStart;
    if (start < bEnd && end > bStart) return item;
  }
  return null;
}

type Slot =
  | { kind: "empty"; hour: number }
  | { kind: "event"; hour: number; item: Agendamento };

function buildDaySlots(day: Date, items: Agendamento[]): Slot[] {
  const dayItems = items
    .filter((item) => sameDay(new Date(item.startsAt), day))
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );

  const used = new Set<string>();
  const slots: Slot[] = [];

  for (const hour of DAY_HOURS) {
    const atHour = dayItems.filter((item) => {
      if (used.has(item.id)) return false;
      return new Date(item.startsAt).getHours() === hour;
    });

    if (atHour.length === 0) {
      slots.push({ kind: "empty", hour });
      continue;
    }

    for (const item of atHour) {
      used.add(item.id);
      slots.push({ kind: "event", hour, item });
    }
  }

  // Compromissos fora da grade (madrugada 01–06) ainda aparecem no fim.
  for (const item of dayItems) {
    if (used.has(item.id)) continue;
    slots.push({
      kind: "event",
      hour: new Date(item.startsAt).getHours(),
      item,
    });
  }

  return slots;
}

function formatHourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

type Props = {
  day: Date;
  items: Agendamento[];
  loading?: boolean;
  showCorretor?: boolean;
  /** Papel do usuário logado — compromissos de admin só admin altera. */
  currentUserRole?: Role;
  currentUserId?: string;
  completingId?: string | null;
  cancelingId?: string | null;
  onCreateAt: (day: Date, hour?: number) => void;
  onEdit: (item: Agendamento) => void;
  onComplete: (item: Agendamento) => void;
  onCancel: (item: Agendamento) => void;
};

function canMutateItem(item: Agendamento, role?: Role) {
  if (isAgendamentoAniversario(item)) return false;
  if (isAgendamentoBloqueio(item)) {
    return role === "admin" || role === "gerente";
  }
  if (item.autor.role === "admin") return role === "admin";
  return true;
}

function canCompleteItem(
  item: Agendamento,
  role?: Role,
  currentUserId?: string,
) {
  if (isAgendamentoAniversario(item) || isAgendamentoBloqueio(item)) {
    return false;
  }
  if (item.status !== "agendado" || item.solicitacaoStatus === "pendente") {
    return false;
  }
  if (canMutateItem(item, role)) return true;
  // Destinatário da tarefa atribuída pode concluir.
  return Boolean(currentUserId && item.atribuidoParaId === currentUserId);
}

function alvoBadgeLabel(item: Agendamento): string | null {
  const isAdminEvent =
    item.alvoTipo === "todos" ||
    item.alvoTipo === "equipe" ||
    item.alvoTipo === "gerente" ||
    item.alvoTipo === "gerentes" ||
    item.autor.role === "admin";
  if (!isAdminEvent) return null;
  if (item.alvoTipo === "todos") return "Todas as equipes";
  if (item.alvoTipo === "equipe") {
    return item.alvoEquipe?.name
      ? `Equipe: ${item.alvoEquipe.name}`
      : "Equipe";
  }
  if (item.alvoTipo === "gerente") {
    return item.alvoGerente?.name
      ? `Gerente: ${item.alvoGerente.name}`
      : "Gerente";
  }
  if (item.alvoTipo === "gerentes") return "Todos os gerentes";
  if (item.autor.role === "admin") return "Equipe";
  return null;
}

export function AgendaDayTable({
  day,
  items,
  loading,
  showCorretor,
  currentUserRole,
  currentUserId,
  completingId,
  cancelingId,
  onCreateAt,
  onEdit,
  onComplete,
  onCancel,
}: Props) {
  const slots = buildDaySlots(day, items);
  const activeCount = items.filter(
    (i) => sameDay(new Date(i.startsAt), day) && i.status !== "cancelado",
  ).length;
  const now = new Date();
  const isToday = sameDay(day, now);
  const currentHour = now.getHours();
  const weekdayShort = day.toLocaleDateString("pt-BR", { weekday: "short" });

  return (
    <div className="overflow-hidden rounded-2xl border bg-card max-sm:-mx-3 max-sm:rounded-none max-sm:border-x-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-gradient-to-r from-primary/10 via-primary/4 to-transparent px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl shadow-sm",
              isToday
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground",
            )}
          >
            <span className="text-[10px] font-semibold uppercase leading-none tracking-wide opacity-80">
              {weekdayShort.replace(".", "")}
            </span>
            <span className="mt-0.5 text-lg font-bold leading-none">
              {day.getDate()}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold capitalize sm:text-base">
              {day.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h3>
            <p className="text-xs text-muted-foreground">
              {activeCount === 0
                ? "Dia livre — toque em um horário para agendar"
                : `${activeCount} compromisso${activeCount > 1 ? "s" : ""} neste dia`}
            </p>
          </div>
        </div>
        <Button size="sm" className="rounded-full" onClick={() => onCreateAt(day)}>
          <Plus className="mr-1 h-4 w-4" />
          Agendar
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando horários…
        </div>
      ) : (
        <div className="relative py-2">
          {slots.map((slot, index) => {
            const isNow = isToday && slot.hour === currentHour;
            const isLast = index === slots.length - 1;

            if (slot.kind === "empty") {
              const bloqueio = findCoveringBloqueio(day, slot.hour, items);
              return (
                <div
                  key={`empty-${slot.hour}`}
                  className={cn(
                    "group grid grid-cols-[4.25rem_1fr] sm:grid-cols-[5rem_1fr]",
                    isNow && "bg-primary/5",
                  )}
                >
                  <TimeRail
                    hour={slot.hour}
                    isNow={isNow}
                    isLast={isLast}
                  />
                  <div className="min-w-0 py-1 pr-3 sm:pr-4">
                    {bloqueio ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (canMutateItem(bloqueio, currentUserRole)) {
                            onEdit(bloqueio);
                          } else {
                            toast.message("Horário bloqueado", {
                              description: bloqueio.titulo,
                            });
                          }
                        }}
                        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-400/50 bg-slate-500/8 px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-slate-500/15"
                      >
                        <Ban className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          Bloqueado — {bloqueio.autor.name}
                          {bloqueio.titulo ? ` · ${bloqueio.titulo}` : ""}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onCreateAt(day, slot.hour)}
                        className="flex w-full items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-left text-sm text-muted-foreground/70 transition hover:border-dashed hover:border-primary/35 hover:bg-primary/8 hover:text-foreground"
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:opacity-100" />
                        <span>Horário livre</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            const { item } = slot;
            const cancelled = item.status === "cancelado";
            const canMutate = canMutateItem(item, currentUserRole);
            const origem = getAgendamentoOrigem(item);
            const visual = getAgendamentoVisual(item);
            const Icon = eventIcon(item);
            const alvo = alvoBadgeLabel(item);
            const corretorName =
              item.atribuidoPara?.name ??
              item.lead?.corretor?.name ??
              item.autor?.name ??
              null;

            return (
              <div
                key={item.id}
                className={cn(
                  "grid grid-cols-[4.25rem_1fr] sm:grid-cols-[5rem_1fr]",
                  cancelled && "opacity-60",
                  isNow && "bg-primary/5",
                )}
              >
                <TimeRail
                  hour={slot.hour}
                  isNow={isNow}
                  isLast={isLast}
                  originClass={AGENDAMENTO_ORIGEM_DOT[origem]}
                  originLabel={AGENDAMENTO_ORIGEM_LABEL[origem]}
                />
                <div className="min-w-0 py-1.5 pr-3 sm:pr-4">
                  <article
                    className={cn(
                      "rounded-2xl border border-l-[3px] p-3 shadow-sm transition hover:shadow-md",
                      AGENDAMENTO_TIPO_CARD[visual],
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          AGENDAMENTO_TIPO_SOFT[visual],
                        )}
                        title={AGENDAMENTO_VISUAL_LABEL[visual]}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            {canMutate ? (
                              <button
                                type="button"
                                onClick={() => onEdit(item)}
                                className="text-left text-sm font-semibold leading-snug hover:underline"
                              >
                                {getAgendamentoCardTitle(item)}
                              </button>
                            ) : (
                              <p className="text-sm font-semibold leading-snug">
                                {getAgendamentoCardTitle(item)}
                              </p>
                            )}
                            <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatTimeRange(item)}
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className={STATUS_BADGE[item.status]}
                            title={AGENDAMENTO_STATUS_LABEL[item.status]}
                          >
                            {AGENDAMENTO_STATUS_LABEL[item.status]}
                          </Badge>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              AGENDAMENTO_TIPO_SOFT[visual],
                            )}
                          >
                            {AGENDAMENTO_VISUAL_LABEL[visual]}
                          </Badge>
                          {alvo ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-sky-400/40 text-sky-800 dark:text-sky-200"
                            >
                              {alvo}
                            </Badge>
                          ) : isAgendamentoBloqueio(item) ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-slate-400/50"
                            >
                              Bloqueado · {item.autor.name}
                            </Badge>
                          ) : item.atribuidoParaId ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-violet-400/40 text-violet-800 dark:text-violet-200"
                            >
                              De {item.autor.name}
                            </Badge>
                          ) : item.escopo === "pessoal" ? (
                            <Badge variant="outline" className="text-[10px]">
                              Pessoal
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-amber-400/40 text-amber-800 dark:text-amber-200"
                            >
                              Com gerente
                            </Badge>
                          )}
                          {item.solicitacaoStatus === "pendente" ? (
                            <Badge
                              className={`${STATUS_CHIP_CLASS} bg-amber-500 hover:bg-amber-500`}
                              title="Aguardando"
                            >
                              Aguardando
                            </Badge>
                          ) : null}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {item.lead ? (
                            <span className="inline-flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5" />
                              <span className="text-foreground/90">
                                {item.lead.nome}
                              </span>
                              {item.lead.telefone ? (
                                <span>· {item.lead.telefone}</span>
                              ) : null}
                            </span>
                          ) : null}
                          {showCorretor && corretorName ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5" />
                              {corretorName}
                            </span>
                          ) : null}
                          {item.local ? (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              {item.local}
                            </span>
                          ) : null}
                        </div>

                        {isAgendamentoBloqueio(item) && item.titulo ? (
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            {item.titulo}
                          </p>
                        ) : null}
                        {item.atribuidoParaId ? (
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            {item.atribuidoPara
                              ? `Para ${item.atribuidoPara.name} · `
                              : ""}
                            Passada por {item.autor.name}
                          </p>
                        ) : null}
                        {item.observacoes ? (
                          <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                            {item.observacoes}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-col gap-0.5">
                        {canCompleteItem(
                          item,
                          currentUserRole,
                          currentUserId,
                        ) ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-300"
                            onClick={() => onComplete(item)}
                            disabled={
                              completingId === item.id ||
                              cancelingId === item.id
                            }
                            aria-label="Concluir"
                            title="Concluir"
                          >
                            {completingId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                        ) : null}
                        {canMutate && item.status === "agendado" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-300"
                            onClick={() => onCancel(item)}
                            disabled={
                              completingId === item.id ||
                              cancelingId === item.id
                            }
                            aria-label="Cancelar"
                            title="Cancelar"
                          >
                            {cancelingId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        ) : null}
                        {canMutate ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onEdit(item)}
                            aria-label="Editar"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TimeRail({
  hour,
  isNow,
  isLast,
  originClass,
  originLabel,
}: {
  hour: number;
  isNow: boolean;
  isLast: boolean;
  originClass?: string;
  originLabel?: string;
}) {
  return (
    <div className="relative flex flex-col items-end pr-4 pt-3">
      {!isLast ? (
        <span className="absolute bottom-0 right-[15px] top-0 w-px bg-border" />
      ) : (
        <span className="absolute right-[15px] top-0 h-5 w-px bg-border" />
      )}
      <span
        className={cn(
          "absolute right-[11px] top-[18px] z-[1] size-2.5 rounded-full border-2 bg-card",
          isNow
            ? "border-primary bg-primary"
            : originClass
              ? `border-transparent ${originClass}`
              : "border-muted-foreground/30",
        )}
        title={originLabel}
      />
      <span
        className={cn(
          "text-xs font-medium tabular-nums text-muted-foreground",
          isNow && "font-semibold text-primary",
        )}
      >
        {formatHourLabel(hour)}
      </span>
      {isNow ? (
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
          Agora
        </span>
      ) : null}
    </div>
  );
}
