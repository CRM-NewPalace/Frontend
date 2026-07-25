import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FormDialogActions, FormDialogBody, FormDialogShell, FormSection,
} from "@/components/form-dialog";
import { getSession } from "@/lib/auth";
import { canViewTeamData } from "@/lib/permissions";
import { ApiError } from "@/lib/api";
import type { Lead } from "@/lib/crm-types";
import { useLeads } from "@/lib/leads-store";
import { useCatalog } from "@/lib/catalog-store";
import {
  createTriagemEvent,
  type TriagemContact,
  type TriagemEvent,
  type TriagemOrigem,
} from "@/lib/triagem-api";
import {
  getTriagemHistoryCached,
  loadTriagemHistory,
  prependTriagemHistoryCached,
} from "@/lib/triagem-history-cache";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ClipboardList, Plus, User, Users, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TriagemSearch = {
  leadId?: string;
  stage?: string;
};

export const Route = createFileRoute("/_app/triagem")({
  head: () => ({ meta: [{ title: "Triagem — Imob CRM" }] }),
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
    corretor: l.corretorId
      ? { id: l.corretorId, name: l.corretor }
      : null,
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
  loading,
}: {
  events: TriagemEvent[];
  contactName: string;
  stageLabel: (slug: string | null) => string;
  loading?: boolean;
}) {
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
          const stageBadge = ev.stageNovo
            ? stageLabel(ev.stageNovo)
            : ev.stageAnterior
              ? stageLabel(ev.stageAnterior)
              : null;
          const isLast = index === events.length - 1;

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
                    className="mt-1 w-px flex-1 min-h-[1.5rem] bg-border"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="text-xs text-muted-foreground tabular-nums">
                  {formatWhen(ev.createdAt)}
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
                        {" atualizou a triagem de "}
                        <span className="font-semibold">{contactName}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {stageBadge && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-medium bg-primary/10 text-primary border-primary/20"
                          >
                            {stageBadge}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {ev.origem === "funil" ? "Funil" : "Manual"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-0 sm:pl-[2.625rem]">
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
        active
          ? "border-primary bg-primary/5"
          : "bg-card hover:bg-muted/50"
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
  const { leads: allLeads, loading: leadsLoading, refresh } = useLeads();
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
  }

  function openCreateManual() {
    setCreateOrigem("manual");
    setCreateLeadId("");
    setCreateClienteId("");
    setCreateStage("__none__");
    setCreateTexto("");
    setCreateOpen(true);
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
      setEvents((prev) => [created, ...prev.filter((e) => e.id !== created.id)]);
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

  const emptyLists = !leadsLoading && leads.length === 0 && clientes.length === 0;

  return (
    <div>
      <PageHeader
        title="Triagem"
        description="Seus leads e clientes — registre o histórico dos acontecimentos."
        actions={
          <Button size="sm" onClick={openCreateManual}>
            <Plus className="w-4 h-4 mr-1" />
            Criar triagem
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="w-4 h-4 text-primary" />
              Leads
              <span className="text-xs text-muted-foreground font-normal">
                ({leads.length})
              </span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {emptyLists && (
                <p className="text-xs text-muted-foreground">Nenhum lead.</p>
              )}
              {leads.map((c) => (
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

          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="w-4 h-4 text-violet-600" />
              Clientes
              <span className="text-xs text-muted-foreground font-normal">
                ({clientes.length})
              </span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {emptyLists && (
                <p className="text-xs text-muted-foreground">Nenhum cliente.</p>
              )}
              {clientes.map((c) => (
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

        <Card className="lg:col-span-7 p-4 min-h-[28rem]">
          {!selectedContact ? (
            <div className="h-full min-h-[24rem] flex flex-col items-center justify-center text-center text-muted-foreground border border-dashed rounded-xl gap-2">
              <ClipboardList className="w-8 h-8 opacity-40" />
              <p className="text-sm">Selecione um lead ou cliente para ver o histórico.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-base font-semibold">{selectedContact.nome}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {selectedContact.tipo === "cliente" ? "Cliente" : "Lead"} ·{" "}
                  {stageName(selectedContact.stage)}
                </div>
              </div>
              <HistoryTimeline
                events={events}
                contactName={selectedContact.nome}
                stageLabel={stageName}
                loading={historyLoading}
              />
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
            : "Registre um acontecimento sobre um lead ou cliente."
        }
        footer={
          <FormDialogActions>
            <Button type="button" variant="outline" onClick={closeCreate} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void submitCreate()} disabled={saving}>
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
                    .filter((s) => s.id !== "perdido")
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {createOrigem === "funil" && createStage !== "__none__" && (
                <p className="text-xs text-muted-foreground">
                  A etapa já foi atualizada no funil; o relato será vinculado a{" "}
                  {stageName(createStage)}.
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
  const { leads: allLeads, assignees, loading } = useLeads();
  const stageName = useStageLabel();

  const corretores = useMemo(
    () => assignees.filter((a) => !a.role || a.role === "corretor"),
    [assignees],
  );

  const [selectedCorretorId, setSelectedCorretorId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const { events, loading: historyLoading } = useHistory(selectedLeadId);

  const leads = useMemo(() => {
    if (!selectedCorretorId) return [];
    return allLeads
      .filter(
        (l) => l.tipo === "lead" && l.corretorId === selectedCorretorId,
      )
      .map(leadToContact);
  }, [allLeads, selectedCorretorId]);

  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? null;
  const selectedCorretor = corretores.find((c) => c.id === selectedCorretorId);

  function selectCorretor(id: string) {
    setSelectedCorretorId(id);
    setSelectedLeadId(null);
  }

  return (
    <div>
      <PageHeader
        title="Triagem"
        description="Consulte os relatos dos corretores por lead. Somente leitura."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-3 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="w-4 h-4 text-primary" />
            Corretores
          </div>
          <div className="space-y-2 max-h-[32rem] overflow-y-auto">
            {loading && corretores.length === 0 && (
              <p className="text-xs text-muted-foreground">Carregando...</p>
            )}
            {!loading && corretores.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum corretor.</p>
            )}
            {corretores.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectCorretor(c.id)}
                className={`w-full text-left rounded-lg border p-3 text-sm transition-colors ${
                  selectedCorretorId === c.id
                    ? "border-primary bg-primary/5 font-medium"
                    : "bg-card hover:bg-muted/50"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-4 p-4 min-h-[28rem] space-y-3">
          {!selectedCorretorId ? (
            <div className="h-full min-h-[24rem] flex flex-col items-center justify-center text-center text-muted-foreground border border-dashed rounded-xl gap-2">
              <ClipboardList className="w-8 h-8 opacity-40" />
              <p className="text-sm">Selecione um corretor para ver os leads.</p>
            </div>
          ) : (
            <>
              <div className="text-sm font-medium">
                Leads de {selectedCorretor?.name ?? "—"}
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  ({leads.length})
                </span>
              </div>
              <div className="space-y-2 max-h-[28rem] overflow-y-auto">
                {leads.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum lead deste corretor.</p>
                )}
                {leads.map((l) => (
                  <ContactButton
                    key={l.id}
                    contact={l}
                    active={selectedLeadId === l.id}
                    stageName={stageName(l.stage)}
                    onClick={() => setSelectedLeadId(l.id)}
                  />
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="lg:col-span-5 p-4 min-h-[28rem]">
          {!selectedLead ? (
            <div className="h-full min-h-[24rem] flex flex-col items-center justify-center text-center text-muted-foreground border border-dashed rounded-xl gap-2">
              <FileText className="w-8 h-8 opacity-40" />
              <p className="text-sm">
                {selectedCorretorId
                  ? "Selecione um lead para ver o histórico."
                  : "O histórico aparece aqui."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-base font-semibold">{selectedLead.nome}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Lead · {stageName(selectedLead.stage)}
                </div>
              </div>
              <HistoryTimeline
                events={events}
                contactName={selectedLead.nome}
                stageLabel={stageName}
                loading={historyLoading}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
