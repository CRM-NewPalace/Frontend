import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type AgendaEvento } from "@/lib/mock-data";
import { getSession } from "@/lib/mock-auth";
import { canViewTeamData } from "@/lib/permissions";
import { useAgenda } from "@/lib/agenda-store";
import { useLeads } from "@/lib/leads-store";
import { useCorretores } from "@/lib/corretores-store";
import { Plus, Calendar as CalendarIcon, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Imob CRM" }] }),
  component: Agenda,
});

const HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
const DAYS = [
  { label: "Seg 21", dia: "Hoje" },
  { label: "Ter 22", dia: "Amanhã" },
  { label: "Qua 23", dia: "Qua 23" },
  { label: "Qui 24", dia: "Qui 24" },
  { label: "Sex 25", dia: "Sex 25" },
  { label: "Sáb 26", dia: "Sáb 26" },
  { label: "Dom 27", dia: "Dom 27" },
] as const;

const TIPOS: AgendaEvento["tipo"][] = ["Visita", "Reunião", "Ligação", "Assinatura"];
const DIAS_FORM = ["Hoje", "Amanhã", "Qua 23", "Qui 24", "Sex 25", "Sáb 26", "Dom 27"];

type FormState = {
  titulo: string;
  tipo: AgendaEvento["tipo"];
  hora: string;
  dia: string;
  lead: string;
  corretor: string;
};

function emptyForm(corretor: string, lead: string): FormState {
  return {
    titulo: "",
    tipo: "Visita",
    hora: "10:00",
    dia: "Hoje",
    lead,
    corretor,
  };
}

function eventStyle(tipo: AgendaEvento["tipo"]) {
  if (tipo === "Visita") return "bg-primary/10 text-primary border border-primary/20";
  if (tipo === "Reunião") return "bg-info/10 text-info border border-info/20";
  if (tipo === "Assinatura") return "bg-success/10 text-success border border-success/20";
  return "bg-warning/10 text-warning-foreground border border-warning/20";
}

function Agenda() {
  const user = getSession();
  const canSeeTeam = user ? canViewTeamData(user.role) : false;
  const isCorretor = !canSeeTeam;
  const defaultCorretor = isCorretor && user ? user.name : "Marina Alves";

  const { events, addEvent, updateEvent, deleteEvent } = useAgenda();
  const { leads } = useLeads();
  const { corretores } = useCorretores();
  const leadOptions = isCorretor && user
    ? leads.filter((l) => l.corretor === user.name)
    : leads;

  const meusEventos = useMemo(
    () => (isCorretor && user ? events.filter((e) => e.corretor === user.name) : events),
    [events, isCorretor, user],
  );

  const [view, setView] = useState<"dia" | "semana" | "mes">("semana");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() =>
    emptyForm(defaultCorretor, leadOptions[0]?.nome ?? ""),
  );
  const [deleteTarget, setDeleteTarget] = useState<AgendaEvento | null>(null);

  const visibleDays = view === "dia" ? DAYS.slice(0, 1) : DAYS;

  function openCreate(prefill?: Partial<FormState>) {
    setEditingId(null);
    setForm({
      ...emptyForm(defaultCorretor, leadOptions[0]?.nome ?? ""),
      ...prefill,
    });
    setOpen(true);
  }

  function openEdit(ev: AgendaEvento) {
    setEditingId(ev.id);
    setForm({
      titulo: ev.titulo,
      tipo: ev.tipo,
      hora: ev.hora,
      dia: ev.dia,
      lead: ev.lead,
      corretor: ev.corretor,
    });
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const titulo = form.titulo.trim();
    if (!titulo) {
      toast.error("Informe o título do evento.");
      return;
    }

    const payload = {
      titulo,
      tipo: form.tipo,
      hora: form.hora,
      dia: form.dia,
      lead: form.lead.trim() || "—",
      corretor: isCorretor ? defaultCorretor : form.corretor,
    };

    if (editingId) {
      updateEvent(editingId, payload);
      toast.success("Evento atualizado.");
    } else {
      addEvent({ id: `A${Date.now()}`, ...payload });
      toast.success("Evento adicionado à agenda.");
    }
    setOpen(false);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteEvent(deleteTarget.id);
    toast.success(`Evento "${deleteTarget.titulo}" removido.`);
    setDeleteTarget(null);
  }

  const proximos = [...meusEventos].sort((a, b) => {
    const diaOrder = DIAS_FORM.indexOf(a.dia) - DIAS_FORM.indexOf(b.dia);
    if (diaOrder !== 0) return diaOrder;
    return a.hora.localeCompare(b.hora);
  });

  return (
    <div>
      <PageHeader
        title="Agenda"
        description={
          isCorretor
            ? "Seus compromissos: visitas, reuniões e ligações."
            : "Visitas, reuniões e ligações de todos os corretores."
        }
        actions={
          <>
            <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
              <TabsList>
                <TabsTrigger value="dia">Dia</TabsTrigger>
                <TabsTrigger value="semana">Semana</TabsTrigger>
                <TabsTrigger value="mes">Mês</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button size="sm" onClick={() => openCreate()}>
              <Plus className="w-4 h-4 mr-1" />Novo evento
            </Button>
          </>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-primary/10 via-background to-background">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div className="space-y-1 pr-6">
                <DialogTitle className="text-lg tracking-tight">
                  {editingId ? "Editar evento" : "Novo evento"}
                </DialogTitle>
                <DialogDescription>
                  {editingId ? "Atualize os dados do compromisso." : "Agende uma visita, reunião ou ligação."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ev-titulo" className="text-xs text-muted-foreground">Título</Label>
              <Input
                id="ev-titulo"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex.: Visita — Apto Boa Viagem"
                className="h-10"
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <div className="grid grid-cols-2 gap-2">
                {TIPOS.map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, tipo }))}
                    className={cn(
                      "h-9 rounded-lg border text-sm font-medium transition-colors",
                      form.tipo === tipo
                        ? "border-primary bg-primary/10 text-primary"
                        : "bg-background text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Dia</Label>
                <Select value={form.dia} onValueChange={(v) => setForm((f) => ({ ...f, dia: v }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIAS_FORM.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Horário</Label>
                <Select value={form.hora} onValueChange={(v) => setForm((f) => ({ ...f, hora: v }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Lead</Label>
              {leadOptions.length > 0 ? (
                <Select value={form.lead || leadOptions[0].nome} onValueChange={(v) => setForm((f) => ({ ...f, lead: v }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {leadOptions.map((l) => (
                      <SelectItem key={l.id} value={l.nome}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.lead}
                  onChange={(e) => setForm((f) => ({ ...f, lead: e.target.value }))}
                  placeholder="Nome do lead"
                  className="h-10"
                />
              )}
            </div>
            {!isCorretor && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Corretor</Label>
                <Select value={form.corretor} onValueChange={(v) => setForm((f) => ({ ...f, corretor: v }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {corretores.filter((c) => c.status === "Ativo").map((c) => (
                      <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingId ? "Salvar" : "Adicionar evento"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `Remover "${deleteTarget.titulo}" da agenda?` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {view === "dia" ? "Segunda, 21 de Julho, 2026" : "21 – 27 de Julho, 2026"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <div
              className="grid min-w-[900px] border-t"
              style={{ gridTemplateColumns: `64px repeat(${visibleDays.length}, minmax(0, 1fr))` }}
            >
              <div className="border-r bg-muted/40" />
              {visibleDays.map((d) => (
                <div key={d.label} className="text-center text-xs font-medium py-2 border-r border-b bg-muted/40">
                  {d.label}
                </div>
              ))}
              {HOURS.map((h) => (
                <div key={h} className="contents">
                  <div className="text-xs text-muted-foreground p-2 border-r border-b">{h}</div>
                  {visibleDays.map((d) => {
                    const cellEvents = meusEventos.filter((a) => a.hora === h && a.dia === d.dia);
                    return (
                      <div
                        key={d.label + h}
                        className="border-r border-b h-16 p-1 hover:bg-muted/30 cursor-pointer"
                        onClick={() => openCreate({ hora: h, dia: d.dia })}
                        title="Clique para novo evento"
                      >
                        <div className="space-y-0.5 h-full overflow-hidden">
                          {cellEvents.map((ev) => (
                            <button
                              key={ev.id}
                              type="button"
                              className={`rounded-md p-1 text-[11px] leading-tight w-full text-left ${eventStyle(ev.tipo)}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(ev);
                              }}
                            >
                              <div className="font-medium truncate">{ev.titulo}</div>
                              <div className="opacity-80 truncate">{ev.corretor}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            {view === "mes" && (
              <p className="text-xs text-muted-foreground px-4 py-3 border-t">
                Visualização mensal resumida — use Semana para o grid completo.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Próximos eventos</CardTitle>
            <Button size="sm" variant="outline" onClick={() => openCreate()}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {proximos.map((a) => (
              <div key={a.id} className="flex gap-3 pb-3 border-b last:border-0 last:pb-0 group">
                <div className="w-12 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase">{a.dia}</div>
                  <div className="text-sm font-semibold">{a.hora}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.titulo}</div>
                  <div className="text-xs text-muted-foreground">{a.corretor} · {a.lead}</div>
                  <Badge variant="outline" className="mt-1 text-[10px]">{a.tipo}</Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(a)}>
                      <Pencil className="w-4 h-4 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(a)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            {proximos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento na sua agenda.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
