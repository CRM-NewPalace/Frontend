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
  DetailField,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getSession } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { brl, type Lead } from "@/lib/crm-types";
import { canViewTeamData } from "@/lib/permissions";
import { useLeads } from "@/lib/leads-store";
import { fetchConstrutoras, type Construtora } from "@/lib/construtoras-api";
import {
  fetchEmpreendimentos,
  type Empreendimento,
} from "@/lib/empreendimentos-api";
import { fetchEquipes, type Equipe } from "@/lib/equipes-api";
import { fetchDocumentacoes } from "@/lib/documentacao-api";
import { isStatusAprovadoDoc } from "@/lib/documentacao-status";
import {
  createProposta,
  deleteProposta,
  fetchPropostas,
  formatPropostaDate,
  PROPOSTA_COMPOSICAO_LABEL,
  PROPOSTA_LISTA_KEYS,
  PROPOSTA_SIMPLES_KEYS,
  PROPOSTA_STATUS_LABEL,
  propostaComposicaoTotal,
  propostaDiferenca,
  propostaStatusClass,
  updateProposta,
  type CreatePropostaInput,
  type Proposta,
  type PropostaSimplesKey,
  type PropostaStatus,
} from "@/lib/propostas-api";
import {
  downloadPropostaPdfCliente,
  downloadPropostaPdfCorretor,
  getPropostaMailtoUrl,
  getPropostaWhatsAppUrl,
  propostaWhatsAppDigits,
  type PropostaPdfBrand,
} from "@/lib/proposta-pdf";
import { useTenantTheme } from "@/lib/tenant-theme";
import {
  formatPhone,
  isValidPhone,
  phoneDigits,
  PHONE_INVALID_MESSAGE,
  PHONE_PLACEHOLDER,
} from "@/lib/phone";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseOptionalMoneyInput,
} from "@/lib/money-input";
import { cn } from "@/lib/utils";
import {
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Clock3,
  Download,
  Eye,
  FileText,
  Handshake,
  Loader2,
  Pencil,
  Plus,
  Search,
  Send,
  Share2,
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

type ParcelasForm = {
  quantidade: string;
  valor: string;
};

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
  apartado: string;
  preChaves: ParcelasForm;
  posChaves: ParcelasForm;
  intercaladas: ParcelasForm;
  fgts: string;
  moraBem: string;
  mcmv: string;
  parcelaCaixa: string;
  financiamento: string;
  desconto: string;
  status: PropostaStatus;
  validade: string;
  observacao: string;
};

const emptyParcelas = (): ParcelasForm => ({
  quantidade: "",
  valor: "",
});

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
  apartado: "",
  preChaves: emptyParcelas(),
  posChaves: emptyParcelas(),
  intercaladas: emptyParcelas(),
  fgts: "",
  moraBem: "",
  mcmv: "",
  parcelaCaixa: "",
  financiamento: "",
  desconto: "",
  status: "rascunho",
  validade: "",
  observacao: "",
});

function parseMoney(raw: string): number | null {
  return parseOptionalMoneyInput(raw);
}

function moneyOrZero(raw: string): number {
  return parseMoney(raw) ?? 0;
}

function parseQuantidade(raw: string): number {
  const n = Number.parseInt(raw.replace(/\D/g, ""), 10);
  if (!Number.isFinite(n) || n < 1) return 0;
  return Math.min(n, 360);
}

function parcelasSubtotal(p: ParcelasForm): number {
  return parseQuantidade(p.quantidade) * moneyOrZero(p.valor);
}

function expandParcelas(p: ParcelasForm): number[] {
  const q = parseQuantidade(p.quantidade);
  const v = parseMoney(p.valor);
  if (!q || v == null || v <= 0) return [];
  return Array.from({ length: q }, () => v);
}

function formComposicaoTotal(form: FormState): number {
  const simples = PROPOSTA_SIMPLES_KEYS.reduce(
    (sum, key) => sum + moneyOrZero(form[key]),
    0,
  );
  const listas = PROPOSTA_LISTA_KEYS.reduce(
    (sum, key) => sum + parcelasSubtotal(form[key]),
    0,
  );
  return simples + listas;
}

function toParcelasForm(values: number[] | null | undefined): ParcelasForm {
  if (!values?.length) return emptyParcelas();
  return {
    quantidade: String(values.length),
    valor: formatMoneyInput(values[0] ?? 0),
  };
}

function parcelasResumo(values: number[]) {
  const subtotal = values.reduce((sum, n) => sum + n, 0);
  const equal = values.every((n) => n === values[0]);
  return {
    quantidade: values.length,
    valorUnitario: values[0] ?? 0,
    equal,
    subtotal,
  };
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function equipeName(p: Proposta): string {
  return p.lead?.equipe?.name ?? "—";
}

function isLeadAprovado(
  lead: Lead,
  aprovadosPorDoc: Set<string>,
): boolean {
  if (lead.analise?.status === "aprovado") return true;
  return aprovadosPorDoc.has(lead.id);
}

function leadPickerLabel(lead: Lead): string {
  const phone = lead.telefone ? formatPhone(lead.telefone) : "";
  return phone ? `${lead.nome} · ${phone}` : lead.nome;
}

function shareToast() {
  toast.message("PDF do cliente baixado", {
    description: "Anexe o arquivo na conversa ou no e-mail que acabou de abrir.",
  });
}

function PropostaActionMenus({
  proposta,
  onView,
  onEdit,
  onDelete,
  onRequestWhatsAppPhone,
  brand,
  compact = false,
}: {
  proposta: Proposta;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRequestWhatsAppPhone: (proposta: Proposta) => void;
  brand: PropostaPdfBrand;
  compact?: boolean;
}) {
  const handlePdfCliente = () => {
    void downloadPropostaPdfCliente(proposta, brand).then(() => {
      toast.success("PDF para cliente baixado");
    });
  };

  const handlePdfCorretor = () => {
    void downloadPropostaPdfCorretor(proposta, brand).then(() => {
      toast.success("PDF para corretor baixado");
    });
  };

  const handleWhatsApp = () => {
    if (!propostaWhatsAppDigits(proposta.clienteTelefone)) {
      onRequestWhatsAppPhone(proposta);
      return;
    }
    void downloadPropostaPdfCliente(proposta, brand).then(() => {
      const url = getPropostaWhatsAppUrl(proposta);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      shareToast();
    });
  };

  const handleEmail = () => {
    void downloadPropostaPdfCliente(proposta, brand).then(() => {
      window.location.href = getPropostaMailtoUrl(proposta);
      shareToast();
    });
  };

  return (
    <div
      className={cn(
        "flex items-center",
        compact ? "justify-end gap-0.5" : "flex-wrap gap-2",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {compact ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Baixar PDF"
              title="Baixar PDF"
            >
              <Download className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline">
              <Download className="h-4 w-4 mr-1" />
              Baixar PDF
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handlePdfCliente}>
            PDF para cliente
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePdfCorretor}>
            PDF para corretor
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {compact ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Compartilhar"
              title="Compartilhar"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline">
              <Share2 className="h-4 w-4 mr-1" />
              Compartilhar
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleWhatsApp}>
            WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEmail}>E-mail</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {onEdit && (
        compact ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onEdit}
            aria-label="Editar"
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            Editar
          </Button>
        )
      )}

      {onDelete && (
        compact ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
            aria-label="Excluir"
            title="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Excluir
          </Button>
        )
      )}

      {onView && compact && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onView}
          aria-label="Ver detalhes"
          title="Ver detalhes"
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function Page() {
  const user = getSession();
  const isManager = user ? canViewTeamData(user.role) : false;
  const isGerente = user?.role === "gerente";
  const { logoUrl, tenant } = useTenantTheme();
  const pdfBrand = useMemo<PropostaPdfBrand>(
    () => ({
      logoUrl,
      primaryColor: tenant?.primaryColor ?? null,
      company: tenant
        ? {
            name: tenant.name,
            documento: tenant.documento,
            creci: tenant.creci,
            email: tenant.email,
            telefone: tenant.telefone,
            endereco: tenant.endereco,
            cidade: tenant.cidade,
          }
        : null,
    }),
    [logoUrl, tenant],
  );
  const { leads, assignees } = useLeads();

  const [items, setItems] = useState<Proposta[]>([]);
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [aprovadosPorDoc, setAprovadosPorDoc] = useState<Set<string>>(
    () => new Set(),
  );
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PropostaStatus | "todos">("todos");
  const [corretorId, setCorretorId] = useState("todos");
  const [equipeId, setEquipeId] = useState("todos");

  const [selected, setSelected] = useState<Proposta | null>(null);
  const [open, setOpen] = useState(false);
  const [leadPickerOpen, setLeadPickerOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [whatsAppTarget, setWhatsAppTarget] = useState<Proposta | null>(null);
  const [whatsAppPhone, setWhatsAppPhone] = useState("");

  const corretorOptions = useMemo(
    () => assignees.filter((a) => !a.role || a.role === "corretor"),
    [assignees],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [propostas, cons, emps, eqs, docs] = await Promise.all([
        fetchPropostas(),
        fetchConstrutoras().catch(() => [] as Construtora[]),
        fetchEmpreendimentos().catch(() => [] as Empreendimento[]),
        isManager && !isGerente
          ? fetchEquipes().catch(() => [] as Equipe[])
          : Promise.resolve([] as Equipe[]),
        fetchDocumentacoes().catch(() => []),
      ]);
      setItems(propostas);
      setAprovadosPorDoc(
        new Set(
          docs
            .filter((d) => isStatusAprovadoDoc(d.status1))
            .map((d) => d.leadId),
        ),
      );
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
    const scoped = !isManager
      ? leads.filter(
          (l) => l.corretorId === user.id || l.corretor === user.name,
        )
      : leads;
    return scoped
      .filter((l) => isLeadAprovado(l, aprovadosPorDoc))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [leads, user, isManager, aprovadosPorDoc]);

  const selectedLead = useMemo(() => {
    if (!form.leadId) return null;
    return (
      visibleLeads.find((l) => l.id === form.leadId) ??
      leads.find((l) => l.id === form.leadId) ??
      null
    );
  }, [form.leadId, visibleLeads, leads]);

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

  const formTotal = useMemo(() => formComposicaoTotal(form), [form]);
  const formValorLiquido = useMemo(
    () => Math.max(0, moneyOrZero(form.valor) - moneyOrZero(form.desconto)),
    [form.valor, form.desconto],
  );
  const formDiferenca = useMemo(
    () => formValorLiquido - formTotal,
    [formValorLiquido, formTotal],
  );

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(p: Proposta) {
    setFormMode("edit");
    setEditingId(p.id);
    setForm({
      leadId: p.leadId ?? "",
      clienteNome: p.clienteNome,
      clienteTelefone: p.clienteTelefone ? formatPhone(p.clienteTelefone) : "",
      construtoraId: p.construtoraId ?? "",
      empreendimentoId: p.empreendimentoId ?? "",
      unidade: p.unidade ?? "",
      corretorId: p.corretorId ?? "",
      valor: formatMoneyInput(p.valor),
      entrada: p.entrada != null ? formatMoneyInput(p.entrada) : "",
      apartado: p.apartado != null ? formatMoneyInput(p.apartado) : "",
      preChaves: toParcelasForm(p.preChaves),
      posChaves: toParcelasForm(p.posChaves),
      intercaladas: toParcelasForm(p.intercaladas),
      fgts: p.fgts != null ? formatMoneyInput(p.fgts) : "",
      moraBem: p.moraBem != null ? formatMoneyInput(p.moraBem) : "",
      mcmv: p.mcmv != null ? formatMoneyInput(p.mcmv) : "",
      parcelaCaixa:
        p.parcelaCaixa != null ? formatMoneyInput(p.parcelaCaixa) : "",
      financiamento:
        p.financiamento != null ? formatMoneyInput(p.financiamento) : "",
      desconto: p.desconto != null ? formatMoneyInput(p.desconto) : "",
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
      toast.error("Informe o cliente e o valor de venda.");
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
      apartado: parseMoney(form.apartado),
      preChaves: expandParcelas(form.preChaves),
      posChaves: expandParcelas(form.posChaves),
      intercaladas: expandParcelas(form.intercaladas),
      fgts: parseMoney(form.fgts),
      moraBem: parseMoney(form.moraBem),
      mcmv: parseMoney(form.mcmv),
      parcelaCaixa: parseMoney(form.parcelaCaixa),
      financiamento: parseMoney(form.financiamento),
      desconto: parseMoney(form.desconto),
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
      const msg = err instanceof ApiError ? err.message : "Falha ao excluir.";
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

      <section className="grid gap-3 grid-cols-2 xl:grid-cols-4 mb-4">
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
        <div className="relative flex-1 min-w-50 max-w-sm">
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
          <SelectTrigger className="w-full sm:w-42.5">
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
            <SelectTrigger className="w-full sm:w-45">
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
            <SelectTrigger className="w-full sm:w-42.5">
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
              <TableHead className="text-right w-44">Ações</TableHead>
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
                      {p.clienteTelefone ? formatPhone(p.clienteTelefone) : "—"}
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
                  <TableCell className="text-right">
                    <PropostaActionMenus
                      proposta={p}
                      brand={pdfBrand}
                      compact
                      onView={() => setSelected(p)}
                      onEdit={() => openEdit(p)}
                      onDelete={() => setDeleteId(p.id)}
                      onRequestWhatsAppPhone={(item) => {
                        setWhatsAppTarget(item);
                        setWhatsAppPhone(
                          item.clienteTelefone
                            ? formatPhone(item.clienteTelefone)
                            : "",
                        );
                      }}
                    />
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

      <FormDialogShell
        open={Boolean(selected)}
        onOpenChange={(openDialog) => !openDialog && setSelected(null)}
        icon={<FileText className="size-5" />}
        title={selected?.codigo ?? "Proposta"}
        description={
          selected ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={propostaStatusClass(selected.status)}
              >
                {PROPOSTA_STATUS_LABEL[selected.status]}
              </Badge>
              <span>Detalhes da proposta comercial</span>
            </span>
          ) : undefined
        }
        className="max-w-2xl"
        footer={
          selected ? (
            <FormDialogActions>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelected(null)}
              >
                Fechar
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteId(selected.id)}
              >
                <Trash2 className="mr-1 size-4" />
                Excluir
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => openEdit(selected)}
              >
                <Pencil className="mr-1 size-4" />
                Editar
              </Button>
              {selected.status === "rascunho" && (
                <Button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => void patchStatus(selected.id, "enviada")}
                >
                  <Send className="mr-1 size-4" />
                  Enviar
                </Button>
              )}
              {(selected.status === "enviada" ||
                selected.status === "negociacao") && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => void patchStatus(selected.id, "recusada")}
                  >
                    <XCircle className="mr-1 size-4" />
                    Recusar
                  </Button>
                  <Button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void patchStatus(selected.id, "aceita")}
                  >
                    <CheckCircle2 className="mr-1 size-4" />
                    Aceitar
                  </Button>
                </>
              )}
            </FormDialogActions>
          ) : undefined
        }
      >
        {selected && (
          <FormDialogBody>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/20 px-3 py-2.5">
              <span className="text-xs text-muted-foreground">
                Exportar ou enviar ao cliente
              </span>
              <PropostaActionMenus
                proposta={selected}
                brand={pdfBrand}
                onRequestWhatsAppPhone={(item) => {
                  setWhatsAppTarget(item);
                  setWhatsAppPhone(
                    item.clienteTelefone
                      ? formatPhone(item.clienteTelefone)
                      : "",
                  );
                }}
              />
            </div>

            <FormSection title="Cliente e imóvel">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Cliente" value={selected.clienteNome} />
                <DetailField
                  label="Telefone"
                  value={
                    selected.clienteTelefone
                      ? formatPhone(selected.clienteTelefone)
                      : "—"
                  }
                />
                <DetailField
                  label="Empreendimento"
                  value={selected.empreendimento?.nome ?? "—"}
                />
                <DetailField
                  label="Unidade"
                  value={selected.unidade ? `Un. ${selected.unidade}` : "—"}
                />
                <DetailField
                  label="Construtora"
                  value={selected.construtora?.nome ?? "—"}
                />
                <DetailField
                  label="Corretor"
                  value={selected.corretor?.name ?? "—"}
                />
                <DetailField
                  label="Equipe"
                  value={equipeName(selected)}
                  className="sm:col-span-2"
                />
              </div>
            </FormSection>

            <FormSection title="Valores">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-muted/25 px-4 py-3">
                  <div className="text-xs text-muted-foreground">
                    Valor de venda
                  </div>
                  <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                    {brl(selected.valor)}
                  </div>
                </div>
                {selected.desconto != null && selected.desconto > 0 ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                    <div className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      Desconto do empreendimento
                    </div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-amber-900 dark:text-amber-200">
                      {brl(selected.desconto)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Valor com desconto:{" "}
                      <span className="font-medium tabular-nums text-foreground">
                        {brl(Math.max(0, selected.valor - selected.desconto))}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Composição do pagamento
                </div>
                <div className="divide-y divide-border/60 rounded-lg border border-border/60">
                  {PROPOSTA_SIMPLES_KEYS.map((key) => {
                    const value = selected[key];
                    if (value == null) return null;
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <span className="text-sm text-muted-foreground">
                          {PROPOSTA_COMPOSICAO_LABEL[key]}
                        </span>
                        <span className="text-sm font-medium tabular-nums">
                          {brl(value)}
                        </span>
                      </div>
                    );
                  })}
                  {PROPOSTA_LISTA_KEYS.map((key) => {
                    const values = selected[key] ?? [];
                    if (!values.length) return null;
                    const resumo = parcelasResumo(values);
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-muted-foreground">
                            {PROPOSTA_COMPOSICAO_LABEL[key]}
                          </div>
                          <div className="text-xs text-muted-foreground tabular-nums">
                            {resumo.equal
                              ? `${resumo.quantidade} × ${brl(resumo.valorUnitario)}`
                              : `${resumo.quantidade} parcelas (valores variados)`}
                          </div>
                        </div>
                        <span className="text-sm font-medium tabular-nums shrink-0">
                          {brl(resumo.subtotal)}
                        </span>
                      </div>
                    );
                  })}
                  {!PROPOSTA_SIMPLES_KEYS.some((key) => selected[key] != null) &&
                  !PROPOSTA_LISTA_KEYS.some(
                    (key) => (selected[key] ?? []).length > 0,
                  ) ? (
                    <div className="px-3 py-3 text-sm text-muted-foreground">
                      Nenhuma composição informada.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 px-3 py-2.5">
                  <div className="text-xs text-muted-foreground">
                    Total da composição
                  </div>
                  <div className="mt-1 text-sm font-semibold tabular-nums">
                    {brl(propostaComposicaoTotal(selected))}
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 px-3 py-2.5">
                  <div className="text-xs text-muted-foreground">Diferença</div>
                  <div
                    className={cn(
                      "mt-1 text-sm font-semibold tabular-nums",
                      propostaDiferenca(selected) === 0
                        ? "text-emerald-700 dark:text-emerald-300"
                        : propostaDiferenca(selected) < 0
                          ? "text-destructive"
                          : "text-amber-800 dark:text-amber-300",
                    )}
                  >
                    {brl(propostaDiferenca(selected))}
                  </div>
                </div>
              </div>
            </FormSection>

            <FormSection title="Datas">
              <div className="grid gap-4 sm:grid-cols-3">
                <DetailField
                  label="Criada em"
                  value={formatPropostaDate(selected.createdAt)}
                />
                <DetailField
                  label="Enviada em"
                  value={
                    selected.enviadaEm
                      ? formatPropostaDate(selected.enviadaEm)
                      : "Ainda não enviada"
                  }
                />
                <DetailField
                  label="Validade"
                  value={formatPropostaDate(selected.validade)}
                />
              </div>
            </FormSection>

            {selected.observacao ? (
              <FormSection title="Observação">
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {selected.observacao}
                </p>
              </FormSection>
            ) : null}
          </FormDialogBody>
        )}
      </FormDialogShell>

      <Dialog
        open={Boolean(whatsAppTarget)}
        onOpenChange={(openDialog) => {
          if (!openDialog) {
            setWhatsAppTarget(null);
            setWhatsAppPhone("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Compartilhar no WhatsApp</DialogTitle>
            <DialogDescription>
              Informe o telefone do cliente com DDD. O PDF para cliente será
              baixado e a conversa abrirá com a mensagem pronta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="whatsapp-phone">Telefone</Label>
            <Input
              id="whatsapp-phone"
              placeholder={PHONE_PLACEHOLDER}
              value={whatsAppPhone}
              onChange={(e) => setWhatsAppPhone(formatPhone(e.target.value))}
            />
            {whatsAppPhone && !isValidPhone(whatsAppPhone) ? (
              <p className="text-xs text-destructive">{PHONE_INVALID_MESSAGE}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setWhatsAppTarget(null);
                setWhatsAppPhone("");
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!whatsAppTarget || !isValidPhone(whatsAppPhone)}
              onClick={() => {
                if (!whatsAppTarget || !isValidPhone(whatsAppPhone)) return;
                void downloadPropostaPdfCliente(whatsAppTarget, pdfBrand).then(
                  () => {
                    const url = getPropostaWhatsAppUrl(
                      whatsAppTarget,
                      phoneDigits(whatsAppPhone),
                    );
                    if (url) window.open(url, "_blank", "noopener,noreferrer");
                    shareToast();
                    setWhatsAppTarget(null);
                    setWhatsAppPhone("");
                  },
                );
              }}
            >
              Abrir WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        className="max-w-3xl"
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
                  <Label>Lead / cliente aprovado (opcional)</Label>
                  <Popover
                    modal
                    open={leadPickerOpen}
                    onOpenChange={setLeadPickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={leadPickerOpen}
                        className="h-10 w-full justify-between font-normal"
                      >
                        <span className="truncate">
                          {selectedLead
                            ? leadPickerLabel(selectedLead)
                            : "Buscar por nome ou telefone..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                      align="start"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      <Command>
                        <CommandInput placeholder="Nome ou telefone..." />
                        <CommandList>
                          <CommandEmpty>
                            Nenhum lead/cliente aprovado encontrado.
                          </CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="sem vinculo"
                              onSelect={() => {
                                onLeadSelect("");
                                setLeadPickerOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  !form.leadId ? "opacity-100" : "opacity-0",
                                )}
                              />
                              Sem vínculo
                            </CommandItem>
                            {visibleLeads.map((l) => {
                              const label = leadPickerLabel(l);
                              const searchValue = [
                                l.nome,
                                l.telefone,
                                phoneDigits(l.telefone),
                                l.tipo,
                              ]
                                .filter(Boolean)
                                .join(" ");
                              return (
                                <CommandItem
                                  key={l.id}
                                  value={searchValue}
                                  onSelect={() => {
                                    onLeadSelect(l.id);
                                    setLeadPickerOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      form.leadId === l.id
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  <span className="truncate">{label}</span>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-[11px] text-muted-foreground">
                    Lista apenas leads e clientes com análise ou documentação
                    aprovada.
                  </p>
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

            <FormSection title="Composição financeira">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="valor">Valor de venda (R$) *</Label>
                  <Input
                    id="valor"
                    inputMode="numeric"
                    value={form.valor}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        valor: maskMoneyInput(e.target.value),
                      }))
                    }
                    placeholder="0,00"
                    required
                  />
                </div>

                <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-3 space-y-2">
                  <div>
                    <Label
                      htmlFor="desconto"
                      className="text-amber-900 dark:text-amber-200"
                    >
                      Desconto do empreendimento (R$)
                    </Label>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Valor de destaque no relatório. A composição deve fechar
                      no valor com desconto.
                    </p>
                  </div>
                  <Input
                    id="desconto"
                    inputMode="numeric"
                    value={form.desconto}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        desconto: maskMoneyInput(e.target.value),
                      }))
                    }
                    placeholder="0,00"
                    className="border-amber-500/40 bg-background"
                  />
                  {moneyOrZero(form.desconto) > 0 ? (
                    <p className="text-xs text-amber-900/80 dark:text-amber-200/80 tabular-nums">
                      Valor com desconto: {brl(formValorLiquido)}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {PROPOSTA_SIMPLES_KEYS.map((key) => (
                    <MoneyField
                      key={key}
                      id={key}
                      label={`${PROPOSTA_COMPOSICAO_LABEL[key]} (R$)`}
                      value={form[key]}
                      onChange={(value) =>
                        setForm((f) => ({ ...f, [key]: value }))
                      }
                    />
                  ))}
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                  {PROPOSTA_LISTA_KEYS.map((key) => (
                    <ParcelasQtyValueEditor
                      key={key}
                      id={key}
                      title={PROPOSTA_COMPOSICAO_LABEL[key]}
                      value={form[key]}
                      onChange={(next) =>
                        setForm((f) => ({ ...f, [key]: next }))
                      }
                    />
                  ))}
                </div>

                <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-semibold tabular-nums">
                      {brl(formTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">
                      Diferença
                    </span>
                    <span
                      className={cn(
                        "font-semibold tabular-nums",
                        formDiferenca === 0
                          ? "text-emerald-700 dark:text-emerald-300"
                          : formDiferenca < 0
                            ? "text-destructive"
                            : "text-amber-800 dark:text-amber-300",
                      )}
                    >
                      {brl(formDiferenca)}
                    </span>
                  </div>
                  <p className="sm:col-span-2 text-[11px] text-muted-foreground">
                    Total = soma dos campos + (quantidade × valor) das parcelas.
                    Diferença = (valor de venda − desconto) − total.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
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
                  <div className="sm:col-span-2 space-y-1.5">
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

function MoneyField({
  id,
  label,
  value,
  onChange,
}: {
  id: PropostaSimplesKey;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(maskMoneyInput(e.target.value))}
        placeholder="0,00"
      />
    </div>
  );
}

function ParcelasQtyValueEditor({
  id,
  title,
  value,
  onChange,
}: {
  id: string;
  title: string;
  value: ParcelasForm;
  onChange: (next: ParcelasForm) => void;
}) {
  const q = parseQuantidade(value.quantidade);
  const unit = moneyOrZero(value.valor);
  const subtotal = q * unit;

  return (
    <div className="flex h-full flex-col rounded-xl border border-border/70 bg-card/40 p-3 space-y-3">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-[11px] text-muted-foreground tabular-nums">
          Subtotal {brl(subtotal)}
          {q > 0 && unit > 0 ? ` · ${q} × ${brl(unit)}` : ""}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-qtd`}>Quantidade</Label>
          <Input
            id={`${id}-qtd`}
            inputMode="numeric"
            placeholder="0"
            value={value.quantidade}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
              onChange({ ...value, quantidade: digits });
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-valor`}>Valor (R$)</Label>
          <Input
            id={`${id}-valor`}
            inputMode="numeric"
            placeholder="0,00"
            value={value.valor}
            onChange={(e) =>
              onChange({
                ...value,
                valor: maskMoneyInput(e.target.value),
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
