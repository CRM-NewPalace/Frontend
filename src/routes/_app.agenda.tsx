import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { getSession } from "@/lib/auth";
import { canViewTeamData } from "@/lib/permissions";
import { useLeads } from "@/lib/leads-store";
import { ApiError } from "@/lib/api";
import {
  AGENDAMENTO_STATUS,
  AGENDAMENTO_STATUS_LABEL,
  AGENDAMENTO_TIPOS,
  AGENDAMENTO_TIPO_LABEL,
  createAgendamento,
  deleteAgendamento,
  fetchAgendamentos,
  updateAgendamento,
  type Agendamento,
  type AgendamentoStatus,
  type AgendamentoTipo,
  type CreateAgendamentoInput,
} from "@/lib/agenda-api";
import {
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Imob CRM" }] }),
  component: AgendaPage,
});

type FormState = {
  leadId: string;
  clienteId: string;
  titulo: string;
  tipo: AgendamentoTipo;
  status: AgendamentoStatus;
  date: string;
  timeStart: string;
  timeEnd: string;
  local: string;
  observacoes: string;
};

const emptyForm = (): FormState => {
  const now = new Date();
  const date = toDateInput(now);
  const timeStart = toTimeInput(now);
  return {
    leadId: "",
    clienteId: "",
    titulo: "",
    tipo: "visita",
    status: "agendado",
    date,
    timeStart,
    timeEnd: "",
    local: "",
    observacoes: "",
  };
};

function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toTimeInput(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function combineLocalIso(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDayTitle(d: Date) {
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function formatTimeRange(item: Agendamento) {
  const start = new Date(item.startsAt);
  const startLabel = start.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!item.endsAt) return startLabel;
  const end = new Date(item.endsAt);
  const endLabel = end.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${startLabel} – ${endLabel}`;
}

const STATUS_BADGE: Record<AgendamentoStatus, string> = {
  agendado: "bg-cyan-100 text-cyan-800",
  concluido: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-red-100 text-red-800",
};

const TIPO_BADGE: Record<AgendamentoTipo, string> = {
  visita: "bg-violet-100 text-violet-800",
  ligacao: "bg-blue-100 text-blue-800",
  reuniao: "bg-amber-100 text-amber-800",
  outro: "bg-slate-100 text-slate-700",
};

function AgendaPage() {
  const user = getSession();
  const isManager = user ? canViewTeamData(user.role) : false;
  const { leads, assignees, loading: leadsLoading } = useLeads();

  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfDay(new Date()));
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));

  const [items, setItems] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCorretorId, setFilterCorretorId] = useState("__all__");
  const [filterTipo, setFilterTipo] = useState<string>("__all__");
  const [filterStatus, setFilterStatus] = useState<string>("__all__");

  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const visibleLeads = useMemo(() => {
    if (!user) return [];
    if (!isManager) {
      return leads.filter(
        (l) => l.corretorId === user.id || l.corretor === user.name,
      );
    }
    if (filterCorretorId !== "__all__") {
      return leads.filter((l) => l.corretorId === filterCorretorId);
    }
    return leads;
  }, [leads, user, isManager, filterCorretorId]);

  const leadOptions = useMemo(
    () => visibleLeads.filter((l) => l.tipo === "lead"),
    [visibleLeads],
  );
  const clienteOptions = useMemo(
    () => visibleLeads.filter((l) => l.tipo === "cliente"),
    [visibleLeads],
  );

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const from = startOfMonth(month).toISOString();
      const to = endOfMonth(month).toISOString();
      const data = await fetchAgendamentos({
        from,
        to,
        corretorId:
          isManager && filterCorretorId !== "__all__"
            ? filterCorretorId
            : undefined,
        tipo:
          filterTipo !== "__all__" ? (filterTipo as AgendamentoTipo) : undefined,
        status:
          filterStatus !== "__all__"
            ? (filterStatus as AgendamentoStatus)
            : undefined,
      });
      setItems(data);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar a agenda.",
      );
    } finally {
      setLoading(false);
    }
  }, [month, isManager, filterCorretorId, filterTipo, filterStatus]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const daysWithEvents = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      if (item.status === "cancelado") continue;
      const key = toDateInput(new Date(item.startsAt));
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const dayItems = useMemo(() => {
    return items
      .filter((item) => sameDay(new Date(item.startsAt), selectedDay))
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
  }, [items, selectedDay]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectLead(id: string) {
    const contact = leads.find((l) => l.id === id);
    setForm((prev) => ({
      ...prev,
      leadId: id,
      clienteId: "",
      titulo:
        prev.titulo.trim() ||
        (contact ? `Visita — ${contact.nome}` : prev.titulo),
    }));
  }

  function selectCliente(id: string) {
    const contact = leads.find((l) => l.id === id);
    setForm((prev) => ({
      ...prev,
      clienteId: id,
      leadId: "",
      titulo:
        prev.titulo.trim() ||
        (contact ? `Visita — ${contact.nome}` : prev.titulo),
    }));
  }

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    const base = emptyForm();
    base.date = toDateInput(selectedDay);
    setForm(base);
    setOpen(true);
  }

  function openEdit(item: Agendamento) {
    const start = new Date(item.startsAt);
    const end = item.endsAt ? new Date(item.endsAt) : null;
    setFormMode("edit");
    setEditingId(item.id);
    setForm({
      leadId: item.lead.tipo === "lead" ? item.leadId : "",
      clienteId: item.lead.tipo === "cliente" ? item.leadId : "",
      titulo: item.titulo,
      tipo: item.tipo,
      status: item.status,
      date: toDateInput(start),
      timeStart: toTimeInput(start),
      timeEnd: end ? toTimeInput(end) : "",
      local: item.local ?? "",
      observacoes: item.observacoes ?? "",
    });
    setOpen(true);
  }

  function validateForm(): CreateAgendamentoInput | null {
    const leadId = form.leadId || form.clienteId;
    if (!leadId) {
      toast.error("Selecione um lead ou um cliente.");
      return null;
    }
    if (!form.titulo.trim() || form.titulo.trim().length < 2) {
      toast.error("Informe um título.");
      return null;
    }
    if (!form.date || !form.timeStart) {
      toast.error("Informe data e horário de início.");
      return null;
    }

    const startsAt = combineLocalIso(form.date, form.timeStart);
    const endsAt = form.timeEnd
      ? combineLocalIso(form.date, form.timeEnd)
      : null;

    if (endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
      toast.error("O horário de término deve ser após o início.");
      return null;
    }

    return {
      leadId,
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      startsAt,
      endsAt,
      local: form.local.trim() || null,
      observacoes: form.observacoes.trim() || null,
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = validateForm();
    if (!payload) return;

    setSaving(true);
    try {
      if (formMode === "create") {
        await createAgendamento(payload);
        toast.success(
          payload.tipo === "visita"
            ? "Visita agendada. Funil atualizado quando aplicável."
            : "Compromisso criado.",
        );
      } else if (editingId) {
        await updateAgendamento(editingId, {
          ...payload,
          status: form.status,
        });
        toast.success("Compromisso atualizado.");
      }
      setOpen(false);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o compromisso.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteAgendamento(deleteId);
      toast.success("Compromisso excluído.");
      setDeleteId(null);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir o compromisso.",
      );
    }
  }

  const modifiers = useMemo(
    () => ({
      hasEvent: (day: Date) => daysWithEvents.has(toDateInput(day)),
    }),
    [daysWithEvents],
  );

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Compromissos com leads e clientes — visitas, ligações e reuniões."
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Novo
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        {isManager && (
          <Select value={filterCorretorId} onValueChange={setFilterCorretorId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Corretor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os corretores</SelectItem>
              {assignees.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os tipos</SelectItem>
            {AGENDAMENTO_TIPOS.map((t) => (
              <SelectItem key={t} value={t}>
                {AGENDAMENTO_TIPO_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os status</SelectItem>
            {AGENDAMENTO_STATUS.map((s) => (
              <SelectItem key={s} value={s}>
                {AGENDAMENTO_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <Card className="w-fit">
          <CardContent className="p-2 sm:p-3">
            <Calendar
              mode="single"
              locale={ptBR}
              selected={selectedDay}
              month={month}
              onMonthChange={setMonth}
              onSelect={(day) => {
                if (day) setSelectedDay(startOfDay(day));
              }}
              modifiers={modifiers}
              modifiersClassNames={{
                hasEvent:
                  "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:size-1 after:rounded-full after:bg-primary",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold capitalize">
                  {formatDayTitle(selectedDay)}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {dayItems.length === 0
                    ? "Nenhum compromisso neste dia."
                    : `${dayItems.length} compromisso${dayItems.length > 1 ? "s" : ""}`}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1" />
                Agendar
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Carregando…
              </div>
            ) : dayItems.length === 0 ? (
              <div className="rounded-xl border border-dashed py-14 text-center text-sm text-muted-foreground">
                <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Sem compromissos. Clique em <strong>Novo</strong> para agendar.
              </div>
            ) : (
              <ul className="space-y-3">
                {dayItems.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      "rounded-xl border p-4 transition-colors hover:bg-muted/30",
                      item.status === "cancelado" && "opacity-60",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={TIPO_BADGE[item.tipo]}>
                            {AGENDAMENTO_TIPO_LABEL[item.tipo]}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={STATUS_BADGE[item.status]}
                          >
                            {AGENDAMENTO_STATUS_LABEL[item.status]}
                          </Badge>
                        </div>
                        <p className="font-medium leading-snug">{item.titulo}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTimeRange(item)}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            {item.lead.nome}
                          </span>
                          {item.lead.corretor && isManager ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
                              {item.lead.corretor.name}
                            </span>
                          ) : null}
                          {item.local ? (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" />
                              {item.local}
                            </span>
                          ) : null}
                        </div>
                        {item.observacoes ? (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.observacoes}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(item)}
                          aria-label="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(item.id)}
                          aria-label="Excluir"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        icon={<CalendarDays className="w-5 h-5" />}
        title={formMode === "create" ? "Novo compromisso" : "Editar compromisso"}
        description="Vincule a um lead ou cliente e defina data e horário."
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" form="agenda-form" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Salvando…
                </>
              ) : formMode === "create" ? (
                "Agendar"
              ) : (
                "Salvar"
              )}
            </Button>
          </FormDialogActions>
        }
      >
        <form id="agenda-form" onSubmit={handleSubmit}>
          <FormDialogBody>
            <FormSection title="Contato" icon={<User className="w-4 h-4 text-primary" />}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Lead</Label>
                  <Select
                    value={form.leadId || "__none__"}
                    onValueChange={(v) =>
                      v === "__none__" ? setField("leadId", "") : selectLead(v)
                    }
                    disabled={formMode === "edit" || leadsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar lead" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {leadOptions.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select
                    value={form.clienteId || "__none__"}
                    onValueChange={(v) =>
                      v === "__none__"
                        ? setField("clienteId", "")
                        : selectCliente(v)
                    }
                    disabled={formMode === "edit" || leadsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {clienteOptions.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Detalhes"
              icon={<CalendarDays className="w-4 h-4 text-primary" />}
            >
              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={form.titulo}
                  onChange={(e) => setField("titulo", e.target.value)}
                  placeholder="Ex.: Visita ao empreendimento"
                  maxLength={160}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={form.tipo}
                    onValueChange={(v) => setField("tipo", v as AgendamentoTipo)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGENDAMENTO_TIPOS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {AGENDAMENTO_TIPO_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formMode === "edit" ? (
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) =>
                        setField("status", v as AgendamentoStatus)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AGENDAMENTO_STATUS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {AGENDAMENTO_STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setField("date", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeStart">Início</Label>
                  <Input
                    id="timeStart"
                    type="time"
                    value={form.timeStart}
                    onChange={(e) => setField("timeStart", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeEnd">Término (opc.)</Label>
                  <Input
                    id="timeEnd"
                    type="time"
                    value={form.timeEnd}
                    onChange={(e) => setField("timeEnd", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="local">Local</Label>
                <Input
                  id="local"
                  value={form.local}
                  onChange={(e) => setField("local", e.target.value)}
                  placeholder="Endereço ou ponto de encontro"
                  maxLength={160}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="obs">Observações</Label>
                <Textarea
                  id="obs"
                  value={form.observacoes}
                  onChange={(e) => setField("observacoes", e.target.value)}
                  placeholder="Detalhes do compromisso…"
                  rows={3}
                  maxLength={2000}
                />
              </div>
            </FormSection>
          </FormDialogBody>
        </form>
      </FormDialogShell>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir compromisso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
