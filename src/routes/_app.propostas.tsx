import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSession } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { brl } from "@/lib/crm-types";
import { canViewTeamData } from "@/lib/permissions";
import { useLeads } from "@/lib/leads-store";
import {
  fetchConstrutoras,
  type Construtora,
} from "@/lib/construtoras-api";
import {
  fetchEmpreendimentos,
  type Empreendimento,
} from "@/lib/empreendimentos-api";
import { fetchEquipes, type Equipe } from "@/lib/equipes-api";
import {
  createProposta,
  deleteProposta,
  fetchPropostas,
  formatPropostaDate,
  PROPOSTA_STATUS_LABEL,
  propostaStatusClass,
  updateProposta,
  type CreatePropostaInput,
  type Proposta,
  type PropostaStatus,
} from "@/lib/propostas-api";
import {
  formatPhone,
  phoneDigits,
  PHONE_PLACEHOLDER,
} from "@/lib/phone";
import {
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Handshake,
  Loader2,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/propostas")({
  head: () => ({ meta: [{ title: "Propostas — Zone Connection" }] }),
  component: Page,
});

const STATUS_OPTIONS: { value: PropostaStatus | "todos"; label: string }[] = [
  { value: "todos", label: "Todos os status" },
  { value: "rascunho", label: "Rascunho" },
  { value: "enviada", label: "Enviada" },
  { value: "negociacao", label: "Em negociação" },
  { value: "aceita", label: "Aceita" },
  { value: "recusada", label: "Recusada" },
  { value: "expirada", label: "Expirada" },
];

type FormState = {
  leadId: string;
  clienteNome: string;
  clienteTelefone: string;
  construtoraId: string;
  empreendimentoId: string;
  unidade: string;
  corretorId: string;
  valor: string;
  entrada: string;
  financiamento: string;
  status: PropostaStatus;
  validade: string;
  observacao: string;
};

const emptyForm = (): FormState => ({
  leadId: "",
  clienteNome: "",
  clienteTelefone: "",
  construtoraId: "",
  empreendimentoId: "",
  unidade: "",
  corretorId: "",
  valor: "",
  entrada: "",
  financiamento: "",
  status: "rascunho",
  validade: "",
  observacao: "",
});

function parseMoney(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return Number(digits);
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function equipeName(p: Proposta): string {
  return p.lead?.equipe?.name ?? "—";
}

function Page() {
  const user = getSession();
  const isManager = user ? canViewTeamData(user.role) : false;
  const isGerente = user?.role === "gerente";
  const { leads, assignees } = useLeads();

  const [items, setItems] = useState<Proposta[]>([]);
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PropostaStatus | "todos">("todos");
  const [corretorId, setCorretorId] = useState("todos");
  const [equipeId, setEquipeId] = useState("todos");

  const [selected, setSelected] = useState<Proposta | null>(null);
  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const corretorOptions = useMemo(
    () => assignees.filter((a) => !a.role || a.role === "corretor"),
    [assignees],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [propostas, cons, emps, eqs] = await Promise.all([
        fetchPropostas(),
        fetchConstrutoras().catch(() => [] as Construtora[]),
        fetchEmpreendimentos().catch(() => [] as Empreendimento[]),
        isManager && !isGerente
          ? fetchEquipes().catch(() => [] as Equipe[])
          : Promise.resolve([] as Equipe[]),
      ]);
      setItems(propostas);
      setConstrutoras(cons);
      setEmpreendimentos(emps);
      setEquipes(eqs);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Falha ao carregar propostas.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredEmpreendimentos = useMemo(() => {
    if (!form.construtoraId) return empreendimentos;
    return empreendimentos.filter(
      (e) => !e.construtoraId || e.construtoraId === form.construtoraId,
    );
  }, [empreendimentos, form.construtoraId]);

  const visibleLeads = useMemo(() => {
    if (!user) return [];
    if (!isManager) {
      return leads.filter(
        (l) => l.corretorId === user.id || l.corretor === user.name,
      );
    }
    return leads;
  }, [leads, user, isManager]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      if (status !== "todos" && p.status !== status) return false;
      if (corretorId !== "todos" && p.corretorId !== corretorId) return false;
      if (equipeId !== "todos") {
        const eq = p.lead?.equipe?.id;
        if (eq !== equipeId) return false;
      }
      if (!q) return true;
      const hay = [
        p.codigo,
        p.clienteNome,
        p.clienteTelefone,
        p.empreendimento?.nome,
        p.construtora?.nome,
        p.unidade,
        p.corretor?.name,
        p.lead?.equipe?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, search, status, corretorId, equipeId]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const valor = rows.reduce((s, r) => s + r.valor, 0);
    const aceitas = rows.filter((r) => r.status === "aceita");
    const emAberto = rows.filter((r) =>
      ["enviada", "negociacao", "rascunho"].includes(r.status),
    );
    const decididas = rows.filter((r) =>
      ["aceita", "recusada", "expirada"].includes(r.status),
    ).length;
    const taxaAceite =
      total > 0 ? (aceitas.length / Math.max(decididas, 1)) * 100 : 0;
    return {
      total,
      valor,
      aceitas: aceitas.length,
      valorAceitas: aceitas.reduce((s, r) => s + r.valor, 0),
      emAberto: emAberto.length,
      taxaAceite,
    };
  }, [rows]);

  const hasActive = Boolean(
    search ||
      status !== "todos" ||
      corretorId !== "todos" ||
      (!isGerente && equipeId !== "todos"),
  );

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    const next = emptyForm();
    if (user?.role === "corretor") next.corretorId = user.id;
    setForm(next);
    setOpen(true);
  }

  function openEdit(p: Proposta) {
    setFormMode("edit");
    setEditingId(p.id);
    setForm({
      leadId: p.leadId ?? "",
      clienteNome: p.clienteNome,
      clienteTelefone: p.clienteTelefone
        ? formatPhone(p.clienteTelefone)
        : "",
      construtoraId: p.construtoraId ?? "",
      empreendimentoId: p.empreendimentoId ?? "",
      unidade: p.unidade ?? "",
      corretorId: p.corretorId ?? "",
      valor: String(p.valor),
      entrada: p.entrada != null ? String(p.entrada) : "",
      financiamento: p.financiamento != null ? String(p.financiamento) : "",
      status: p.status,
      validade: toDateInput(p.validade),
      observacao: p.observacao ?? "",
    });
    setSelected(null);
    setOpen(true);
  }

  function onLeadSelect(leadId: string) {
    const lead = visibleLeads.find((l) => l.id === leadId);
    setForm((f) => ({
      ...f,
      leadId,
      clienteNome: lead?.nome ?? f.clienteNome,
      clienteTelefone: lead?.telefone
        ? formatPhone(lead.telefone)
        : f.clienteTelefone,
      corretorId: lead?.corretorId || f.corretorId,
      construtoraId: lead?.construtoraId || f.construtoraId,
      empreendimentoId: lead?.empreendimentoId || f.empreendimentoId,
    }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const valor = parseMoney(form.valor);
    if (!form.clienteNome.trim() || valor == null) {
      toast.error("Informe o cliente e o valor da proposta.");
      return;
    }

    const payload: CreatePropostaInput = {
      leadId: form.leadId || null,
      clienteNome: form.clienteNome.trim(),
      clienteTelefone: form.clienteTelefone
        ? phoneDigits(form.clienteTelefone)
        : null,
      construtoraId: form.construtoraId || null,
      empreendimentoId: form.empreendimentoId || null,
      unidade: form.unidade.trim() || null,
      corretorId: form.corretorId || null,
      valor,
      entrada: parseMoney(form.entrada),
      financiamento: parseMoney(form.financiamento),
      status: form.status,
      validade: form.validade || null,
      observacao: form.observacao.trim() || null,
    };

    setSaving(true);
    try {
      if (formMode === "create") {
        await createProposta(payload);
        toast.success("Proposta criada.");
      } else if (editingId) {
        await updateProposta(editingId, payload);
        toast.success("Proposta atualizada.");
      }
      setOpen(false);
      await load();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Não foi possível salvar.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function patchStatus(id: string, next: PropostaStatus) {
    setActionLoading(true);
    try {
      const updated = await updateProposta(id, { status: next });
      setItems((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setSelected(updated);
      toast.success(`Status: ${PROPOSTA_STATUS_LABEL[next]}`);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Falha ao atualizar status.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await deleteProposta(deleteId);
      toast.success("Proposta excluída.");
      setDeleteId(null);
      setSelected(null);
      await load();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Falha ao excluir.";
      toast.error(msg);
    }
  }

  return (
    <div>
      <PageHeader
        title="Propostas"
        description="Propostas comerciais enviadas aos clientes"
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Nova proposta
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-4">
        <FinanceKpiCard
          label="Propostas (filtro)"
          value={kpis.total}
          icon={FileText}
          tone="blue"
          format="number"
        />
        <FinanceKpiCard
          label="VGV das propostas"
          value={kpis.valor}
          icon={Handshake}
          tone="violet"
        />
        <FinanceKpiCard
          label="Aceitas"
          value={kpis.aceitas}
          icon={CheckCircle2}
          tone="emerald"
          format="number"
          suffix={kpis.valorAceitas ? `· ${brl(kpis.valorAceitas)}` : undefined}
        />
        <FinanceKpiCard
          label="Em aberto"
          value={kpis.emAberto}
          icon={Clock3}
          tone="orange"
          format="number"
          suffix={`· ${kpis.taxaAceite.toFixed(0)}% aceite`}
        />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar código, cliente, empreendimento…"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as PropostaStatus | "todos")}
        >
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isManager && (
          <Select value={corretorId} onValueChange={setCorretorId}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Corretor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os corretores</SelectItem>
              {corretorOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {isManager && !isGerente && (
          <Select value={equipeId} onValueChange={setEquipeId}>
            <SelectTrigger className="w-full sm:w-[170px]">
              <SelectValue placeholder="Equipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as equipes</SelectItem>
              {equipes.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {hasActive && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setStatus("todos");
              setCorretorId("todos");
              setEquipeId("todos");
            }}
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Empreendimento</TableHead>
              <TableHead>Corretor</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-10"
                >
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                  Carregando…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-10"
                >
                  Nenhuma proposta para os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(p)}
                >
                  <TableCell className="font-mono text-xs font-medium">
                    {p.codigo}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{p.clienteNome}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.clienteTelefone
                        ? formatPhone(p.clienteTelefone)
                        : "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{p.empreendimento?.nome ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.unidade ? `Un. ${p.unidade}` : "Sem unidade"}
                      {p.construtora ? ` · ${p.construtora.nome}` : ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{p.corretor?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {equipeName(p)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {brl(p.valor)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={propostaStatusClass(p.status)}
                    >
                      {PROPOSTA_STATUS_LABEL[p.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">
                    {formatPropostaDate(p.validade)}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(p);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {rows.length} de {items.length} propostas
      </p>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  {selected.codigo}
                  <Badge
                    variant="outline"
                    className={propostaStatusClass(selected.status)}
                  >
                    {PROPOSTA_STATUS_LABEL[selected.status]}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Detalhes da proposta comercial.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 text-sm">
                <DetailRow label="Cliente" value={selected.clienteNome} />
                <DetailRow
                  label="Telefone"
                  value={
                    selected.clienteTelefone
                      ? formatPhone(selected.clienteTelefone)
                      : "—"
                  }
                />
                <DetailRow
                  label="Empreendimento"
                  value={
                    (selected.empreendimento?.nome ?? "—") +
                    (selected.unidade ? ` · Un. ${selected.unidade}` : "")
                  }
                />
                <DetailRow
                  label="Construtora"
                  value={selected.construtora?.nome ?? "—"}
                />
                <DetailRow
                  label="Corretor"
                  value={`${selected.corretor?.name ?? "—"} · ${equipeName(selected)}`}
                />
                <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/60 p-3 bg-muted/30">
                  <div>
                    <div className="text-[11px] text-muted-foreground">
                      Valor
                    </div>
                    <div className="font-semibold tabular-nums">
                      {brl(selected.valor)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">
                      Entrada
                    </div>
                    <div className="font-semibold tabular-nums">
                      {selected.entrada != null ? brl(selected.entrada) : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">
                      Financiamento
                    </div>
                    <div className="font-semibold tabular-nums">
                      {selected.financiamento != null
                        ? brl(selected.financiamento)
                        : "—"}
                    </div>
                  </div>
                </div>
                <DetailRow
                  label="Criada em"
                  value={formatPropostaDate(selected.createdAt)}
                />
                <DetailRow
                  label="Enviada em"
                  value={
                    selected.enviadaEm
                      ? formatPropostaDate(selected.enviadaEm)
                      : "Ainda não enviada"
                  }
                />
                <DetailRow
                  label="Validade"
                  value={formatPropostaDate(selected.validade)}
                />
                {selected.observacao ? (
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1">
                      Observação
                    </div>
                    <p className="text-foreground">{selected.observacao}</p>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(selected)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                {selected.status === "rascunho" && (
                  <Button
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => void patchStatus(selected.id, "enviada")}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Enviar proposta
                  </Button>
                )}
                {(selected.status === "enviada" ||
                  selected.status === "negociacao") && (
                  <>
                    <Button
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => void patchStatus(selected.id, "aceita")}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading}
                      onClick={() => void patchStatus(selected.id, "recusada")}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Recusar
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setDeleteId(selected.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelected(null)}
                >
                  Fechar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        icon={<FileText className="w-5 h-5" />}
        title={formMode === "create" ? "Nova proposta" : "Editar proposta"}
        description="Preencha os dados comerciais da proposta."
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
            <Button type="submit" form="proposta-form" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Salvar
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <form id="proposta-form" className="space-y-5" onSubmit={onSubmit}>
            <FormSection title="Cliente">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Lead / cliente (opcional)</Label>
                  <Select
                    value={form.leadId || "__none__"}
                    onValueChange={(v) =>
                      onLeadSelect(v === "__none__" ? "" : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar lead" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem vínculo</SelectItem>
                      {visibleLeads.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.nome}
                          {l.telefone ? ` · ${formatPhone(l.telefone)}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="clienteNome">Nome *</Label>
                  <Input
                    id="clienteNome"
                    value={form.clienteNome}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, clienteNome: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="clienteTelefone">Telefone</Label>
                  <Input
                    id="clienteTelefone"
                    value={form.clienteTelefone}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        clienteTelefone: formatPhone(e.target.value),
                      }))
                    }
                    placeholder={PHONE_PLACEHOLDER}
                  />
                </div>
              </div>
            </FormSection>

            <FormSection title="Imóvel">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Construtora</Label>
                  <Select
                    value={form.construtoraId || "__none__"}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        construtoraId: v === "__none__" ? "" : v,
                        empreendimentoId: "",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Construtora" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhuma</SelectItem>
                      {construtoras.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Empreendimento</Label>
                  <Select
                    value={form.empreendimentoId || "__none__"}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        empreendimentoId: v === "__none__" ? "" : v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Empreendimento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {filteredEmpreendimentos.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unidade">Unidade</Label>
                  <Input
                    id="unidade"
                    value={form.unidade}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, unidade: e.target.value }))
                    }
                    placeholder="Ex.: 802"
                  />
                </div>
                {isManager && (
                  <div className="space-y-1.5">
                    <Label>Corretor</Label>
                    <Select
                      value={form.corretorId || "__none__"}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          corretorId: v === "__none__" ? "" : v,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Corretor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Não definido</SelectItem>
                        {corretorOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </FormSection>

            <FormSection title="Valores e status">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="valor">Valor (R$) *</Label>
                  <Input
                    id="valor"
                    inputMode="numeric"
                    value={form.valor}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        valor: e.target.value.replace(/\D/g, ""),
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="entrada">Entrada (R$)</Label>
                  <Input
                    id="entrada"
                    inputMode="numeric"
                    value={form.entrada}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        entrada: e.target.value.replace(/\D/g, ""),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="financiamento">Financiamento (R$)</Label>
                  <Input
                    id="financiamento"
                    inputMode="numeric"
                    value={form.financiamento}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        financiamento: e.target.value.replace(/\D/g, ""),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        status: v as PropostaStatus,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.filter((o) => o.value !== "todos").map(
                        (o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="validade">Validade</Label>
                  <Input
                    id="validade"
                    type="date"
                    value={form.validade}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, validade: e.target.value }))
                    }
                  />
                </div>
                <div className="sm:col-span-3 space-y-1.5">
                  <Label htmlFor="observacao">Observação</Label>
                  <Textarea
                    id="observacao"
                    value={form.observacao}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, observacao: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
              </div>
            </FormSection>
          </form>
        </FormDialogBody>
      </FormDialogShell>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
