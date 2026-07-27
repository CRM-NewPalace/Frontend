import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
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
import {
  AgendaBoard,
  addDays,
  endOfDay,
  formatRangeLabel,
  getVisibleRange,
  startOfDay,
  startOfMonth,
  toDateInput,
  type AgendaViewMode,
} from "@/components/agenda-board";
import { AgendaDayTable } from "@/components/agenda-day-table";
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
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Loader2,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type LayoutMode = "tabela" | "calendario";

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
  return {
    leadId: "",
    clienteId: "",
    titulo: "",
    tipo: "visita",
    status: "agendado",
    date: toDateInput(now),
    timeStart: toTimeInput(now),
    timeEnd: "",
    local: "",
    observacoes: "",
  };
};

function toTimeInput(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function combineLocalIso(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}

const VIEW_OPTIONS: { id: AgendaViewMode; label: string }[] = [
  { id: "dia", label: "Dia" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
];

function AgendaPage() {
  const user = getSession();
  const isManager = user ? canViewTeamData(user.role) : false;
  const { leads, assignees, loading: leadsLoading } = useLeads();

  const [layoutMode, setLayoutMode] = useState<LayoutMode>("tabela");
  const [view, setView] = useState<AgendaViewMode>("semana");
  const [selectedDay, setSelectedDay] = useState<Date>(() =>
    startOfDay(new Date()),
  );

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

  const visibleRange = useMemo(() => {
    if (layoutMode === "tabela") {
      return {
        from: startOfDay(selectedDay),
        to: endOfDay(selectedDay),
      };
    }
    return getVisibleRange(view, selectedDay);
  }, [layoutMode, view, selectedDay]);

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
      const data = await fetchAgendamentos({
        from: visibleRange.from.toISOString(),
        to: visibleRange.to.toISOString(),
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
  }, [
    visibleRange.from,
    visibleRange.to,
    isManager,
    filterCorretorId,
    filterTipo,
    filterStatus,
  ]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

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

  function openCreate(day?: Date, hour?: number) {
    setFormMode("create");
    setEditingId(null);
    const base = emptyForm();
    const target = day ? startOfDay(day) : selectedDay;
    base.date = toDateInput(target);
    if (hour != null) {
      base.timeStart = `${String(hour).padStart(2, "0")}:00`;
      if (hour === 23) {
        base.timeEnd = "23:59";
      } else if (hour === 0) {
        base.timeEnd = "00:30";
      } else {
        base.timeEnd = `${String(hour + 1).padStart(2, "0")}:00`;
      }
    }
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
      setOpen(false);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir o compromisso.",
      );
    }
  }

  function goToday() {
    setSelectedDay(startOfDay(new Date()));
  }

  function navigate(direction: -1 | 1) {
    if (layoutMode === "tabela") {
      setSelectedDay((d) => addDays(d, direction));
      return;
    }
    if (view === "dia") {
      setSelectedDay((d) => addDays(d, direction));
      return;
    }
    if (view === "semana") {
      setSelectedDay((d) => addDays(d, direction * 7));
      return;
    }
    setSelectedDay((d) =>
      startOfMonth(new Date(d.getFullYear(), d.getMonth() + direction, 1)),
    );
  }

  function handleSelectDay(day: Date) {
    setSelectedDay(startOfDay(day));
    setLayoutMode("tabela");
  }

  const rangeTitle =
    layoutMode === "tabela"
      ? selectedDay.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : formatRangeLabel(view, selectedDay);

  return (
    <div>
      <PageHeader
        title="Agenda"
        description={
          isManager
            ? "Tabela do dia com os compromissos da equipe — alterne para o calendário completo quando quiser."
            : "Tabela do dia com seus compromissos — alterne para o calendário completo quando quiser."
        }
        actions={
          <Button onClick={() => openCreate()}>
            <Plus className="w-4 h-4 mr-1" />
            Novo
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>
            Hoje
          </Button>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate(-1)}
              aria-label="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate(1)}
              aria-label="Próximo"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <h2 className="text-base font-semibold capitalize min-w-0">
            {rangeTitle}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={layoutMode === "calendario" ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setLayoutMode((m) =>
                m === "tabela" ? "calendario" : "tabela",
              )
            }
          >
            {layoutMode === "tabela" ? (
              <>
                <CalendarRange className="w-4 h-4 mr-1.5" />
                Ver calendário
              </>
            ) : (
              <>
                <LayoutList className="w-4 h-4 mr-1.5" />
                Ver tabela do dia
              </>
            )}
          </Button>

          {layoutMode === "calendario" ? (
            <div className="inline-flex rounded-lg border p-0.5 bg-muted/40">
              {VIEW_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setView(opt.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    view === opt.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : null}

          {isManager && (
            <Select
              value={filterCorretorId}
              onValueChange={setFilterCorretorId}
            >
              <SelectTrigger className="w-[180px]">
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
            <SelectTrigger className="w-[140px]">
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
            <SelectTrigger className="w-[140px]">
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
      </div>

      {layoutMode === "tabela" ? (
        <AgendaDayTable
          day={selectedDay}
          items={items}
          loading={loading}
          showCorretor={isManager}
          onCreateAt={openCreate}
          onEdit={openEdit}
        />
      ) : (
        <AgendaBoard
          view={view}
          anchor={selectedDay}
          items={items}
          loading={loading}
          onSelectDay={handleSelectDay}
          onCreateAt={openCreate}
          onEdit={openEdit}
        />
      )}

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        icon={<CalendarDays className="w-5 h-5" />}
        title={
          formMode === "create" ? "Novo compromisso" : "Editar compromisso"
        }
        description="Vincule a um lead ou cliente e defina data e horário."
        footer={
          <FormDialogActions>
            {formMode === "edit" && editingId ? (
              <Button
                type="button"
                variant="destructive"
                className="mr-auto"
                onClick={() => setDeleteId(editingId)}
                disabled={saving}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Excluir
              </Button>
            ) : null}
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
            <FormSection
              title="Contato"
              icon={<User className="w-4 h-4 text-primary" />}
            >
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
                    onValueChange={(v) =>
                      setField("tipo", v as AgendamentoTipo)
                    }
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
