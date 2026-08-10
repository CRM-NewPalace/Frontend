import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { fetchEquipes, type Equipe } from "@/lib/equipes-api";
import {
  AGENDAMENTO_ALVO_LABEL,
  AGENDAMENTO_ESCOPO_LABEL,
  AGENDAMENTO_ORIGEM_DOT,
  AGENDAMENTO_ORIGEM_LABEL,
  isAgendamentoAniversario,
  AGENDAMENTO_STATUS,
  AGENDAMENTO_STATUS_LABEL,
  AGENDAMENTO_TIPOS,
  AGENDAMENTO_TIPO_LABEL,
  aprovarAgendamento,
  createAgendamento,
  deleteAgendamento,
  fetchAgendamentos,
  fetchSolicitacoesAgenda,
  recusarAgendamento,
  updateAgendamento,
  type Agendamento,
  type AgendamentoAlvo,
  type AgendamentoEscopo,
  type AgendamentoStatus,
  type AgendamentoTipo,
  type CreateAgendamentoInput,
} from "@/lib/agenda-api";
import {
  CalendarDays,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  Inbox,
  LayoutList,
  Loader2,
  Network,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type LayoutMode = "tabela" | "calendario";
type AgendaSection = "agenda" | "solicitacoes";

export const Route = createFileRoute("/_app/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Zone Connection" }] }),
  component: AgendaPage,
});

type FormState = {
  leadId: string;
  clienteId: string;
  titulo: string;
  tipo: AgendamentoTipo;
  escopo: AgendamentoEscopo;
  status: AgendamentoStatus;
  alvoTipo: AgendamentoAlvo;
  alvoEquipeId: string;
  alvoGerenteId: string;
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
    tipo: "tarefa",
    escopo: "pessoal",
    status: "agendado",
    alvoTipo: "todos",
    alvoEquipeId: "",
    alvoGerenteId: "",
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
  const isPlatformAdmin = user?.role === "super_admin";
  const isManager = user ? canViewTeamData(user.role) : false;
  const isAdmin = user?.role === "admin" || isPlatformAdmin;
  const isGerente = user?.role === "gerente";
  /** Fila corretor→gerente: só gerente aprova e corretor acompanha. Admin não participa. */
  const showSolicitacoes = !isAdmin;
  const { leads, assignees, loading: leadsLoading } = useLeads();

  const [layoutMode, setLayoutMode] = useState<LayoutMode>(
    isPlatformAdmin ? "calendario" : "tabela",
  );
  const [section, setSection] = useState<AgendaSection>("agenda");
  const [view, setView] = useState<AgendaViewMode>("semana");
  const [selectedDay, setSelectedDay] = useState<Date>(() =>
    startOfDay(new Date()),
  );

  const [items, setItems] = useState<Agendamento[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [filterEquipeId, setFilterEquipeId] = useState("__all__");
  const [filterCorretorId, setFilterCorretorId] = useState("__all__");
  const [filterTipo, setFilterTipo] = useState<string>("__all__");
  const [filterStatus, setFilterStatus] = useState<string>("__all__");

  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

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
    if (filterEquipeId !== "__all__") {
      const eq = equipes.find((e) => e.id === filterEquipeId);
      if (eq) {
        const ids = new Set([eq.gerenteId, ...eq.membros.map((m) => m.id)]);
        return leads.filter((l) => l.corretorId && ids.has(l.corretorId));
      }
    }
    return leads;
  }, [leads, user, isManager, filterCorretorId, filterEquipeId, equipes]);

  const corretorFilterOptions = useMemo(() => {
    if (filterEquipeId === "__all__") return assignees;
    const eq = equipes.find((e) => e.id === filterEquipeId);
    if (!eq) return assignees;
    const ids = new Set([eq.gerenteId, ...eq.membros.map((m) => m.id)]);
    return assignees.filter((a) => ids.has(a.id));
  }, [assignees, equipes, filterEquipeId]);

  const gerenteOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const e of equipes) {
      if (e.gerente) map.set(e.gerente.id, e.gerente);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    );
  }, [equipes]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (isAdmin && filterEquipeId !== "__all__") n += 1;
    if (isManager && filterCorretorId !== "__all__") n += 1;
    if (filterTipo !== "__all__") n += 1;
    if (filterStatus !== "__all__") n += 1;
    return n;
  }, [
    isAdmin,
    isManager,
    filterEquipeId,
    filterCorretorId,
    filterTipo,
    filterStatus,
  ]);

  function clearAgendaFilters() {
    setFilterEquipeId("__all__");
    setFilterCorretorId("__all__");
    setFilterTipo("__all__");
    setFilterStatus("__all__");
  }

  const leadOptions = useMemo(
    () => visibleLeads.filter((l) => l.tipo === "lead"),
    [visibleLeads],
  );
  const clienteOptions = useMemo(
    () => visibleLeads.filter((l) => l.tipo === "cliente"),
    [visibleLeads],
  );

  useEffect(() => {
    if (!isAdmin) return;
    void fetchEquipes()
      .then((list) => setEquipes(list.filter((e) => e.status === "ativo")))
      .catch(() => setEquipes([]));
  }, [isAdmin]);

  useEffect(() => {
    if (!showSolicitacoes && section === "solicitacoes") {
      setSection("agenda");
    }
  }, [showSolicitacoes, section]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const [data, sols] = await Promise.all([
        fetchAgendamentos({
          from: visibleRange.from.toISOString(),
          to: visibleRange.to.toISOString(),
          equipeId:
            isAdmin && filterEquipeId !== "__all__"
              ? filterEquipeId
              : undefined,
          corretorId:
            isManager && filterCorretorId !== "__all__"
              ? filterCorretorId
              : undefined,
          tipo:
            filterTipo !== "__all__"
              ? (filterTipo as AgendamentoTipo)
              : undefined,
          status:
            filterStatus !== "__all__"
              ? (filterStatus as AgendamentoStatus)
              : undefined,
        }),
        showSolicitacoes ? fetchSolicitacoesAgenda() : Promise.resolve([]),
      ]);
      setItems(data);
      setSolicitacoes(sols);
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
    isAdmin,
    isManager,
    showSolicitacoes,
    filterEquipeId,
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
    setForm((prev) => ({
      ...prev,
      leadId: id,
      clienteId: "",
    }));
  }

  function selectCliente(id: string) {
    setForm((prev) => ({
      ...prev,
      clienteId: id,
      leadId: "",
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
    if (isAgendamentoAniversario(item)) {
      toast.message("Aniversário", {
        description: "Evento automático — somente leitura na agenda.",
      });
      return;
    }
    if (item.autor.role === "admin" && user?.role !== "admin") {
      toast.error(
        "Apenas administradores podem editar compromissos da equipe.",
      );
      return;
    }
    const start = new Date(item.startsAt);
    const end = item.endsAt ? new Date(item.endsAt) : null;
    setFormMode("edit");
    setEditingId(item.id);
    setForm({
      leadId: item.lead?.tipo === "lead" ? (item.leadId ?? "") : "",
      clienteId: item.lead?.tipo === "cliente" ? (item.leadId ?? "") : "",
      titulo: item.titulo,
      tipo: item.tipo,
      escopo: item.escopo,
      status: item.status,
      alvoTipo:
        item.alvoTipo && item.alvoTipo !== "nenhum" ? item.alvoTipo : "todos",
      alvoEquipeId: item.alvoEquipeId ?? "",
      alvoGerenteId: item.alvoGerenteId ?? "",
      date: toDateInput(start),
      timeStart: toTimeInput(start),
      timeEnd: end ? toTimeInput(end) : "",
      local: item.local ?? "",
      observacoes: item.observacoes ?? "",
    });
    setOpen(true);
  }

  function validateForm(): CreateAgendamentoInput | null {
    const isAdminEvent = user?.role === "admin";
    const leadId = isAdminEvent ? null : form.leadId || form.clienteId || null;

    if (!isAdminEvent && form.escopo === "com_gerente" && !leadId) {
      toast.error(
        "Selecione um lead ou cliente para compromissos com o gerente.",
      );
      return null;
    }
    if (isAdminEvent && form.alvoTipo === "equipe" && !form.alvoEquipeId) {
      toast.error("Selecione a equipe do evento.");
      return null;
    }
    if (isAdminEvent && form.alvoTipo === "gerente" && !form.alvoGerenteId) {
      toast.error("Selecione o gerente do evento.");
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
      escopo: isAdminEvent ? "pessoal" : form.escopo,
      ...(isAdminEvent
        ? {
            alvoTipo: form.alvoTipo === "nenhum" ? "todos" : form.alvoTipo,
            alvoEquipeId:
              form.alvoTipo === "equipe" ? form.alvoEquipeId || null : null,
            alvoGerenteId:
              form.alvoTipo === "gerente" ? form.alvoGerenteId || null : null,
          }
        : {}),
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
        const created = await createAgendamento(payload);
        if (created.solicitacaoStatus === "pendente") {
          toast.success("Solicitação enviada ao gerente.");
          setSection("solicitacoes");
        } else {
          toast.success(
            user?.role === "admin"
              ? form.alvoTipo === "gerente"
                ? "Evento agendado para o gerente."
                : form.alvoTipo === "gerentes"
                  ? "Evento agendado para todos os gerentes."
                  : form.alvoTipo === "equipe"
                    ? "Evento agendado para a equipe."
                    : "Evento agendado para todas as equipes."
              : payload.escopo === "pessoal"
                ? "Tarefa agendada."
                : "Compromisso criado.",
          );
        }
      } else if (editingId) {
        // PATCH não aceita leadId (vínculo fixo); enviar gera 400 Bad Request.
        const { leadId: _leadId, ...updateFields } = payload;
        await updateAgendamento(editingId, {
          ...updateFields,
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

  async function handleAprovar(id: string) {
    setActingId(id);
    try {
      await aprovarAgendamento(id);
      toast.success("Solicitação aprovada.");
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível aprovar.",
      );
    } finally {
      setActingId(null);
    }
  }

  async function handleRecusar(id: string) {
    const motivo = window.prompt("Motivo da recusa (opcional):") ?? undefined;
    setActingId(id);
    try {
      await recusarAgendamento(id, motivo || undefined);
      toast.success("Solicitação recusada.");
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível recusar.",
      );
    } finally {
      setActingId(null);
    }
  }

  async function handleComplete(item: Agendamento) {
    if (isAgendamentoAniversario(item)) return;
    if (item.status !== "agendado") return;
    setCompletingId(item.id);
    try {
      await updateAgendamento(item.id, { status: "concluido" });
      toast.success("Tarefa concluída.");
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível concluir a tarefa.",
      );
    } finally {
      setCompletingId(null);
    }
  }

  async function handleCancelStatus(item: Agendamento) {
    if (isAgendamentoAniversario(item)) return;
    if (item.status !== "agendado") return;
    setCancelingId(item.id);
    try {
      await updateAgendamento(item.id, { status: "cancelado" });
      toast.success("Compromisso cancelado.");
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível cancelar o compromisso.",
      );
    } finally {
      setCancelingId(null);
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
          section === "solicitacoes"
            ? isGerente
              ? "Pedidos de visita/reunião dos corretores aguardando sua aprovação."
              : "Pedidos enviados ao gerente — acompanhe aqui sem misturar com sua agenda do dia."
            : isManager
              ? "Tabela do dia com os compromissos da equipe — alterne para o calendário completo quando quiser."
              : "Tabela do dia com seus compromissos — alterne para o calendário completo quando quiser."
        }
        actions={
          section === "agenda" ? (
            <Button onClick={() => openCreate()}>
              <Plus className="w-4 h-4 mr-1" />
              Novo
            </Button>
          ) : null
        }
      />

      <div className="mb-4 inline-flex rounded-lg border p-0.5 bg-muted/40">
        <button
          type="button"
          onClick={() => setSection("agenda")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            section === "agenda"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <CalendarDays className="w-4 h-4" />
          Agenda
        </button>
        {showSolicitacoes ? (
          <button
            type="button"
            onClick={() => setSection("solicitacoes")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              section === "solicitacoes"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Inbox className="w-4 h-4" />
            Solicitações
            {solicitacoes.length > 0 ? (
              <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-amber-500 hover:bg-amber-500">
                {solicitacoes.length > 9 ? "9+" : solicitacoes.length}
              </Badge>
            ) : null}
          </button>
        ) : null}
      </div>

      {section === "solicitacoes" ? (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="border-b px-4 py-3 bg-muted/20">
            <h3 className="text-sm font-semibold">
              {isGerente ? "Aguardando sua aprovação" : "Aguardando o gerente"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isGerente
                ? "Visitas e reuniões pedidas pelos corretores da equipe."
                : "Compromissos com o gerente que você enviou e ainda não foram respondidos."}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando…
            </div>
          ) : solicitacoes.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground px-4">
              <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Nenhuma solicitação pendente no momento.
            </div>
          ) : (
            <ul className="divide-y">
              {solicitacoes.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-sm truncate">{s.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.startsAt).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                      {" · "}
                      {s.lead?.nome ?? "Sem contato"}
                      {isGerente ? ` · ${s.autor.name}` : null}
                      {" · "}
                      {AGENDAMENTO_TIPO_LABEL[s.tipo]}
                    </p>
                  </div>
                  {isGerente ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actingId === s.id}
                        onClick={() => void handleRecusar(s.id)}
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Recusar
                      </Button>
                      <Button
                        size="sm"
                        disabled={actingId === s.id}
                        onClick={() => void handleAprovar(s.id)}
                      >
                        {actingId === s.id ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5 mr-1" />
                        )}
                        Aprovar
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="secondary">Aguardando</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
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

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      activeFiltersCount > 0 && "border-primary text-primary",
                    )}
                  >
                    <Filter className="w-4 h-4 mr-1.5" />
                    Filtros
                    {activeFiltersCount > 0 ? (
                      <Badge className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px]">
                        {activeFiltersCount}
                      </Badge>
                    ) : null}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Filtros</p>
                    {activeFiltersCount > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={clearAgendaFilters}
                      >
                        Limpar
                      </Button>
                    ) : null}
                  </div>

                  {isAdmin && equipes.length > 0 ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Equipe
                      </Label>
                      <Select
                        value={filterEquipeId}
                        onValueChange={(v) => {
                          setFilterEquipeId(v);
                          setFilterCorretorId("__all__");
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Equipe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">
                            Todas as equipes
                          </SelectItem>
                          {equipes.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  {isManager ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Corretor
                      </Label>
                      <Select
                        value={filterCorretorId}
                        onValueChange={setFilterCorretorId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Corretor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">
                            Todos os corretores
                          </SelectItem>
                          {corretorFilterOptions.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Tipo
                    </Label>
                    <Select value={filterTipo} onValueChange={setFilterTipo}>
                      <SelectTrigger className="w-full">
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
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Status
                    </Label>
                    <Select
                      value={filterStatus}
                      onValueChange={setFilterStatus}
                    >
                      <SelectTrigger className="w-full">
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
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">Cores:</span>
            {(["admin", "gerente", "corretor"] as const).map((origem) => (
              <span key={origem} className="inline-flex items-center gap-1.5">
                <span
                  className={cn(
                    "size-2.5 rounded-full",
                    AGENDAMENTO_ORIGEM_DOT[origem],
                  )}
                />
                {AGENDAMENTO_ORIGEM_LABEL[origem]}
              </span>
            ))}
          </div>

          {layoutMode === "tabela" ? (
            <AgendaDayTable
              day={selectedDay}
              items={items}
              loading={loading}
              showCorretor={isManager}
              currentUserRole={user?.role}
              completingId={completingId}
              cancelingId={cancelingId}
              onCreateAt={openCreate}
              onEdit={openEdit}
              onComplete={(item) => void handleComplete(item)}
              onCancel={(item) => void handleCancelStatus(item)}
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
        </>
      )}

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        icon={<CalendarDays className="w-5 h-5" />}
        title={
          formMode === "create" ? "Novo compromisso" : "Editar compromisso"
        }
        description="Defina data e horário. Lead/cliente é opcional em tarefas pessoais."
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
        <form
          id="agenda-form"
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <FormDialogBody className="overflow-y-scroll">
            {isAdmin ? (
              <FormSection
                title="Público do evento"
                icon={<Network className="w-4 h-4 text-primary" />}
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Quem deve ver</Label>
                    <Select
                      value={form.alvoTipo}
                      onValueChange={(v) => {
                        const alvo = v as AgendamentoAlvo;
                        setForm((prev) => ({
                          ...prev,
                          alvoTipo: alvo,
                          alvoEquipeId:
                            alvo === "equipe" ? prev.alvoEquipeId : "",
                          alvoGerenteId:
                            alvo === "gerente" ? prev.alvoGerenteId : "",
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">
                          {AGENDAMENTO_ALVO_LABEL.todos}
                        </SelectItem>
                        <SelectItem value="equipe">
                          {AGENDAMENTO_ALVO_LABEL.equipe}
                        </SelectItem>
                        <SelectItem value="gerentes">
                          {AGENDAMENTO_ALVO_LABEL.gerentes}
                        </SelectItem>
                        <SelectItem value="gerente">
                          {AGENDAMENTO_ALVO_LABEL.gerente}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      {form.alvoTipo === "gerente"
                        ? "Somente o gerente escolhido verá este evento (corretores não)."
                        : form.alvoTipo === "gerentes"
                          ? "Todos os gerentes verão este evento (corretores não)."
                          : form.alvoTipo === "equipe"
                            ? "Gerente e corretores da equipe escolhida verão este evento."
                            : "Todos os usuários verão este evento na agenda."}
                    </p>
                  </div>

                  {form.alvoTipo === "equipe" ? (
                    <div className="space-y-2">
                      <Label>Equipe</Label>
                      <Select
                        value={form.alvoEquipeId || "__none__"}
                        onValueChange={(v) =>
                          setField("alvoEquipeId", v === "__none__" ? "" : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar equipe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          {equipes.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  {form.alvoTipo === "gerente" ? (
                    <div className="space-y-2">
                      <Label>Gerente</Label>
                      <Select
                        value={form.alvoGerenteId || "__none__"}
                        onValueChange={(v) =>
                          setField("alvoGerenteId", v === "__none__" ? "" : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar gerente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          {gerenteOptions.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </div>
              </FormSection>
            ) : (
              <FormSection
                title="Contato (opcional)"
                icon={<User className="w-4 h-4 text-primary" />}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Lead</Label>
                    <Select
                      value={form.leadId || "__none__"}
                      onValueChange={(v) =>
                        v === "__none__"
                          ? setField("leadId", "")
                          : selectLead(v)
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
            )}

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

              <div
                className={cn("grid gap-4", isAdmin ? "" : "sm:grid-cols-2")}
              >
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={form.tipo}
                    onValueChange={(v) => {
                      const tipo = v as AgendamentoTipo;
                      setForm((prev) => ({
                        ...prev,
                        tipo,
                        escopo: isAdmin
                          ? prev.escopo
                          : tipo === "visita" || tipo === "reuniao"
                            ? "com_gerente"
                            : prev.escopo === "com_gerente" &&
                                (tipo === "tarefa" || tipo === "ligacao")
                              ? "pessoal"
                              : prev.escopo,
                      }));
                    }}
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
                {!isAdmin ? (
                  <div className="space-y-2">
                    <Label>Participação</Label>
                    <Select
                      value={form.escopo}
                      onValueChange={(v) =>
                        setField("escopo", v as AgendamentoEscopo)
                      }
                      disabled={formMode === "edit"}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pessoal">
                          {AGENDAMENTO_ESCOPO_LABEL.pessoal}
                        </SelectItem>
                        <SelectItem value="com_gerente">
                          {AGENDAMENTO_ESCOPO_LABEL.com_gerente}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      {form.escopo === "com_gerente"
                        ? user?.role === "corretor"
                          ? "Será enviada solicitação ao gerente para aprovar."
                          : "Compromisso com participação do gerente."
                        : "Tarefa só sua — sem aprovação (ex.: ligar para o cliente)."}
                    </p>
                  </div>
                ) : null}
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
