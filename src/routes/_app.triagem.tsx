import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
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
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { getSession } from "@/lib/auth";
import { canViewTeamData, isCorretorLike } from "@/lib/permissions";
import { ApiError } from "@/lib/api";
import type { Lead } from "@/lib/crm-types";
import { useLeads } from "@/lib/leads-store";
import { useCatalog } from "@/lib/catalog-store";
import {
  createTriagemEvent,
  updateTriagemEvent,
  type TriagemContact,
  type TriagemEvent,
  type TriagemOrigem,
} from "@/lib/triagem-api";
import {
  getTriagemHistoryCached,
  loadTriagemHistory,
  prependTriagemHistoryCached,
  replaceTriagemHistoryCached,
} from "@/lib/triagem-history-cache";
import { fetchEquipes, type Equipe } from "@/lib/equipes-api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ClipboardList,
  Clock,
  Pencil,
  Plus,
  Search,
  User,
  Users,
  FileText,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TriagemSearch = {
  leadId?: string;
  stage?: string;
};

export const Route = createFileRoute("/_app/triagem")({
  head: () => ({ meta: [{ title: "Triagem — Zone Connection" }] }),
  validateSearch: (search: Record<string, unknown>): TriagemSearch => ({
    leadId: typeof search.leadId === "string" ? search.leadId : undefined,
    stage: typeof search.stage === "string" ? search.stage : undefined,
  }),
  component: TriagemPage,
});

const MAX_TEXTO = 400;

function leadToContact(l: Lead): TriagemContact {
  return {
    id: l.id,
    tipo: l.tipo,
    nome: l.nome,
    telefone: l.telefone,
    email: l.email,
    stage: l.stage,
    prioridade: l.prioridade,
    interesse: l.interesse,
    cidade: l.cidade,
    bairro: l.bairro,
    corretorId: l.corretorId ?? null,
    corretor: l.corretorId ? { id: l.corretorId, name: l.corretor } : null,
    updatedAt: l.updatedAt,
  };
}

function TriagemPage() {
  const user = getSession();
  const isManager = user ? canViewTeamData(user.role) : false;

  if (!user) return null;
  if (isManager) return <ManagerTriagem />;
  return <CorretorTriagem />;
}

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

function HistoryTimeline({
  events,
  contactName,
  stageLabel,
  fallbackStage,
  loading,
  leadId,
  onEventUpdated,
}: {
  events: TriagemEvent[];
  contactName: string;
  stageLabel: (slug: string | null) => string;
  /** Etapa atual do lead — usada só em relatos antigos sem stage gravado. */
  fallbackStage?: string | null;
  loading?: boolean;
  leadId?: string | null;
  onEventUpdated?: (event: TriagemEvent) => void;
}) {
  const session = getSession();
  const canSeeOriginal =
    session?.role === "admin" || session?.role === "gerente";
  const canEditOwn =
    isCorretorLike(session?.role) && Boolean(session?.id);

  const [editEvent, setEditEvent] = useState<TriagemEvent | null>(null);
  const [editTexto, setEditTexto] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [expandedOriginalId, setExpandedOriginalId] = useState<string | null>(
    null,
  );

  function openEdit(ev: TriagemEvent) {
    setEditEvent(ev);
    setEditTexto(ev.texto);
  }

  async function submitEdit() {
    if (!editEvent) return;
    const texto = editTexto.trim();
    if (!texto) {
      toast.error("Informe o relato.");
      return;
    }
    if (texto.length > MAX_TEXTO) {
      toast.error(`O relato deve ter no máximo ${MAX_TEXTO} caracteres.`);
      return;
    }
    if (texto === editEvent.texto) {
      setEditEvent(null);
      return;
    }

    setEditSaving(true);
    try {
      const updated = await updateTriagemEvent(editEvent.id, texto);
      if (leadId) replaceTriagemHistoryCached(leadId, updated);
      onEventUpdated?.(updated);
      setEditEvent(null);
      toast.success("Relato atualizado.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível atualizar o relato.",
      );
    } finally {
      setEditSaving(false);
    }
  }

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando histórico...
      </div>
    );
  }
  if (events.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-10 border border-dashed rounded-xl">
        Nenhum relato registrado para este contato.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <ClipboardList className="w-4 h-4 text-primary" />
        Linha do tempo da triagem
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
          const isOwn =
            canEditOwn && session?.id != null && ev.autor.id === session.id;
          const showOriginal =
            canSeeOriginal &&
            Boolean(ev.textoAnterior) &&
            expandedOriginalId === ev.id;

          return (
            <li key={ev.id} className="relative flex gap-3 pb-6 last:pb-0">
              {/* Trilho vertical */}
              <div className="flex flex-col items-center w-5 shrink-0">
                <span className="relative z-10 mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <FileText className="h-2.5 w-2.5" />
                </span>
                {!isLast && (
                  <span
                    aria-hidden
                    className="mt-1 w-px flex-1 min-h-6 bg-border"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {formatWhen(ev.createdAt)}
                    {ev.editedAt ? (
                      <span className="ml-1.5">
                        · editado {formatWhen(ev.editedAt)}
                      </span>
                    ) : null}
                  </div>
                  {isOwn ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => openEdit(ev)}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      Editar
                    </Button>
                  ) : null}
                </div>

                <div
                  className={cn(
                    "rounded-xl border bg-card p-3.5 space-y-2.5 shadow-sm",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
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
                            className="text-[10px] font-medium bg-primary/10 text-primary border-primary/20"
                          >
                            {changedStage
                              ? stageName
                              : `Manteve ${stageName}`}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {ev.origem === "funil" ? "Funil" : "Manual"}
                        </Badge>
                        {ev.editedAt ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-medium bg-amber-500/15 text-amber-800 border-amber-500/25"
                          >
                            Editado
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-0 sm:pl-10.5">
                    {ev.texto}
                  </p>
                  {canSeeOriginal && ev.textoAnterior ? (
                    <div className="pl-0 sm:pl-10.5 space-y-2">
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() =>
                          setExpandedOriginalId((prev) =>
                            prev === ev.id ? null : ev.id,
                          )
                        }
                      >
                        {showOriginal ? "Ocultar original" : "Ver original"}
                      </Button>
                      {showOriginal ? (
                        <div className="rounded-lg border border-dashed bg-muted/30 p-2.5">
                          <p className="text-[11px] font-medium text-muted-foreground mb-1">
                            Texto anterior
                          </p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {ev.textoAnterior}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <Dialog
        open={Boolean(editEvent)}
        onOpenChange={(open) => {
          if (!open && !editSaving) setEditEvent(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar relato</DialogTitle>
            <DialogDescription>
              Altere o texto do seu relato. A etapa do funil não muda.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="triagem-edit-texto">Relato</Label>
              <span className="text-xs text-muted-foreground">
                {editTexto.length}/{MAX_TEXTO}
              </span>
            </div>
            <Textarea
              id="triagem-edit-texto"
              value={editTexto}
              maxLength={MAX_TEXTO}
              rows={4}
              disabled={editSaving}
              onChange={(e) => setEditTexto(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={editSaving}
              onClick={() => setEditEvent(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={editSaving || !editTexto.trim()}
              onClick={() => void submitEdit()}
            >
              {editSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Salvando…
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContactButton({
  contact,
  active,
  stageName,
  onClick,
}: {
  contact: TriagemContact;
  active: boolean;
  stageName: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-3 transition-colors ${
        active ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/50"
      }`}
    >
      <div className="text-sm font-medium truncate">{contact.nome}</div>
      <div className="text-xs text-muted-foreground mt-0.5 truncate">
        {contact.telefone} · {stageName}
      </div>
    </button>
  );
}

function useStageLabel() {
  const { funnelStages } = useCatalog();
  return useCallback(
    (slug: string | null) =>
      slug ? (funnelStages.find((s) => s.id === slug)?.name ?? slug) : "—",
    [funnelStages],
  );
}

function useHistory(leadId: string | null) {
  const [events, setEvents] = useState<TriagemEvent[]>(() =>
    leadId ? (getTriagemHistoryCached(leadId) ?? []) : [],
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!leadId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const cached = getTriagemHistoryCached(leadId);
    if (cached) {
      setEvents(cached);
      setLoading(false);
    } else {
      setEvents([]);
      setLoading(true);
    }

    let cancelled = false;
    void loadTriagemHistory(leadId, (next) => {
      if (!cancelled) {
        setEvents(next);
        setLoading(false);
      }
    }).catch((err) => {
      if (cancelled) return;
      setLoading(false);
      if (!cached) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar o histórico.",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [leadId]);

  return { events, setEvents, loading };
}

/* ───────────────────────── Corretor ───────────────────────── */

function CorretorTriagem() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const user = getSession();
  const { leads: allLeads, refresh } = useLeads();
  const { funnelStages } = useCatalog();
  const stageName = useStageLabel();

  const mine = useMemo(() => {
    if (!user) return [];
    return allLeads.filter(
      (l) => l.corretorId === user.id || l.corretor === user.name,
    );
  }, [allLeads, user]);

  const leads = useMemo(
    () => mine.filter((l) => l.tipo === "lead").map(leadToContact),
    [mine],
  );
  const clientes = useMemo(
    () => mine.filter((l) => l.tipo === "cliente").map(leadToContact),
    [mine],
  );

  const [selectedId, setSelectedId] = useState<string | null>(
    search.leadId ?? null,
  );
  const { events, setEvents, loading: historyLoading } = useHistory(selectedId);

  const [createOpen, setCreateOpen] = useState(Boolean(search.leadId));
  const [createOrigem, setCreateOrigem] = useState<TriagemOrigem>(
    search.leadId ? "funil" : "manual",
  );
  const [createLeadId, setCreateLeadId] = useState(search.leadId ?? "");
  const [createClienteId, setCreateClienteId] = useState("");
  const [createStage, setCreateStage] = useState<string>(
    search.stage ?? "__none__",
  );
  const [createTexto, setCreateTexto] = useState("");
  const [saving, setSaving] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>("__all__");
  /** Relato rápido no painel (sem avançar etapa). */
  const [quickTexto, setQuickTexto] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  const filteredLeads = useMemo(
    () =>
      stageFilter === "__all__"
        ? leads
        : leads.filter((c) => c.stage === stageFilter),
    [leads, stageFilter],
  );
  const filteredClientes = useMemo(
    () =>
      stageFilter === "__all__"
        ? clientes
        : clientes.filter((c) => c.stage === stageFilter),
    [clientes, stageFilter],
  );

  // Prefill vindo do funil (?leadId=&stage=) — listas já vêm do store em memória.
  useEffect(() => {
    if (!search.leadId) return;
    setSelectedId(search.leadId);
    setCreateLeadId(search.leadId);
    setCreateClienteId("");
    setCreateStage(search.stage ?? "__none__");
    setCreateOrigem("funil");
    setCreateTexto("");
    setCreateOpen(true);
  }, [search.leadId, search.stage]);

  function selectContact(id: string) {
    setSelectedId(id);
    setQuickTexto("");
  }

  function openCreateManual() {
    setCreateOrigem("manual");
    const selected = [...leads, ...clientes].find((c) => c.id === selectedId);
    if (selected?.tipo === "cliente") {
      setCreateLeadId("");
      setCreateClienteId(selected.id);
    } else if (selected) {
      setCreateLeadId(selected.id);
      setCreateClienteId("");
    } else {
      setCreateLeadId("");
      setCreateClienteId("");
    }
    setCreateStage("__none__");
    setCreateTexto("");
    setCreateOpen(true);
  }

  async function submitQuickRelato() {
    if (!selectedId) {
      toast.error("Selecione um lead ou cliente.");
      return;
    }
    const texto = quickTexto.trim();
    if (!texto) {
      toast.error("Informe o relato.");
      return;
    }
    if (texto.length > MAX_TEXTO) {
      toast.error(`O relato deve ter no máximo ${MAX_TEXTO} caracteres.`);
      return;
    }

    setQuickSaving(true);
    try {
      const created = await createTriagemEvent({
        leadId: selectedId,
        texto,
        origem: "manual",
      });
      prependTriagemHistoryCached(selectedId, created);
      setEvents((prev) => [
        created,
        ...prev.filter((e) => e.id !== created.id),
      ]);
      setQuickTexto("");
      toast.success("Relato registrado (etapa mantida).");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível registrar o relato.",
      );
    } finally {
      setQuickSaving(false);
    }
  }

  function closeCreate() {
    setCreateOpen(false);
    if (search.leadId || search.stage) {
      void navigate({ to: "/triagem", search: {}, replace: true });
    }
  }

  const selectedContact = useMemo(() => {
    const all = [...leads, ...clientes];
    return all.find((c) => c.id === selectedId) ?? null;
  }, [leads, clientes, selectedId]);

  async function submitCreate() {
    const leadId = createLeadId || createClienteId;
    if (!leadId) {
      toast.error("Selecione um lead ou um cliente.");
      return;
    }
    const texto = createTexto.trim();
    if (!texto) {
      toast.error("Informe o relato.");
      return;
    }
    if (texto.length > MAX_TEXTO) {
      toast.error(`O relato deve ter no máximo ${MAX_TEXTO} caracteres.`);
      return;
    }

    setSaving(true);
    try {
      const created = await createTriagemEvent({
        leadId,
        texto,
        origem: createOrigem,
        ...(createStage !== "__none__" ? { stage: createStage } : {}),
      });
      prependTriagemHistoryCached(leadId, created);
      setEvents((prev) => [
        created,
        ...prev.filter((e) => e.id !== created.id),
      ]);
      toast.success("Relato registrado na triagem.");
      closeCreate();
      setSelectedId(leadId);
      if (createStage !== "__none__") {
        void refresh({ silent: true });
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível registrar o relato.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0">
        <PageHeader
          title="Triagem"
          description="Registre relatos a qualquer momento — avançar a etapa do funil é opcional."
          actions={
            <Button size="sm" onClick={openCreateManual}>
              <Plus className="mr-1 h-4 w-4" />
              Criar triagem
            </Button>
          }
        />

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="w-full sm:w-55">
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Etapa do funil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as etapas</SelectItem>
                {funnelStages
                  .filter((s) => s.papel !== "perdido")
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {stageFilter !== "__all__" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStageFilter("__all__")}
            >
              Limpar filtro
            </Button>
          )}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-12 lg:overflow-hidden">
        <div className="flex min-h-0 flex-col gap-4 max-lg:min-h-80 lg:col-span-5">
          <Card className="flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden p-4">
            <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-primary">
              <Users className="h-4 w-4" />
              Leads
              <span className="text-xs font-normal text-muted-foreground">
                ({filteredLeads.length}
                {stageFilter !== "__all__" ? ` de ${leads.length}` : ""})
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {filteredLeads.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {stageFilter !== "__all__"
                    ? "Nenhum lead nesta etapa."
                    : "Nenhum lead."}
                </p>
              )}
              {filteredLeads.map((c) => (
                <ContactButton
                  key={c.id}
                  contact={c}
                  active={selectedId === c.id}
                  stageName={stageName(c.stage)}
                  onClick={() => selectContact(c.id)}
                />
              ))}
            </div>
          </Card>

          <Card className="flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden p-4">
            <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-primary">
              <User className="h-4 w-4" />
              Clientes
              <span className="text-xs font-normal text-muted-foreground">
                ({filteredClientes.length}
                {stageFilter !== "__all__" ? ` de ${clientes.length}` : ""})
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {filteredClientes.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {stageFilter !== "__all__"
                    ? "Nenhum cliente nesta etapa."
                    : "Nenhum cliente."}
                </p>
              )}
              {filteredClientes.map((c) => (
                <ContactButton
                  key={c.id}
                  contact={c}
                  active={selectedId === c.id}
                  stageName={stageName(c.stage)}
                  onClick={() => selectContact(c.id)}
                />
              ))}
            </div>
          </Card>
        </div>

        <Card className="flex min-h-0 flex-col overflow-hidden p-4 max-lg:min-h-80 lg:col-span-7">
          {!selectedContact ? (
            <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center text-primary">
              <ClipboardList className="h-8 w-8 opacity-50" />
              <p className="text-sm font-semibold">
                Selecione um lead ou cliente para ver o histórico.
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col gap-4">
              <div className="shrink-0">
                <div className="text-base font-semibold">
                  {selectedContact.nome}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {selectedContact.tipo === "cliente" ? "Cliente" : "Lead"} ·{" "}
                  {stageName(selectedContact.stage)}
                </div>
              </div>

              <div className="shrink-0 space-y-2 rounded-xl border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="triagem-quick-texto" className="text-sm">
                    Adicionar relato
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {quickTexto.length}/{MAX_TEXTO}
                  </span>
                </div>
                <Textarea
                  id="triagem-quick-texto"
                  value={quickTexto}
                  maxLength={MAX_TEXTO}
                  rows={3}
                  placeholder="Ex.: Cliente pediu retorno amanhã… (não altera a etapa)"
                  disabled={quickSaving}
                  onChange={(e) => setQuickTexto(e.target.value)}
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    Mantém a etapa atual ({stageName(selectedContact.stage)}).
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    disabled={quickSaving || !quickTexto.trim()}
                    onClick={() => void submitQuickRelato()}
                  >
                    {quickSaving ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-1 h-4 w-4" />
                    )}
                    Registrar
                  </Button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <HistoryTimeline
                  events={events}
                  contactName={selectedContact.nome}
                  stageLabel={stageName}
                  fallbackStage={selectedContact.stage}
                  loading={historyLoading}
                  leadId={selectedId}
                  onEventUpdated={(updated) =>
                    setEvents((prev) =>
                      prev.map((e) => (e.id === updated.id ? updated : e)),
                    )
                  }
                />
              </div>
            </div>
          )}
        </Card>
      </div>

      <FormDialogShell
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) closeCreate();
          else setCreateOpen(true);
        }}
        icon={<FileText className="w-5 h-5" />}
        title="Criar triagem"
        description={
          createOrigem === "funil"
            ? "Registre o histórico desta mudança de etapa no funil."
            : "Registre um relato. Deixe “Manter etapa atual” se não quiser avançar o funil."
        }
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={closeCreate}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void submitCreate()}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Registrar"}
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <FormSection title="Contato">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Lead</Label>
                <Select
                  value={createLeadId || "__none__"}
                  onValueChange={(v) => {
                    setCreateLeadId(v === "__none__" ? "" : v);
                    if (v !== "__none__") setCreateClienteId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {leads.map((l) => (
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
                  value={createClienteId || "__none__"}
                  onValueChange={(v) => {
                    setCreateClienteId(v === "__none__" ? "" : v);
                    if (v !== "__none__") setCreateLeadId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FormSection>

          <FormSection title="Etapa (opcional)">
            <div className="space-y-2">
              <Label>Avançar status</Label>
              <Select value={createStage} onValueChange={setCreateStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Manter etapa atual" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Manter etapa atual</SelectItem>
                  {funnelStages
                    .filter((s) => s.papel !== "perdido")
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {createStage === "__none__" ? (
                <p className="text-xs text-muted-foreground">
                  O lead permanece na etapa atual — só o histórico é registrado.
                </p>
              ) : createOrigem === "funil" ? (
                <p className="text-xs text-muted-foreground">
                  A etapa já foi atualizada no funil; o relato será vinculado a{" "}
                  {stageName(createStage)}.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Ao salvar, o lead será movido para {stageName(createStage)}.
                </p>
              )}
            </div>
          </FormSection>

          <FormSection title="Relato">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="triagem-texto">O que aconteceu?</Label>
                <span className="text-xs text-muted-foreground">
                  {createTexto.length}/{MAX_TEXTO}
                </span>
              </div>
              <Textarea
                id="triagem-texto"
                value={createTexto}
                maxLength={MAX_TEXTO}
                rows={5}
                placeholder="Descreva o acontecimento (máx. 400 caracteres)..."
                onChange={(e) => setCreateTexto(e.target.value)}
              />
            </div>
          </FormSection>
        </FormDialogBody>
      </FormDialogShell>
    </div>
  );
}

/* ───────────────────────── Admin / Gerente ───────────────────────── */

function ManagerTriagem() {
  const user = getSession();
  const isAdmin = user?.role === "admin";
  const canWrite = user?.role === "gerente";
  const { leads: allLeads, assignees, loading } = useLeads();
  const { funnelStages } = useCatalog();
  const stageName = useStageLabel();

  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [equipesLoading, setEquipesLoading] = useState(false);
  const [selectedEquipeId, setSelectedEquipeId] = useState<string>("__all__");
  const [corretorSearch, setCorretorSearch] = useState("");
  const [selectedCorretorId, setSelectedCorretorId] = useState<string | null>(
    null,
  );
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("__all__");
  const { events, setEvents, loading: historyLoading } =
    useHistory(selectedLeadId);
  const [quickTexto, setQuickTexto] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setEquipesLoading(true);
    void fetchEquipes()
      .then(setEquipes)
      .catch((err) => {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar as equipes.",
        );
      })
      .finally(() => setEquipesLoading(false));
  }, [isAdmin]);

  const allCorretores = useMemo(
    () => assignees.filter((a) => !a.role || isCorretorLike(a.role)),
    [assignees],
  );

  const corretorIdsNaEquipe = useMemo(() => {
    if (!isAdmin || selectedEquipeId === "__all__") return null;
    if (selectedEquipeId === "__none__") {
      const inAny = new Set(
        equipes.flatMap((eq) => eq.membros.map((m) => m.id)),
      );
      return new Set(
        allCorretores.filter((c) => !inAny.has(c.id)).map((c) => c.id),
      );
    }
    const eq = equipes.find((e) => e.id === selectedEquipeId);
    return new Set((eq?.membros ?? []).map((m) => m.id));
  }, [isAdmin, selectedEquipeId, equipes, allCorretores]);

  const corretores = useMemo(() => {
    const byEquipe = !corretorIdsNaEquipe
      ? allCorretores
      : allCorretores.filter((c) => corretorIdsNaEquipe.has(c.id));
    const q = corretorSearch.trim().toLocaleLowerCase("pt-BR");
    if (!q) return byEquipe;
    return byEquipe.filter((c) =>
      c.name.toLocaleLowerCase("pt-BR").includes(q),
    );
  }, [allCorretores, corretorIdsNaEquipe, corretorSearch]);

  const leads = useMemo(() => {
    if (!selectedCorretorId) return [];
    return allLeads
      .filter((l) => l.tipo === "lead" && l.corretorId === selectedCorretorId)
      .map(leadToContact);
  }, [allLeads, selectedCorretorId]);

  const filteredLeads = useMemo(
    () =>
      stageFilter === "__all__"
        ? leads
        : leads.filter((l) => l.stage === stageFilter),
    [leads, stageFilter],
  );

  const selectedLead = filteredLeads.find((l) => l.id === selectedLeadId) ??
    leads.find((l) => l.id === selectedLeadId) ??
    null;
  const selectedCorretor =
    allCorretores.find((c) => c.id === selectedCorretorId) ??
    corretores.find((c) => c.id === selectedCorretorId);

  function selectEquipe(id: string) {
    setSelectedEquipeId(id);
    setCorretorSearch("");
    setSelectedCorretorId(null);
    setSelectedLeadId(null);
    setStageFilter("__all__");
  }

  function selectCorretor(id: string) {
    if (selectedCorretorId === id) {
      setSelectedCorretorId(null);
      setSelectedLeadId(null);
      setStageFilter("__all__");
      setQuickTexto("");
      return;
    }
    setSelectedCorretorId(id);
    setSelectedLeadId(null);
    setStageFilter("__all__");
    setQuickTexto("");
  }

  async function submitQuickRelato() {
    if (!selectedLeadId) {
      toast.error("Selecione um lead.");
      return;
    }
    const texto = quickTexto.trim();
    if (!texto) {
      toast.error("Informe o relato.");
      return;
    }
    if (texto.length > MAX_TEXTO) {
      toast.error(`O relato deve ter no máximo ${MAX_TEXTO} caracteres.`);
      return;
    }

    setQuickSaving(true);
    try {
      const created = await createTriagemEvent({
        leadId: selectedLeadId,
        texto,
        origem: "manual",
      });
      prependTriagemHistoryCached(selectedLeadId, created);
      setEvents((prev) => [
        created,
        ...prev.filter((e) => e.id !== created.id),
      ]);
      setQuickTexto("");
      toast.success("Relato registrado (etapa mantida).");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível registrar o relato.",
      );
    } finally {
      setQuickSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0">
        <PageHeader
          title="Triagem"
          description={
            canWrite
              ? "Consulte e registre relatos dos leads da equipe — avançar etapa é opcional."
              : "Consulte os relatos dos corretores por lead. Somente leitura."
          }
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-12 lg:overflow-hidden">
        <Card className="flex min-h-0 flex-col space-y-3 overflow-hidden p-4 max-lg:min-h-80 lg:col-span-3">
          <div className="flex shrink-0 items-center gap-2.5 text-sm font-semibold text-primary">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Users className="h-4 w-4" />
            </span>
            Corretores
          </div>

          {isAdmin && (
            <div className="shrink-0 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Equipe</Label>
              <Select
                value={selectedEquipeId}
                onValueChange={selectEquipe}
                disabled={equipesLoading}
              >
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="Filtrar por equipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as equipes</SelectItem>
                  <SelectItem value="__none__">Sem equipe</SelectItem>
                  {equipes.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="relative shrink-0">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={corretorSearch}
              onChange={(e) => setCorretorSearch(e.target.value)}
              placeholder="Buscar corretor…"
              className="h-9 bg-background pl-8"
              aria-label="Buscar corretor pelo nome"
            />
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {(loading || equipesLoading) && corretores.length === 0 && (
              <p className="text-xs text-muted-foreground">Carregando...</p>
            )}
            {!loading && !equipesLoading && corretores.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {corretorSearch.trim()
                  ? "Nenhum corretor encontrado."
                  : isAdmin && selectedEquipeId !== "__all__"
                    ? "Nenhum corretor nesta equipe."
                    : "Nenhum corretor."}
              </p>
            )}
            {corretores.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectCorretor(c.id)}
                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors ${
                  selectedCorretorId === c.id
                    ? "border-primary bg-primary/5 font-medium"
                    : "bg-card hover:bg-muted/50"
                }`}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="avatar-fallback-brand text-[10px] font-semibold text-white">
                    {initials(c.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col space-y-3 overflow-hidden p-4 max-lg:min-h-80 lg:col-span-4">
          {!selectedCorretorId ? (
            <TriagemEmptyState
              title="Leads do corretor"
              icon={ClipboardList}
              heading="Selecione um corretor"
              description="Escolha um corretor na lista ao lado para visualizar os leads atribuídos a ele."
              illustration={<LeadsEmptyIllustration />}
            />
          ) : (
            <>
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 text-sm font-semibold text-primary">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <ClipboardList className="h-4 w-4" />
                  </span>
                  <span>
                    Leads de{" "}
                    <span className="font-bold text-primary">
                      {selectedCorretor?.name ?? "—"}
                    </span>
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({filteredLeads.length}
                      {stageFilter !== "__all__" ? ` de ${leads.length}` : ""})
                    </span>
                  </span>
                </div>
              </div>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="h-9 shrink-0 bg-background">
                  <SelectValue placeholder="Etapa do funil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as etapas</SelectItem>
                  {funnelStages
                    .filter((s) => s.papel !== "perdido")
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {filteredLeads.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {stageFilter !== "__all__"
                      ? "Nenhum lead nesta etapa."
                      : "Nenhum lead deste corretor."}
                  </p>
                )}
                {filteredLeads.map((l) => (
                  <ContactButton
                    key={l.id}
                    contact={l}
                    active={selectedLeadId === l.id}
                    stageName={stageName(l.stage)}
                    onClick={() => {
                      setSelectedLeadId(l.id);
                      setQuickTexto("");
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden p-4 max-lg:min-h-80 lg:col-span-5">
          {!selectedCorretorId ? (
            <TriagemEmptyState
              title="Histórico"
              icon={FileText}
              heading="O histórico aparece aqui"
              description="Após selecionar um corretor, o histórico de atividades será exibido neste espaço."
              illustration={<HistoryEmptyIllustration />}
            />
          ) : !selectedLead ? (
            <TriagemEmptyState
              title="Histórico"
              icon={FileText}
              heading="Selecione um lead para ver o histórico."
              description="Escolha um lead na lista ao lado para visualizar o histórico de atividades."
              illustration={<HistoryEmptyIllustration />}
            />
          ) : (
            <div className="flex h-full min-h-0 flex-col gap-4">
              <div className="shrink-0">
                <div className="text-base font-semibold">
                  {selectedLead.nome}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Lead · {stageName(selectedLead.stage)}
                </div>
              </div>

              {canWrite && (
                <div className="shrink-0 space-y-2 rounded-xl border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="triagem-gerente-quick-texto" className="text-sm">
                      Adicionar relato
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {quickTexto.length}/{MAX_TEXTO}
                    </span>
                  </div>
                  <Textarea
                    id="triagem-gerente-quick-texto"
                    value={quickTexto}
                    maxLength={MAX_TEXTO}
                    rows={3}
                    placeholder="Ex.: Alinhei retorno com o corretor… (não altera a etapa)"
                    disabled={quickSaving}
                    onChange={(e) => setQuickTexto(e.target.value)}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">
                      Mantém a etapa atual ({stageName(selectedLead.stage)}).
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      disabled={quickSaving || !quickTexto.trim()}
                      onClick={() => void submitQuickRelato()}
                    >
                      {quickSaving ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-1 h-4 w-4" />
                      )}
                      Registrar
                    </Button>
                  </div>
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto">
                <HistoryTimeline
                  events={events}
                  contactName={selectedLead.nome}
                  stageLabel={stageName}
                  fallbackStage={selectedLead.stage}
                  loading={historyLoading}
                  leadId={selectedLeadId}
                  onEventUpdated={(updated) =>
                    setEvents((prev) =>
                      prev.map((e) => (e.id === updated.id ? updated : e)),
                    )
                  }
                />
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function TriagemEmptyState({
  title,
  icon: Icon,
  heading,
  description,
  illustration,
}: {
  title: string;
  icon: LucideIcon;
  heading: string;
  description: string;
  illustration: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2.5 text-sm font-semibold text-primary">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-2 text-center">
        {illustration}
        <div className="max-w-68 space-y-1.5">
          <p className="text-sm font-semibold text-primary">{heading}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function LeadsEmptyIllustration() {
  return (
    <div
      aria-hidden
      className="relative flex w-30 flex-col items-center gap-2"
    >
      <div className="h-3.5 w-18 rounded-full bg-primary/15" />
      <div className="flex w-full items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-2.5 py-2.5 shadow-sm">
        <span className="h-7 w-7 shrink-0 rounded-lg bg-primary/25" />
        <span className="h-2.5 flex-1 rounded-full bg-primary" />
      </div>
      <div className="flex w-[90%] items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-2.5 py-2">
        <span className="h-6 w-6 shrink-0 rounded-lg bg-primary/20" />
        <span className="h-2 flex-1 rounded-full bg-primary/35" />
      </div>
      <div className="flex w-[80%] items-center gap-2 rounded-xl border border-primary/10 bg-primary/3 px-2.5 py-1.5">
        <span className="h-5 w-5 shrink-0 rounded-md bg-primary/15" />
        <span className="h-1.5 flex-1 rounded-full bg-primary/25" />
      </div>
    </div>
  );
}

function HistoryEmptyIllustration() {
  return (
    <div aria-hidden className="relative">
      <div className="flex h-24 w-19 flex-col gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-3.5 shadow-sm">
        <span className="h-1.5 w-full rounded-full bg-primary/35" />
        <span className="h-1.5 w-[85%] rounded-full bg-primary/25" />
        <span className="h-1.5 w-[70%] rounded-full bg-primary/20" />
        <span className="mt-1 h-1.5 w-full rounded-full bg-primary/15" />
        <span className="h-1.5 w-[60%] rounded-full bg-primary/15" />
      </div>
      <span className="absolute -bottom-1.5 -right-2.5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary text-white shadow-sm">
        <Clock className="h-4 w-4" />
      </span>
    </div>
  );
}
