import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FormDialogActions, FormDialogBody, FormDialogShell, FormSection,
} from "@/components/form-dialog";
import { getSession } from "@/lib/mock-auth";
import { canViewTeamData } from "@/lib/permissions";
import { useLeads } from "@/lib/leads-store";
import {
  TRIAGEM_STATUS,
  useTriagem,
  type TriagemEntry,
  type TriagemStatus,
} from "@/lib/triagem-store";
import {
  ClipboardList, Plus, MessageCircle, User, Filter, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/triagem")({
  head: () => ({ meta: [{ title: "Triagem — Imob CRM" }] }),
  component: TriagemPage,
});

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function statusColor(status: TriagemStatus) {
  if (status.includes("Apresentando") || status.includes("visita")) {
    return "bg-info/15 text-info border-info/30";
  }
  if (status.includes("Negociando") || status.includes("proposta")) {
    return "bg-primary/15 text-primary border-primary/30";
  }
  if (status.includes("Pausado") || status.includes("retorno")) {
    return "bg-warning/15 text-warning-foreground border-warning/30";
  }
  return "bg-muted text-muted-foreground";
}

function TriagemPage() {
  const user = getSession();
  const canSeeTeam = user ? canViewTeamData(user.role) : false;
  const isCorretor = !canSeeTeam;
  const nome = user?.name ?? "";

  const { leads } = useLeads();
  const { triagens, upsertTriagem } = useTriagem();

  const myLeads = useMemo(
    () => (isCorretor ? leads.filter((l) => l.corretor === nome) : leads),
    [leads, isCorretor, nome],
  );

  const visibleTriagens = useMemo(() => {
    const list = isCorretor
      ? triagens.filter((t) => t.corretorNome === nome)
      : triagens;
    return [...list].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [triagens, isCorretor, nome]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [corretorFilter, setCorretorFilter] = useState<string>("all");

  const corretoresNaTriagem = useMemo(
    () => [...new Set(triagens.map((t) => t.corretorNome))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [triagens],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visibleTriagens.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!isCorretor && corretorFilter !== "all" && t.corretorNome !== corretorFilter) return false;
      if (!q) return true;
      return `${t.leadNome} ${t.corretorNome} ${t.status} ${t.observacao}`.toLowerCase().includes(q);
    });
  }, [visibleTriagens, search, statusFilter, corretorFilter, isCorretor]);

  const [open, setOpen] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [status, setStatus] = useState<TriagemStatus>("Apresentando empreendimentos");
  const [observacao, setObservacao] = useState("");

  function openCreate(prefill?: TriagemEntry) {
    if (prefill) {
      setLeadId(prefill.leadId);
      setStatus(prefill.status);
      setObservacao(prefill.observacao);
    } else {
      setLeadId(myLeads[0]?.id ?? "");
      setStatus("Apresentando empreendimentos");
      setObservacao("");
    }
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lead = myLeads.find((l) => l.id === leadId) ?? leads.find((l) => l.id === leadId);
    if (!lead) {
      toast.error("Selecione um cliente.");
      return;
    }
    const corretorNome = isCorretor ? nome : lead.corretor;
    if (!corretorNome) {
      toast.error("Corretor não identificado.");
      return;
    }

    upsertTriagem({
      leadId: lead.id,
      leadNome: lead.nome,
      corretorNome,
      status,
      observacao: observacao.trim(),
    });
    setOpen(false);
    toast.success(`Triagem de ${lead.nome} atualizada.`);
  }

  return (
    <div>
      <PageHeader
        title="Triagem"
        description={
          isCorretor
            ? "Informe em qual etapa do atendimento cada cliente está."
            : "Acompanhe a triagem atualizada pelos corretores em tempo real."
        }
        actions={
          <Button size="sm" onClick={() => openCreate()}>
            <Plus className="w-4 h-4 mr-1" />
            {isCorretor ? "Atualizar triagem" : "Registrar triagem"}
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="p-3 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente, corretor, status..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-56 h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {TRIAGEM_STATUS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isCorretor && (
            <Select value={corretorFilter} onValueChange={setCorretorFilter}>
              <SelectTrigger className="w-48 h-9">
                <SelectValue placeholder="Corretor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos corretores</SelectItem>
                {corretoresNaTriagem.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              Em andamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {TRIAGEM_STATUS.map((s) => {
              const count = visibleTriagens.filter((t) => t.status === s).length;
              if (count === 0) return null;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    statusFilter === s ? "border-primary/40 bg-primary/10" : "hover:bg-muted/50",
                  )}
                >
                  <span className="truncate pr-2">{s}</span>
                  <Badge variant="secondary">{count}</Badge>
                </button>
              );
            })}
            {visibleTriagens.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhuma triagem registrada ainda.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              Linha do tempo da triagem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0">
              {filtered.map((t, index) => (
                <div key={t.id} className="flex gap-4 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    {index < filtered.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-2 min-h-8" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="text-[11px] text-muted-foreground mb-2">
                      {formatDateTime(t.updatedAt)}
                    </div>
                    <button
                      type="button"
                      onClick={() => (isCorretor || canSeeTeam) && openCreate(t)}
                      className="w-full text-left rounded-xl border bg-muted/30 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                            {initials(t.corretorNome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="text-sm">
                            <span className="font-medium">{t.corretorNome}</span>
                            <span className="text-muted-foreground"> atualizou a triagem de </span>
                            <span className="font-medium">{t.leadNome}</span>
                          </div>
                          <Badge variant="outline" className={cn("text-[11px]", statusColor(t.status))}>
                            {t.status}
                          </Badge>
                          {t.observacao && (
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {t.observacao}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-12">
                  Nenhum registro com esses filtros.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        icon={<ClipboardList className="w-5 h-5" />}
        title="Atualizar triagem"
        description="Selecione o cliente e informe em qual etapa do atendimento ele está."
      >
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[min(78vh,720px)]">
          <FormDialogBody>
            <FormSection icon={<User className="w-3.5 h-3.5 text-primary" />} title="Cliente">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Selecionar cliente</Label>
                <Select value={leadId} onValueChange={setLeadId}>
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder="Escolha o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {myLeads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.nome}
                        {!isCorretor ? ` · ${l.corretor}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FormSection>

            <FormSection icon={<ClipboardList className="w-3.5 h-3.5 text-primary" />} title="Situação atual">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Em que etapa está?</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TRIAGEM_STATUS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={cn(
                        "h-auto min-h-10 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors",
                        status === s
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "bg-background text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="triagem-obs" className="text-xs text-muted-foreground">
                  Observação (opcional)
                </Label>
                <Textarea
                  id="triagem-obs"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Ex.: Apresentando Mirante Belvedere e Araçá Prime..."
                  rows={3}
                  className="bg-background"
                />
              </div>
            </FormSection>
          </FormDialogBody>
          <FormDialogActions hint="Gerente e administrador veem esta atualização na triagem.">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none">
              Salvar triagem
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>
    </div>
  );
}
