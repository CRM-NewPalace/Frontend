import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AGENDAMENTO_ORIGEM_DOT,
  AGENDAMENTO_ORIGEM_LABEL,
  AGENDAMENTO_ORIGEM_SOFT,
  AGENDAMENTO_STATUS_LABEL,
  AGENDAMENTO_TIPO_LABEL,
  getAgendamentoOrigem,
  type Agendamento,
  type AgendamentoStatus,
} from "@/lib/agenda-api";
import type { Role } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Clock,
  Check,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  User,
  Users,
  X,
} from "lucide-react";
import { sameDay, toDateInput } from "@/components/agenda-board";

/** Horários da tabela: 07:00 até 00:00. */
const DAY_HOURS = [
  7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0,
] as const;

const STATUS_BADGE: Record<AgendamentoStatus, string> = {
  agendado: "bg-cyan-100 text-cyan-800",
  concluido: "bg-amber-100 text-amber-900",
  cancelado: "bg-red-100 text-red-800",
};

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
  completingId?: string | null;
  cancelingId?: string | null;
  onCreateAt: (day: Date, hour?: number) => void;
  onEdit: (item: Agendamento) => void;
  onComplete: (item: Agendamento) => void;
  onCancel: (item: Agendamento) => void;
};

function canMutateItem(item: Agendamento, role?: Role) {
  if (item.autor.role === "admin") return role === "admin";
  return true;
}

export function AgendaDayTable({
  day,
  items,
  loading,
  showCorretor,
  currentUserRole,
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

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 bg-muted/20">
        <div>
          <h3 className="text-sm font-semibold capitalize">
            {day.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </h3>
          <p className="text-xs text-muted-foreground">
            {activeCount === 0
              ? "Nenhum compromisso neste dia."
              : `${activeCount} compromisso${activeCount > 1 ? "s" : ""}`}
          </p>
        </div>
        <Button size="sm" onClick={() => onCreateAt(day)}>
          <Plus className="w-4 h-4 mr-1" />
          Agendar
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Carregando horários…
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[110px]">Horário</TableHead>
                <TableHead>Compromisso</TableHead>
                <TableHead className="hidden md:table-cell">Contato</TableHead>
                {showCorretor ? (
                  <TableHead className="hidden lg:table-cell">
                    Corretor
                  </TableHead>
                ) : null}
                <TableHead className="hidden sm:table-cell w-[120px]">
                  Status
                </TableHead>
                <TableHead className="w-[72px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.map((slot) => {
                if (slot.kind === "empty") {
                  const isNow = isToday && slot.hour === currentHour;
                  return (
                    <TableRow
                      key={`empty-${slot.hour}`}
                      className={cn("group", isNow && "bg-primary/[0.04]")}
                    >
                      <TableCell className="align-middle">
                        <div
                          className={cn(
                            "inline-flex items-center gap-1.5 text-sm font-medium tabular-nums text-muted-foreground",
                            isNow && "text-primary",
                          )}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {formatHourLabel(slot.hour)}
                        </div>
                      </TableCell>
                      <TableCell colSpan={showCorretor ? 4 : 3}>
                        <button
                          type="button"
                          onClick={() => onCreateAt(day, slot.hour)}
                          className="w-full rounded-lg border border-dashed px-3 py-2 text-left text-sm text-muted-foreground transition hover:border-primary/40 hover:bg-muted/40 hover:text-foreground"
                        >
                          Livre — clicar para agendar
                        </button>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  );
                }

                const { item } = slot;
                const cancelled = item.status === "cancelado";
                const canMutate = canMutateItem(item, currentUserRole);
                const origem = getAgendamentoOrigem(item);
                const isAdminEvent =
                  item.alvoTipo === "todos" ||
                  item.alvoTipo === "equipe" ||
                  item.alvoTipo === "gerente" ||
                  item.autor.role === "admin";
                const alvoBadgeLabel =
                  item.alvoTipo === "todos"
                    ? "Todas as equipes"
                    : item.alvoTipo === "equipe"
                      ? item.alvoEquipe?.name
                        ? `Equipe: ${item.alvoEquipe.name}`
                        : "Equipe"
                      : item.alvoTipo === "gerente"
                        ? item.alvoGerente?.name
                          ? `Gerente: ${item.alvoGerente.name}`
                          : "Gerente"
                        : item.autor.role === "admin"
                          ? "Equipe"
                          : null;
                const isNow =
                  isToday && new Date(item.startsAt).getHours() === currentHour;

                return (
                  <TableRow
                    key={item.id}
                    className={cn(
                      cancelled && "opacity-55",
                      isNow && "bg-primary/[0.04]",
                    )}
                  >
                    <TableCell className="align-top">
                      <div className="flex items-start gap-2">
                        <span
                          className={cn(
                            "mt-1.5 h-8 w-1 shrink-0 rounded-full",
                            AGENDAMENTO_ORIGEM_DOT[origem],
                          )}
                          title={AGENDAMENTO_ORIGEM_LABEL[origem]}
                        />
                        <div>
                          <div className="text-sm font-semibold tabular-nums">
                            {formatTimeRange(item)}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                AGENDAMENTO_ORIGEM_SOFT[origem],
                              )}
                            >
                              {AGENDAMENTO_TIPO_LABEL[item.tipo]}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      {canMutate ? (
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          className="text-left font-medium hover:underline"
                        >
                          {item.titulo}
                        </button>
                      ) : (
                        <span className="font-medium">{item.titulo}</span>
                      )}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {isAdminEvent && alvoBadgeLabel ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-sky-300 text-sky-800"
                          >
                            {alvoBadgeLabel}
                          </Badge>
                        ) : item.escopo === "pessoal" ? (
                          <Badge variant="outline" className="text-[10px]">
                            Pessoal
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-amber-300 text-amber-800"
                          >
                            Com gerente
                          </Badge>
                        )}
                        {item.solicitacaoStatus === "pendente" ? (
                          <Badge className="text-[10px] bg-amber-500 hover:bg-amber-500">
                            Aguardando
                          </Badge>
                        ) : null}
                      </div>
                      {item.local ? (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {item.local}
                        </p>
                      ) : null}
                      {item.observacoes ? (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {item.observacoes}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="align-top hidden md:table-cell">
                      {item.lead ? (
                        <>
                          <div className="inline-flex items-center gap-1.5 text-sm">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            {item.lead.nome}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.lead.telefone}
                          </p>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {showCorretor ? (
                      <TableCell className="align-top hidden lg:table-cell">
                        <div className="inline-flex items-center gap-1.5 text-sm">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          {item.lead?.corretor?.name ?? item.autor?.name ?? "—"}
                        </div>
                      </TableCell>
                    ) : null}
                    <TableCell className="align-top hidden sm:table-cell">
                      <Badge
                        variant="secondary"
                        className={STATUS_BADGE[item.status]}
                      >
                        {AGENDAMENTO_STATUS_LABEL[item.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <div className="inline-flex items-center gap-0.5">
                        {canMutate &&
                        item.status === "agendado" &&
                        item.solicitacaoStatus !== "pendente" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-700 hover:text-amber-800 hover:bg-amber-500/10"
                            onClick={() => onComplete(item)}
                            disabled={
                              completingId === item.id ||
                              cancelingId === item.id
                            }
                            aria-label="Concluir"
                            title="Concluir"
                          >
                            {completingId === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </Button>
                        ) : null}
                        {canMutate && item.status === "agendado" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                            onClick={() => onCancel(item)}
                            disabled={
                              completingId === item.id ||
                              cancelingId === item.id
                            }
                            aria-label="Cancelar"
                            title="Cancelar"
                          >
                            {cancelingId === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
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
                            <Pencil className="w-4 h-4" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="sr-only">{toDateInput(day)}</p>
        </div>
      )}
    </div>
  );
}
