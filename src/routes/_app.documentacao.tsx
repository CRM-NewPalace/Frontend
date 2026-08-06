import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { brl, type Lead } from "@/lib/crm-types";
import { getSession } from "@/lib/auth";
import { canViewTeamData } from "@/lib/permissions";
import { useLeads } from "@/lib/leads-store";
import { useCatalog } from "@/lib/catalog-store";
import { ApiError } from "@/lib/api";
import {
  formatPhone,
  isValidPhone,
  PHONE_INVALID_MESSAGE,
  PHONE_PLACEHOLDER,
} from "@/lib/phone";
import {
  createDocumentacao,
  deleteDocumentacao,
  fetchDocumentacoes,
  updateDocumentacao,
  DEFAULT_DOCUMENTACAO_FONTES,
  DEFAULT_STATUS1,
  DEFAULT_STATUS2,
  displayFonte,
  type CreateDocumentacaoInput,
  type Documentacao,
} from "@/lib/documentacao-api";
import {
  dedupeStatusOptions,
  isStatusAnalise,
  isStatusVendido,
  statusesMatch,
} from "@/lib/documentacao-status";

function docInVendaPeriod(
  doc: { dataVenda: string | null; createdAt: string },
  de?: string | null,
  ate?: string | null,
): boolean {
  if (!de && !ate) return true;
  const vendaDay = doc.dataVenda?.slice(0, 10) ?? "";
  const cadastroDay = doc.createdAt.slice(0, 10);
  const inRange = (day: string) => {
    if (!day) return false;
    if (de && day < de) return false;
    if (ate && day > ate) return false;
    return true;
  };
  // Mesmo critério do backend: data de venda ou cadastro no período
  return inRange(vendaDay) || inRange(cadastroDay);
}
import {
  dedupeImportDocs,
  downloadDocumentacaoImportTemplate,
  exportDocumentacoesToExcel,
  exportDocumentacoesToPdf,
  normalizePersonName,
  parseDocumentacoesFile,
  placeholderClientPhone,
  type ParsedImportDoc,
} from "@/lib/documentacao-io";
import {
  CONSTRUTORA_CORES_PRESET,
  construtoraBadgeStyle,
  createConstrutora,
  fetchConstrutoras,
  type Construtora,
} from "@/lib/construtoras-api";
import {
  createEmpreendimento,
  fetchEmpreendimentos,
  type Empreendimento,
} from "@/lib/empreendimentos-api";
import { createUser } from "@/lib/users-api";
import { CorPicker } from "@/components/cor-picker";
import { fetchEquipeGerentes, type EquipeOptionUser } from "@/lib/equipes-api";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FolderOpen,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  Building,
  Building2,
  Filter,
  Search,
  X,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  XCircle,
  Clock3,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export const Route = createFileRoute("/_app/documentacao")({
  head: () => ({ meta: [{ title: "Documentação — Zone Connection" }] }),
  component: DocumentacaoPage,
});

type FormState = {
  contatoId: string;
  novoCliente: boolean;
  nome: string;
  construtoraId: string;
  empreendimentoId: string;
  fonte: string;
  status1: string;
  status2: string;
  corretorId: string;
  gerenteId: string;
  dataAnalise: string;
  dataVenda: string;
  vgv: string;
  obs: string;
  temEntrada: boolean;
  valorEntrada: string;
  temFgts: boolean;
  valorFgts: string;
  temDependente: boolean;
};

const emptyForm = (): FormState => ({
  contatoId: "",
  novoCliente: false,
  nome: "",
  construtoraId: "",
  empreendimentoId: "",
  fonte: "Outro",
  status1: "Análise",
  status2: "Andamento",
  corretorId: "",
  gerenteId: "",
  dataAnalise: "",
  dataVenda: "",
  vgv: "",
  obs: "",
  temEntrada: false,
  valorEntrada: "",
  temFgts: false,
  valorFgts: "",
  temDependente: false,
});

function todayDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

type DocPeriodo = "todos" | "7d" | "30d" | "mes" | "custom";
type DocCampoData = "createdAt" | "dataAnalise" | "dataVenda";

const PERIODO_DOC_OPTIONS: { value: DocPeriodo; label: string }[] = [
  { value: "todos", label: "Todo o período" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "mes", label: "Mês atual" },
  { value: "custom", label: "Personalizado" },
];

const CAMPO_DATA_OPTIONS: { value: DocCampoData; label: string }[] = [
  { value: "createdAt", label: "Cadastro" },
  { value: "dataAnalise", label: "Análise" },
  { value: "dataVenda", label: "Venda" },
];

function toIsoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function resolveDocPeriodRange(
  periodo: DocPeriodo,
  de: string,
  ate: string,
): { de: string | null; ate: string | null } {
  if (periodo === "todos") return { de: null, ate: null };
  if (periodo === "custom") {
    return { de: de || null, ate: ate || null };
  }
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  if (periodo === "7d") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { de: toIsoDay(from), ate: toIsoDay(today) };
  }
  if (periodo === "30d") {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { de: toIsoDay(from), ate: toIsoDay(today) };
  }
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { de: toIsoDay(from), ate: toIsoDay(to) };
}

function docDateDay(doc: Documentacao, campo: DocCampoData): string | null {
  if (campo === "createdAt") return toDateInput(doc.createdAt);
  if (campo === "dataAnalise") return toDateInput(doc.dataAnalise);
  return toDateInput(doc.dataVenda);
}

function formatDayBr(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");
}

function DocumentacaoPage() {
  const user = getSession();
  const isManager = user ? canViewTeamData(user.role) : false;
  const isAdmin = user?.role === "admin";
  const isAnalista = user?.role === "analista";

  function canMutateDoc(doc: Documentacao): boolean {
    if (!user) return false;
    // Admin edita só fichas de análise (autor analista/admin).
    if (user.role === "admin") {
      return doc.autor.role === "analista" || doc.autor.role === "admin";
    }
    if (user.role === "analista") {
      return doc.autor.id === user.id || doc.autor.role === "admin";
    }
    // Corretor: só as próprias. Gerente só visualiza fichas de análise.
    if (user.role === "corretor") {
      return doc.autor.id === user.id;
    }
    if (user.role === "gerente") {
      return false;
    }
    return false;
  }
  const { leads, assignees, loading: leadsLoading, addLead, refresh: refreshLeads } =
    useLeads();
  const {
    funnelStages,
    defaultStageId,
    origens,
    documentacaoFontes,
    documentacaoStatus1,
    documentacaoStatus2,
    addItem,
  } = useCatalog();
  const fonteCatalog =
    documentacaoFontes.length > 0
      ? documentacaoFontes
      : [...DEFAULT_DOCUMENTACAO_FONTES];
  const status1Catalog =
    documentacaoStatus1.length > 0
      ? documentacaoStatus1
      : [...DEFAULT_STATUS1];
  const status2Catalog =
    documentacaoStatus2.length > 0
      ? documentacaoStatus2
      : [...DEFAULT_STATUS2];
  const canQuickCreateEmpreendimento =
    user?.role === "admin" || user?.role === "gerente";
  const canCreateStatus = true;

  const [items, setItems] = useState<Documentacao[]>([]);
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [gerentes, setGerentes] = useState<EquipeOptionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCorretorId, setFilterCorretorId] = useState<string>("__all__");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus1, setFilterStatus1] = useState("__all__");
  const [filterStatus2, setFilterStatus2] = useState("__all__");
  const [filterFonte, setFilterFonte] = useState("__all__");
  const [filterConstrutoraId, setFilterConstrutoraId] = useState("__all__");
  const [filterEmpreendimentoId, setFilterEmpreendimentoId] =
    useState("__all__");
  const [filterTipo, setFilterTipo] = useState("__all__");
  const [filterGerenteId, setFilterGerenteId] = useState("__all__");
  const [filterPeriodo, setFilterPeriodo] = useState<DocPeriodo>("mes");
  const [filterCampoData, setFilterCampoData] =
    useState<DocCampoData>("createdAt");
  const [filterDataDe, setFilterDataDe] = useState("");
  const [filterDataAte, setFilterDataAte] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showCondicoesCliente, setShowCondicoesCliente] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return window.localStorage.getItem("doc-show-condicoes") !== "0";
    } catch {
      return true;
    }
  });

  function toggleCondicoesCliente() {
    setShowCondicoesCliente((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("doc-show-condicoes", next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  const importInputRef = useRef<HTMLInputElement>(null);
  const [importHelpOpen, setImportHelpOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ParsedImportDoc[]>([]);
  const [importParsing, setImportParsing] = useState(false);
  const [importSaving, setImportSaving] = useState(false);
  const [importFileName, setImportFileName] = useState("");

  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit" | "view">(
    "create",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickNome, setQuickNome] = useState("");
  const [quickContato, setQuickContato] = useState("");
  const [quickCor, setQuickCor] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  const [empOpen, setEmpOpen] = useState(false);
  const [empNome, setEmpNome] = useState("");
  const [empCidade, setEmpCidade] = useState("");
  const [empCor, setEmpCor] = useState("");
  const [empSaving, setEmpSaving] = useState(false);

  const [statusOpen, setStatusOpen] = useState<"status1" | "status2" | null>(
    null,
  );
  const [statusLabel, setStatusLabel] = useState("");
  const [extraStatus1, setExtraStatus1] = useState<string[]>([]);
  const [extraStatus2, setExtraStatus2] = useState<string[]>([]);

  const [fonteOpen, setFonteOpen] = useState(false);
  const [fonteLabel, setFonteLabel] = useState("");
  const [extraFontes, setExtraFontes] = useState<string[]>([]);

  const stageLabel = useCallback(
    (slug: string) => funnelStages.find((s) => s.id === slug)?.name ?? slug,
    [funnelStages],
  );

  const stageBadgeClass = useCallback(
    (slug: string) =>
      funnelStages.find((s) => s.id === slug)?.color ??
      "bg-secondary text-secondary-foreground",
    [funnelStages],
  );

  const corretorOptions = useMemo(
    () => assignees.filter((a) => !a.role || a.role === "corretor"),
    [assignees],
  );
  const gerenteOptions = useMemo<EquipeOptionUser[]>(() => {
    const options =
      gerentes.length > 0
        ? gerentes
        : assignees
            .filter((a) => a.role === "gerente" || a.role === "admin")
            .map((a) => ({
              id: a.id,
              name: a.name,
              email: "",
              status: "ativo" as const,
            }));
    const fromCorretorEquipe = assignees.flatMap((a) =>
      a.gerente
        ? [
            {
              id: a.gerente.id,
              name: a.gerente.name,
              email: "",
              status: "ativo" as const,
            },
          ]
        : [],
    );
    const managerFromDocs = items.flatMap((doc) =>
      doc.gerente
        ? [
            {
              id: doc.gerente.id,
              name: doc.gerente.name,
              email: "",
              status: "ativo" as const,
            },
          ]
        : [],
    );
    return [...options, ...fromCorretorEquipe, ...managerFromDocs].filter(
      (option, index, all) =>
        all.findIndex((candidate) => candidate.id === option.id) === index,
    );
  }, [gerentes, assignees, items]);

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

  const contatoOptions = useMemo(() => {
    return [...visibleLeads].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR"),
    );
  }, [visibleLeads]);

  const status1Options = useMemo(() => {
    return dedupeStatusOptions(
      [
        ...status1Catalog,
        ...extraStatus1,
        ...items.map((i) => i.status1),
        form.status1,
      ],
      "status1",
    );
  }, [status1Catalog, extraStatus1, items, form.status1]);

  const status2Options = useMemo(() => {
    return dedupeStatusOptions(
      [
        ...status2Catalog,
        ...extraStatus2,
        ...items.map((i) => i.status2),
        form.status2,
      ],
      "status2",
    );
  }, [status2Catalog, extraStatus2, items, form.status2]);

  const fonteOptions = useMemo(() => {
    const set = new Set<string>([
      ...fonteCatalog,
      ...extraFontes,
      ...items.map((i) => displayFonte(i.fonte)).filter(Boolean),
      displayFonte(form.fonte),
    ]);
    return [...set].filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [fonteCatalog, extraFontes, items, form.fonte]);

  const loadLookups = useCallback(async () => {
    try {
      const [c, e] = await Promise.all([
        fetchConstrutoras(),
        fetchEmpreendimentos({ ativo: true }),
      ]);
      setConstrutoras(c);
      setEmpreendimentos(e);
      if (user?.role === "admin") {
        try {
          setGerentes(await fetchEquipeGerentes());
        } catch {
          setGerentes([]);
        }
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar construtoras/empreendimentos.",
      );
    }
  }, [user?.role]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchDocumentacoes());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as documentações.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const periodRange = useMemo(
    () => resolveDocPeriodRange(filterPeriodo, filterDataDe, filterDataAte),
    [filterPeriodo, filterDataDe, filterDataAte],
  );

  const filteredItems = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    return items.filter((doc) => {
      if (
        filterStatus1 !== "__all__" &&
        !statusesMatch(doc.status1, filterStatus1)
      ) {
        return false;
      }
      if (
        filterStatus2 !== "__all__" &&
        !statusesMatch(doc.status2, filterStatus2)
      ) {
        return false;
      }
      if (filterFonte !== "__all__" && displayFonte(doc.fonte) !== filterFonte) {
        return false;
      }
      if (
        filterConstrutoraId !== "__all__" &&
        doc.construtoraId !== filterConstrutoraId
      ) {
        return false;
      }
      if (
        filterEmpreendimentoId !== "__all__" &&
        doc.empreendimentoId !== filterEmpreendimentoId
      ) {
        return false;
      }
      if (filterTipo !== "__all__" && doc.tipoContato !== filterTipo) {
        return false;
      }
      if (filterCorretorId !== "__all__") {
        const corretorId = doc.corretorId ?? doc.lead.corretorId;
        if (corretorId !== filterCorretorId) return false;
      }
      if (filterGerenteId !== "__all__" && doc.gerenteId !== filterGerenteId) {
        return false;
      }
      if (periodRange.de || periodRange.ate) {
        const day = docDateDay(doc, filterCampoData);
        if (!day) return false;
        if (periodRange.de && day < periodRange.de) return false;
        if (periodRange.ate && day > periodRange.ate) return false;
      } else if (filterCampoData !== "createdAt") {
        // Com "todo o período", Data por Análise/Venda ainda restringe
        // às fichas que têm essa data preenchida.
        if (!docDateDay(doc, filterCampoData)) return false;
      }
      if (!q) return true;
      const hay = [
        doc.nome,
        doc.construtora?.nome,
        doc.empreendimento?.nome,
        doc.corretor?.name,
        doc.gerente?.name,
        doc.lead.nome,
        doc.status1,
        doc.status2,
        displayFonte(doc.fonte),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [
    items,
    filterSearch,
    filterStatus1,
    filterStatus2,
    filterFonte,
    filterConstrutoraId,
    filterEmpreendimentoId,
    filterTipo,
    filterCorretorId,
    filterGerenteId,
    periodRange,
    filterCampoData,
  ]);

  const pipelineSummary = useMemo(() => {
    const base = filteredItems.reduce(
      (summary, doc) => {
        const raw = doc.status1
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        if (raw.startsWith("reprov")) summary.reprovadas += 1;
        else if (raw.startsWith("aprov")) summary.aprovadas += 1;
        else if (raw.includes("analise")) summary.emAnalise += 1;
        return summary;
      },
      { aprovadas: 0, reprovadas: 0, emAnalise: 0, vgv: 0 },
    );

    // VGV: mesmo critério do dashboard (status vendido + data venda ou cadastro no período)
    const vgvItems = items.filter((doc) => {
      if (!isStatusVendido(doc.status2)) return false;
      if (filterStatus1 !== "__all__" && !statusesMatch(doc.status1, filterStatus1)) {
        return false;
      }
      if (filterStatus2 !== "__all__" && !statusesMatch(doc.status2, filterStatus2)) {
        return false;
      }
      if (filterFonte !== "__all__" && displayFonte(doc.fonte) !== filterFonte) {
        return false;
      }
      if (
        filterConstrutoraId !== "__all__" &&
        doc.construtoraId !== filterConstrutoraId
      ) {
        return false;
      }
      if (
        filterEmpreendimentoId !== "__all__" &&
        doc.empreendimentoId !== filterEmpreendimentoId
      ) {
        return false;
      }
      if (filterTipo !== "__all__" && doc.tipoContato !== filterTipo) {
        return false;
      }
      if (filterCorretorId !== "__all__" && doc.corretorId !== filterCorretorId) {
        return false;
      }
      if (filterGerenteId !== "__all__" && doc.gerenteId !== filterGerenteId) {
        return false;
      }
      const q = filterSearch.trim().toLowerCase();
      if (q) {
        const hay = [
          doc.nome,
          doc.construtora?.nome,
          doc.empreendimento?.nome,
          doc.status1,
          doc.status2,
          doc.corretor?.name,
          doc.gerente?.name,
          displayFonte(doc.fonte),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return docInVendaPeriod(doc, periodRange.de, periodRange.ate);
    });

    base.vgv = vgvItems.reduce((sum, doc) => sum + (doc.vgv ?? 0), 0);
    return base;
  }, [
    filteredItems,
    items,
    filterStatus1,
    filterStatus2,
    filterFonte,
    filterConstrutoraId,
    filterEmpreendimentoId,
    filterTipo,
    filterCorretorId,
    filterGerenteId,
    filterSearch,
    periodRange,
  ]);

  const filterEmpreendimentoOptions = useMemo(() => {
    if (filterConstrutoraId === "__all__") return empreendimentos;
    return empreendimentos.filter(
      (e) => !e.construtoraId || e.construtoraId === filterConstrutoraId,
    );
  }, [empreendimentos, filterConstrutoraId]);

  type ActiveFilterChip = {
    id: string;
    label: string;
    onClear: () => void;
  };

  const advancedFiltersCount = useMemo(() => {
    let n = 0;
    if (filterStatus1 !== "__all__") n += 1;
    if (filterStatus2 !== "__all__") n += 1;
    if (filterFonte !== "__all__") n += 1;
    if (filterTipo !== "__all__") n += 1;
    if (filterConstrutoraId !== "__all__") n += 1;
    if (filterEmpreendimentoId !== "__all__") n += 1;
    if (filterCorretorId !== "__all__") n += 1;
    if (filterGerenteId !== "__all__") n += 1;
    return n;
  }, [
    filterStatus1,
    filterStatus2,
    filterFonte,
    filterTipo,
    filterConstrutoraId,
    filterEmpreendimentoId,
    filterCorretorId,
    filterGerenteId,
  ]);

  const activeFilterChips = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filterSearch.trim()) {
      chips.push({
        id: "search",
        label: `Busca: ${filterSearch.trim()}`,
        onClear: () => setFilterSearch(""),
      });
    }
    if (filterPeriodo !== "todos") {
      const campo =
        CAMPO_DATA_OPTIONS.find((o) => o.value === filterCampoData)?.label ??
        "Cadastro";
      let label = `Período (${campo}): `;
      if (filterPeriodo === "custom") {
        const de = filterDataDe ? formatDayBr(filterDataDe) : "…";
        const ate = filterDataAte ? formatDayBr(filterDataAte) : "…";
        label += `${de} – ${ate}`;
      } else {
        label +=
          PERIODO_DOC_OPTIONS.find((o) => o.value === filterPeriodo)?.label ??
          filterPeriodo;
      }
      chips.push({
        id: "periodo",
        label,
        onClear: () => {
          setFilterPeriodo("todos");
          setFilterDataDe("");
          setFilterDataAte("");
          setFilterCampoData("createdAt");
        },
      });
    } else if (filterCampoData !== "createdAt") {
      const campo =
        CAMPO_DATA_OPTIONS.find((o) => o.value === filterCampoData)?.label ??
        filterCampoData;
      chips.push({
        id: "campo-data",
        label: `Só com data de ${campo.toLowerCase()}`,
        onClear: () => setFilterCampoData("createdAt"),
      });
    }
    if (filterStatus1 !== "__all__") {
      chips.push({
        id: "status1",
        label: `Status 1: ${filterStatus1}`,
        onClear: () => setFilterStatus1("__all__"),
      });
    }
    if (filterStatus2 !== "__all__") {
      chips.push({
        id: "status2",
        label: `Status 2: ${filterStatus2}`,
        onClear: () => setFilterStatus2("__all__"),
      });
    }
    if (filterFonte !== "__all__") {
      chips.push({
        id: "fonte",
        label: `Fonte: ${displayFonte(filterFonte)}`,
        onClear: () => setFilterFonte("__all__"),
      });
    }
    if (filterConstrutoraId !== "__all__") {
      chips.push({
        id: "construtora",
        label: `Construtora: ${
          construtoras.find((c) => c.id === filterConstrutoraId)?.nome ?? "—"
        }`,
        onClear: () => {
          setFilterConstrutoraId("__all__");
          setFilterEmpreendimentoId("__all__");
        },
      });
    }
    if (filterEmpreendimentoId !== "__all__") {
      chips.push({
        id: "empreendimento",
        label: `Empreendimento: ${
          empreendimentos.find((e) => e.id === filterEmpreendimentoId)?.nome ??
          "—"
        }`,
        onClear: () => setFilterEmpreendimentoId("__all__"),
      });
    }
    if (filterTipo !== "__all__") {
      chips.push({
        id: "tipo",
        label: `Tipo: ${filterTipo === "cliente" ? "Cliente" : "Lead"}`,
        onClear: () => setFilterTipo("__all__"),
      });
    }
    if (filterCorretorId !== "__all__") {
      chips.push({
        id: "corretor",
        label: `Corretor: ${
          corretorOptions.find((a) => a.id === filterCorretorId)?.name ?? "—"
        }`,
        onClear: () => setFilterCorretorId("__all__"),
      });
    }
    if (filterGerenteId !== "__all__") {
      chips.push({
        id: "gerente",
        label: `Gerente: ${
          gerenteOptions.find((a) => a.id === filterGerenteId)?.name ?? "—"
        }`,
        onClear: () => setFilterGerenteId("__all__"),
      });
    }
    return chips;
  }, [
    filterSearch,
    filterPeriodo,
    filterCampoData,
    filterDataDe,
    filterDataAte,
    filterStatus1,
    filterStatus2,
    filterFonte,
    filterConstrutoraId,
    filterEmpreendimentoId,
    filterTipo,
    filterCorretorId,
    filterGerenteId,
    construtoras,
    empreendimentos,
    corretorOptions,
    gerenteOptions,
  ]);

  const activeFiltersCount = activeFilterChips.length;

  function clearAllFilters() {
    setFilterSearch("");
    setFilterStatus1("__all__");
    setFilterStatus2("__all__");
    setFilterFonte("__all__");
    setFilterConstrutoraId("__all__");
    setFilterEmpreendimentoId("__all__");
    setFilterTipo("__all__");
    setFilterCorretorId("__all__");
    setFilterGerenteId("__all__");
    setFilterPeriodo("todos");
    setFilterCampoData("createdAt");
    setFilterDataDe("");
    setFilterDataAte("");
  }

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function gerenteIdOfCorretor(corretorId: string): string {
    if (!corretorId) return "";
    return assignees.find((a) => a.id === corretorId)?.gerenteId ?? "";
  }

  function applyContact(contact: Lead) {
    setForm((prev) => {
      const corretorId = contact.corretorId ?? prev.corretorId;
      const gerenteId =
        gerenteIdOfCorretor(corretorId) || prev.gerenteId;
      const dataAnalise =
        prev.dataAnalise ||
        (isStatusAnalise(prev.status1) ? todayDateInput() : "");
      return {
        ...prev,
        nome: contact.nome,
        corretorId,
        gerenteId,
        construtoraId: contact.construtoraId ?? prev.construtoraId,
        empreendimentoId:
          contact.empreendimentoId ?? prev.empreendimentoId,
        dataAnalise,
      };
    });
  }

  function selectContato(id: string) {
    setForm((prev) => ({
      ...prev,
      contatoId: id,
      novoCliente: false,
    }));
    const contact = leads.find((l) => l.id === id);
    if (contact) applyContact(contact);
  }

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    const base = emptyForm();
    base.dataAnalise = todayDateInput();
    if (user?.role === "corretor") {
      base.corretorId = user.id;
      base.gerenteId = gerenteIdOfCorretor(user.id);
    }
    setForm(base);
    setOpen(true);
  }

  function fillFromDoc(doc: Documentacao) {
    setForm({
      contatoId: doc.leadId,
      novoCliente: false,
      nome: doc.nome,
      construtoraId: doc.construtoraId ?? "",
      empreendimentoId: doc.empreendimentoId ?? "",
      fonte: doc.fonte,
      status1: doc.status1,
      status2: doc.status2,
      corretorId: doc.corretorId ?? "",
      gerenteId: doc.gerenteId ?? "",
      dataAnalise: toDateInput(doc.dataAnalise),
      dataVenda: toDateInput(doc.dataVenda),
      vgv: doc.vgv != null ? String(doc.vgv) : "",
      obs: doc.obs ?? "",
      temEntrada: doc.temEntrada ?? false,
      valorEntrada:
        doc.valorEntrada != null ? String(doc.valorEntrada) : "",
      temFgts: doc.temFgts ?? false,
      valorFgts: doc.valorFgts != null ? String(doc.valorFgts) : "",
      temDependente: doc.temDependente ?? false,
    });
  }

  function openView(doc: Documentacao) {
    setFormMode("view");
    setEditingId(doc.id);
    fillFromDoc(doc);
    setOpen(true);
  }

  function openEdit(doc: Documentacao) {
    setFormMode("edit");
    setEditingId(doc.id);
    fillFromDoc(doc);
    setOpen(true);
  }

  function buildPayload(leadId: string): CreateDocumentacaoInput | null {
    if (form.nome.trim().length < 2) {
      toast.error("Informe o nome.");
      return null;
    }
    if (!form.status1.trim() || !form.status2.trim()) {
      toast.error("Informe os status.");
      return null;
    }

    const vgvDigits = form.vgv.replace(/\D/g, "");
    const entradaDigits = form.valorEntrada.replace(/\D/g, "");
    const fgtsDigits = form.valorFgts.replace(/\D/g, "");
    return {
      leadId,
      nome: form.nome.trim(),
      construtoraId: form.construtoraId || null,
      empreendimentoId: form.empreendimentoId || null,
      fonte: form.fonte,
      status1: form.status1.trim(),
      status2: form.status2.trim(),
      corretorId: form.corretorId || null,
      gerenteId: form.gerenteId || null,
      dataAnalise: form.dataAnalise || null,
      dataVenda: form.dataVenda || null,
      vgv: vgvDigits ? Number(vgvDigits) : null,
      obs: form.obs.trim() || null,
      temEntrada: form.temEntrada,
      valorEntrada: form.temEntrada
        ? entradaDigits
          ? Number(entradaDigits)
          : null
        : null,
      temFgts: form.temFgts,
      valorFgts: form.temFgts
        ? fgtsDigits
          ? Number(fgtsDigits)
          : null
        : null,
      temDependente: form.temDependente,
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (formMode === "view") return;

    setSaving(true);
    try {
      let leadId = form.contatoId;
      const criarClienteNovo =
        formMode === "create" &&
        (form.novoCliente || !leadId);

      if (criarClienteNovo) {
        if (form.nome.trim().length < 2) {
          toast.error("Informe o nome do cliente.");
          return;
        }
        const nomeNorm = normalizePersonName(form.nome);
        const existingByName = leads.find(
          (l) => normalizePersonName(l.nome) === nomeNorm,
        );
        if (existingByName) {
          leadId = existingByName.id;
        } else {
          const telefone = placeholderClientPhone(form.nome.trim());
          const created = await addLead({
            tipo: "cliente",
            nome: form.nome.trim(),
            telefone,
            email: `cliente.${Date.now().toString(36)}@pendente.local`,
            origem: origens[0] ?? "Documentação",
            interesse: "Comprar",
            cidade: "",
            bairro: "",
            stage: defaultStageId,
            corretorId: form.corretorId || undefined,
          });
          leadId = created.id;
        }
      }

      if (!leadId && formMode === "edit") {
        toast.error("Contato inválido.");
        return;
      }

      const payload = buildPayload(leadId);
      if (!payload) return;

      if (formMode === "create") {
        await createDocumentacao(payload);
        toast.success(
          criarClienteNovo
            ? "Cliente e documentação criados."
            : "Documentação criada.",
        );
      } else if (editingId) {
        const { leadId: _leadId, ...patch } = payload;
        await updateDocumentacao(editingId, patch);
        toast.success("Documentação atualizada.");
      }
      setOpen(false);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteDocumentacao(deleteId);
      toast.success("Documentação excluída.");
      setDeleteId(null);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível excluir.",
      );
    }
  }

  async function handleQuickCreate(e: FormEvent) {
    e.preventDefault();
    if (!canQuickCreateEmpreendimento) return;
    if (quickNome.trim().length < 2) {
      toast.error("Informe o nome da construtora.");
      return;
    }
    if (quickContato.trim() && !isValidPhone(quickContato)) {
      toast.error(PHONE_INVALID_MESSAGE);
      return;
    }
    setQuickSaving(true);
    try {
      const created = await createConstrutora({
        nome: quickNome.trim(),
        contato: quickContato.trim() || undefined,
        cor: quickCor.trim() || undefined,
      });
      await loadLookups();
      setField("construtoraId", created.id);
      setQuickOpen(false);
      setQuickNome("");
      setQuickContato("");
      setQuickCor("");
      toast.success("Construtora criada.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível criar.",
      );
    } finally {
      setQuickSaving(false);
    }
  }

  function openQuickEmpreendimento() {
    if (!form.construtoraId) {
      toast.error(
        "Selecione a construtora antes de cadastrar um empreendimento.",
      );
      return;
    }
    setEmpNome("");
    setEmpCidade("");
    setEmpCor("");
    setEmpOpen(true);
  }

  async function handleQuickCreateEmpreendimento(e: FormEvent) {
    e.preventDefault();
    if (!form.construtoraId) return;
    if (empNome.trim().length < 2) {
      toast.error("Informe o nome do empreendimento.");
      return;
    }
    setEmpSaving(true);
    try {
      const created = await createEmpreendimento({
        nome: empNome.trim(),
        construtoraId: form.construtoraId,
        cidade: empCidade.trim() || undefined,
        cor: empCor.trim() || undefined,
      });
      await loadLookups();
      setField("empreendimentoId", created.id);
      setEmpOpen(false);
      toast.success("Empreendimento cadastrado e selecionado.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível cadastrar o empreendimento.",
      );
    } finally {
      setEmpSaving(false);
    }
  }

  async function handleQuickCreateStatus(e: FormEvent) {
    e.preventDefault();
    if (!statusOpen) return;
    const label = statusLabel.trim();
    if (label.length < 2) {
      toast.error("Informe o nome do status.");
      return;
    }
    try {
      await addItem({
        type:
          statusOpen === "status1"
            ? "documentacao_status1"
            : "documentacao_status2",
        label,
      });
    } catch {
      // se já existir no catálogo, segue só selecionando
      if (statusOpen === "status1") {
        setExtraStatus1((prev) =>
          prev.includes(label) ? prev : [...prev, label],
        );
      } else {
        setExtraStatus2((prev) =>
          prev.includes(label) ? prev : [...prev, label],
        );
      }
    }
    setField(statusOpen, label);
    setStatusOpen(null);
    setStatusLabel("");
    toast.success("Status adicionado e selecionado.");
  }

  async function handleQuickCreateFonte(e: FormEvent) {
    e.preventDefault();
    const label = fonteLabel.trim();
    if (label.length < 2) {
      toast.error("Informe o nome da fonte.");
      return;
    }
    try {
      await addItem({ type: "documentacao_fonte", label });
    } catch {
      setExtraFontes((prev) =>
        prev.includes(label) ? prev : [...prev, label],
      );
    }
    setField("fonte", label);
    setFonteOpen(false);
    setFonteLabel("");
    toast.success("Fonte adicionada e selecionada.");
  }


  function findLeadForImport(
    row: ParsedImportDoc,
    leadList: typeof leads,
  ): (typeof leads)[number] | undefined {
    const nome = normalizePersonName(row.nome);
    if (!nome) return undefined;
    return leadList.find((l) => normalizePersonName(l.nome) === nome);
  }

  function resolveIdByName(
    list: { id: string; nome?: string; name?: string }[],
    raw: string,
  ): string | null {
    const n = normalizePersonName(raw);
    if (!n) return null;
    const found = list.find(
      (item) => normalizePersonName(item.nome ?? item.name ?? "") === n,
    );
    return found?.id ?? null;
  }

  function catalogHasLabel(labels: string[], raw: string) {
    const n = normalizePersonName(raw);
    if (!n) return false;
    return labels.some((l) => normalizePersonName(l) === n);
  }

  function importEmailFromName(name: string, role: string) {
    const slug =
      name
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "")
        .slice(0, 40) || role;
    return `${role}.${slug}.${Date.now().toString(36)}@example.com`;
  }

  function importTempPassword() {
    return `Import${Date.now().toString(36)}Aa1`;
  }


  async function handleImportFile(file: File) {
    setImportParsing(true);
    setImportFileName(file.name);
    try {
      const rows = dedupeImportDocs(await parseDocumentacoesFile(file));
      if (rows.length === 0) {
        toast.error("Nenhuma linha encontrada no arquivo.");
        return;
      }
      setImportRows(rows);
      setImportOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao ler o arquivo.",
      );
    } finally {
      setImportParsing(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  async function confirmImport() {
    const valid = importRows.filter((r) => !r.error);
    if (valid.length === 0) {
      toast.error("Nenhuma ficha válida para importar.");
      return;
    }

    setImportSaving(true);
    let ok = 0;
    let fail = 0;
    let createdExtras = 0;

    const localConstrutoras = [...construtoras];
    const localEmpreendimentos = [...empreendimentos];
    const localCorretores = [...corretorOptions];
    const localGerentes = [...gerenteOptions];
    const localLeads = [...leads];
    const localFontes = [...fonteOptions];
    const localStatus1 = [...status1Options];
    const localStatus2 = [...status2Options];

    try {
      for (const row of valid) {
        try {
          // Fonte / status → catálogo
          if (row.fonte && !catalogHasLabel(localFontes, row.fonte)) {
            try {
              await addItem({ type: "documentacao_fonte", label: row.fonte });
              localFontes.push(row.fonte);
              createdExtras += 1;
            } catch {
              /* já existe */
            }
          }
          if (row.status1 && !catalogHasLabel(localStatus1, row.status1)) {
            try {
              await addItem({
                type: "documentacao_status1",
                label: row.status1,
              });
              localStatus1.push(row.status1);
              createdExtras += 1;
            } catch {
              /* já existe */
            }
          }
          if (row.status2 && !catalogHasLabel(localStatus2, row.status2)) {
            try {
              await addItem({
                type: "documentacao_status2",
                label: row.status2,
              });
              localStatus2.push(row.status2);
              createdExtras += 1;
            } catch {
              /* já existe */
            }
          }

          // Gerente
          let gerenteId = resolveIdByName(localGerentes, row.gerenteNome);
          if (!gerenteId && row.gerenteNome.trim() && isAdmin) {
            try {
              const created = await createUser({
                name: row.gerenteNome.trim(),
                email: importEmailFromName(row.gerenteNome, "gerente"),
                password: importTempPassword(),
                role: "gerente",
              });
              localGerentes.push({
                id: created.id,
                name: created.name,
                email: created.email,
                status: created.status,
              });
              gerenteId = created.id;
              createdExtras += 1;
            } catch {
              /* cota / permissão */
            }
          }

          // Corretor
          let corretorId = resolveIdByName(localCorretores, row.corretorNome);
          if (!corretorId && row.corretorNome.trim() && isAdmin) {
            try {
              const created = await createUser({
                name: row.corretorNome.trim(),
                email: importEmailFromName(row.corretorNome, "corretor"),
                password: importTempPassword(),
                role: "corretor",
              });
              localCorretores.push({
                id: created.id,
                name: created.name,
                role: created.role,
                gerenteId: gerenteId,
              });
              corretorId = created.id;
              createdExtras += 1;
            } catch {
              /* cota / permissão */
            }
          }
          if (!corretorId && user?.role === "corretor") {
            corretorId = user.id;
          }

          // Cliente / lead
          let lead = findLeadForImport(row, localLeads);
          if (!lead) {
            const telefone = placeholderClientPhone(row.nome);
            lead = await addLead({
              tipo: "cliente",
              nome: row.nome,
              telefone,
              email: `cliente.${Date.now().toString(36)}@pendente.local`,
              origem: origens[0] ?? "Documentação",
              interesse: "Comprar",
              cidade: "",
              bairro: "",
              stage: defaultStageId,
              corretorId: corretorId || undefined,
            });
            localLeads.push(lead);
            createdExtras += 1;
          }

          // Construtora
          let construtoraId = resolveIdByName(
            localConstrutoras,
            row.construtoraNome,
          );
          if (
            !construtoraId &&
            row.construtoraNome.trim() &&
            canQuickCreateEmpreendimento
          ) {
            try {
              const created = await createConstrutora({
                nome: row.construtoraNome.trim(),
              });
              localConstrutoras.push(created);
              construtoraId = created.id;
              createdExtras += 1;
            } catch {
              /* sem permissão */
            }
          }
          if (
            !construtoraId &&
            row.empreendimentoNome.trim() &&
            canQuickCreateEmpreendimento
          ) {
            const fallbackName = "Não informada";
            construtoraId = resolveIdByName(localConstrutoras, fallbackName);
            if (!construtoraId) {
              try {
                const created = await createConstrutora({ nome: fallbackName });
                localConstrutoras.push(created);
                construtoraId = created.id;
                createdExtras += 1;
              } catch {
                /* sem permissão */
              }
            }
          }

          // Empreendimento (precisa de construtora)
          let empreendimentoId = resolveIdByName(
            localEmpreendimentos,
            row.empreendimentoNome,
          );
          if (empreendimentoId && construtoraId) {
            const emp = localEmpreendimentos.find(
              (e) => e.id === empreendimentoId,
            );
            if (
              emp?.construtoraId &&
              emp.construtoraId !== construtoraId
            ) {
              empreendimentoId = null;
            }
          }
          if (
            !empreendimentoId &&
            row.empreendimentoNome.trim() &&
            construtoraId &&
            canQuickCreateEmpreendimento
          ) {
            try {
              const created = await createEmpreendimento({
                nome: row.empreendimentoNome.trim(),
                construtoraId,
              });
              localEmpreendimentos.push(created);
              empreendimentoId = created.id;
              createdExtras += 1;
            } catch {
              /* sem permissão */
            }
          }

          await createDocumentacao({
            leadId: lead.id,
            nome: row.nome,
            construtoraId,
            empreendimentoId,
            fonte: row.fonte,
            status1: row.status1,
            status2: row.status2,
            corretorId: corretorId ?? lead.corretorId ?? null,
            gerenteId:
              gerenteId ??
              resolveIdByName(localGerentes, row.gerenteNome) ??
              null,
            dataAnalise: row.dataAnalise || null,
            dataVenda: row.dataVenda || null,
            vgv: row.vgv,
            obs: row.obs || null,
          });
          ok += 1;
        } catch {
          fail += 1;
        }
      }

      setImportOpen(false);
      setImportRows([]);
      await Promise.all([loadItems(), loadLookups(), refreshLeads({ silent: true })]);
      if (ok > 0) {
        const extras =
          createdExtras > 0
            ? ` ${createdExtras} cadastro(s) novo(s) criado(s).`
            : "";
        toast.success(
          fail > 0
            ? `${ok} importada(s), ${fail} com erro.${extras}`
            : `${ok} documentação(ões) importada(s).${extras}`,
        );
      } else {
        toast.error("Não foi possível importar as fichas.");
      }
    } finally {
      setImportSaving(false);
    }
  }

  const readOnly = formMode === "view";

  return (
    <div>
      <PageHeader
        title="Documentação"
        description="Fichas operacionais vinculadas a leads e clientes."
        actions={
          <>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImportHelpOpen(false);
                  void handleImportFile(file);
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={importParsing}
              onClick={() => setImportHelpOpen(true)}
            >
              {importParsing ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-1" />
              )}
              Importar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filteredItems.length === 0}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    exportDocumentacoesToExcel(
                      filteredItems,
                      `documentacao-${new Date().toISOString().slice(0, 10)}.xlsx`,
                    )
                  }
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    exportDocumentacoesToPdf(
                      filteredItems,
                      `documentacao-${new Date().toISOString().slice(0, 10)}.pdf`,
                      user?.tenant?.name?.trim() || "Imobiliária",
                    )
                  }
                >
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={openCreate} disabled={leadsLoading} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Nova documentação
            </Button>
          </>
        }
      />

      <div className="mb-4 space-y-3">
        <div className="rounded-xl border border-border/60 bg-card/40 p-3 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="relative flex-1 min-w-[200px] lg:max-w-sm">
              <Label className="text-[11px] text-muted-foreground mb-1.5 block">
                Busca
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="Nome, construtora, status…"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="w-full sm:w-[150px]">
              <Label className="text-[11px] text-muted-foreground mb-1.5 block">
                Data por
              </Label>
              <Select
                value={filterCampoData}
                onValueChange={(v) => setFilterCampoData(v as DocCampoData)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMPO_DATA_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-[170px]">
              <Label className="text-[11px] text-muted-foreground mb-1.5 block">
                Período
              </Label>
              <Select
                value={filterPeriodo}
                onValueChange={(v) => {
                  const next = v as DocPeriodo;
                  setFilterPeriodo(next);
                  if (next !== "custom") {
                    setFilterDataDe("");
                    setFilterDataAte("");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODO_DOC_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filterPeriodo === "custom" ? (
              <>
                <div className="w-full sm:w-[150px]">
                  <Label className="text-[11px] text-muted-foreground mb-1.5 block">
                    De
                  </Label>
                  <Input
                    type="date"
                    value={filterDataDe}
                    onChange={(e) => setFilterDataDe(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-[150px]">
                  <Label className="text-[11px] text-muted-foreground mb-1.5 block">
                    Até
                  </Label>
                  <Input
                    type="date"
                    value={filterDataAte}
                    onChange={(e) => setFilterDataAte(e.target.value)}
                  />
                </div>
              </>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 lg:pb-0.5">
              <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      advancedFiltersCount > 0 &&
                        "border-primary text-primary",
                    )}
                  >
                    <Filter className="w-4 h-4 mr-1.5" />
                    Mais filtros
                    {advancedFiltersCount > 0 ? (
                      <Badge className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px]">
                        {advancedFiltersCount}
                      </Badge>
                    ) : null}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-[min(92vw,34rem)] p-0"
                >
                  <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">Filtros avançados</p>
                      <p className="text-xs text-muted-foreground">
                        Situação, imóvel e equipe
                      </p>
                    </div>
                    {advancedFiltersCount > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          setFilterStatus1("__all__");
                          setFilterStatus2("__all__");
                          setFilterFonte("__all__");
                          setFilterTipo("__all__");
                          setFilterConstrutoraId("__all__");
                          setFilterEmpreendimentoId("__all__");
                          setFilterCorretorId("__all__");
                          setFilterGerenteId("__all__");
                        }}
                      >
                        Limpar
                      </Button>
                    ) : null}
                  </div>

                  <div className="max-h-[70vh] overflow-y-auto p-4 space-y-5">
                    <div className="space-y-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Situação
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Status 1
                          </Label>
                          <Select
                            value={filterStatus1}
                            onValueChange={setFilterStatus1}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">Todos</SelectItem>
                              {status1Options.map((label) => (
                                <SelectItem key={label} value={label}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Status 2
                          </Label>
                          <Select
                            value={filterStatus2}
                            onValueChange={setFilterStatus2}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">Todos</SelectItem>
                              {status2Options.map((label) => (
                                <SelectItem key={label} value={label}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Fonte
                          </Label>
                          <Select
                            value={filterFonte}
                            onValueChange={setFilterFonte}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Todas" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">Todas</SelectItem>
                              {fonteOptions.map((label) => (
                                <SelectItem key={label} value={label}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Tipo
                          </Label>
                          <Select
                            value={filterTipo}
                            onValueChange={setFilterTipo}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">
                                Lead e cliente
                              </SelectItem>
                              <SelectItem value="lead">Lead</SelectItem>
                              <SelectItem value="cliente">Cliente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Imóvel
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Construtora
                          </Label>
                          <Select
                            value={filterConstrutoraId}
                            onValueChange={(v) => {
                              setFilterConstrutoraId(v);
                              setFilterEmpreendimentoId("__all__");
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Todas" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">Todas</SelectItem>
                              {construtoras.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Empreendimento
                          </Label>
                          <Select
                            value={filterEmpreendimentoId}
                            onValueChange={setFilterEmpreendimentoId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">Todos</SelectItem>
                              {filterEmpreendimentoOptions.map((e) => (
                                <SelectItem key={e.id} value={e.id}>
                                  {e.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {isManager ? (
                      <div className="space-y-2.5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Equipe
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                              Corretor
                            </Label>
                            <Select
                              value={filterCorretorId}
                              onValueChange={setFilterCorretorId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Todos" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">Todos</SelectItem>
                                {corretorOptions.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {a.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                              Gerente
                            </Label>
                            <Select
                              value={filterGerenteId}
                              onValueChange={setFilterGerenteId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Todos" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">Todos</SelectItem>
                                {gerenteOptions.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {a.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </PopoverContent>
              </Popover>

              {activeFiltersCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {activeFilterChips.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activeFilterChips.map((chip) => (
              <Badge
                key={chip.id}
                variant="secondary"
                className="gap-1 pl-2.5 pr-1 py-1 font-normal"
              >
                {chip.label}
                <button
                  type="button"
                  className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
                  onClick={chip.onClear}
                  aria-label={`Remover filtro ${chip.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <section className="mb-4 grid gap-3 grid-cols-2 xl:grid-cols-4">
        <FinanceKpiCard
          label="Aprovadas"
          value={pipelineSummary.aprovadas}
          icon={CheckCircle2}
          tone="emerald"
          format="number"
        />
        <FinanceKpiCard
          label="Reprovadas"
          value={pipelineSummary.reprovadas}
          icon={XCircle}
          tone="red"
          format="number"
        />
        <FinanceKpiCard
          label="Em análise"
          value={pipelineSummary.emAnalise}
          icon={Clock3}
          tone="orange"
          format="number"
        />
        <FinanceKpiCard
          label="VGV vendido"
          value={pipelineSummary.vgv}
          icon={Wallet}
          tone="teal"
          href="/vendas"
        />
      </section>

      <Card>
        <CardContent className="p-0">
          {isAnalista && !loading && items.length > 0 && (
            <div className="flex items-center justify-end gap-2 border-b border-border/60 px-3 py-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={toggleCondicoesCliente}
                title={
                  showCondicoesCliente
                    ? "Ocultar Entrada, FGTS e Dependente na tabela"
                    : "Mostrar Entrada, FGTS e Dependente na tabela"
                }
              >
                {showCondicoesCliente ? (
                  <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                )}
                {showCondicoesCliente
                  ? "Ocultar condições"
                  : "Mostrar condições"}
              </Button>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Carregando…
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <FolderOpen className="w-8 h-8 opacity-40" />
              <p>Nenhuma documentação cadastrada.</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Filter className="w-8 h-8 opacity-40" />
              <p>Nenhuma documentação para os filtros selecionados.</p>
              <Button type="button" variant="outline" size="sm" onClick={clearAllFilters}>
                Limpar filtros
              </Button>
            </div>
          ) : (
            <Table className="text-xs [&_th]:h-8 [&_th]:px-1.5 [&_th]:py-1 [&_th]:whitespace-nowrap [&_td]:px-1.5 [&_td]:py-1">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px] max-w-[160px]">Nome</TableHead>
                  <TableHead className="min-w-[72px]">Construtora</TableHead>
                  <TableHead className="min-w-[88px] max-w-[120px]">Empreend.</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[72px] max-w-[96px]">Corretor</TableHead>
                  <TableHead className="min-w-[72px] max-w-[96px]">Gerente</TableHead>
                  <TableHead className="min-w-[72px]">Fonte</TableHead>
                  {(!isAnalista || showCondicoesCliente) && (
                    <>
                      <TableHead className="min-w-[72px]">Entrada</TableHead>
                      <TableHead className="min-w-[72px]">FGTS</TableHead>
                      <TableHead className="min-w-[56px]">Dep.</TableHead>
                    </>
                  )}
                  <TableHead className="w-[84px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="max-w-[160px]">
                      <div className="font-medium truncate" title={doc.nome}>
                        {doc.nome}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-0.5 mt-0.5">
                        <span>{doc.lead.tipo === "cliente" ? "Cliente" : "Lead"}</span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] px-1 py-0 h-4 font-normal",
                            stageBadgeClass(doc.lead.stage),
                          )}
                          title="Etapa atual no funil"
                        >
                          {stageLabel(doc.lead.stage)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {doc.construtora?.nome ? (
                        <Badge
                          variant="secondary"
                          className="border-transparent font-normal text-[10px] px-1 py-0 h-5 max-w-[88px] truncate"
                          style={construtoraBadgeStyle(doc.construtora.cor)}
                          title={doc.construtora.nome}
                        >
                          {doc.construtora.nome}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {doc.empreendimento?.nome ? (
                        <Badge
                          variant="secondary"
                          className="border-transparent font-normal text-[10px] px-1 py-0 h-5 max-w-[120px] truncate"
                          style={construtoraBadgeStyle(doc.empreendimento.cor)}
                          title={doc.empreendimento.nome}
                        >
                          {doc.empreendimento.nome}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-0.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 py-0 h-5 font-normal max-w-[88px] truncate"
                          title={doc.status1}
                        >
                          {doc.status1}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1 py-0 h-5 font-normal max-w-[88px] truncate"
                          title={doc.status2}
                        >
                          {doc.status2}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const corretor =
                          doc.corretor ?? doc.lead.corretor ?? null;
                        if (!corretor?.name) return "—";
                        return (
                          <Badge
                            variant="secondary"
                            className="border-transparent font-normal text-[10px] px-1 py-0 h-5 max-w-[96px] truncate"
                            style={construtoraBadgeStyle(corretor.cor)}
                            title={corretor.name}
                          >
                            {corretor.name}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell
                      className="max-w-[96px] truncate"
                      title={doc.gerente?.name ?? undefined}
                    >
                      {doc.gerente?.name ?? "—"}
                    </TableCell>
                    <TableCell
                      className="max-w-[96px] truncate"
                      title={displayFonte(doc.fonte)}
                    >
                      {displayFonte(doc.fonte) || "—"}
                    </TableCell>
                    {(!isAnalista || showCondicoesCliente) && (
                      <>
                        <TableCell className="whitespace-nowrap text-[11px]">
                          {doc.temEntrada
                            ? doc.valorEntrada != null
                              ? brl(doc.valorEntrada)
                              : "Sim"
                            : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-[11px]">
                          {doc.temFgts
                            ? doc.valorFgts != null
                              ? brl(doc.valorFgts)
                              : "Sim"
                            : "—"}
                        </TableCell>
                        <TableCell className="text-[11px]">
                          {doc.temDependente ? "Sim" : "—"}
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <div className="flex justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openView(doc)}
                          title="Visualizar"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {canMutateDoc(doc) && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(doc)}
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setDeleteId(doc.id)}
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        icon={<FolderOpen className="w-5 h-5" />}
        title={
          formMode === "create"
            ? "Nova documentação"
            : formMode === "edit"
              ? "Editar documentação"
              : "Documentação"
        }
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <FormDialogBody>
            <FormSection title="Lead / Cliente">
              <div className="space-y-4">
                {formMode === "create" && (
                  <label className="flex items-start gap-2 rounded-lg border border-border/60 p-3 cursor-pointer hover:bg-muted/30">
                    <Checkbox
                      checked={form.novoCliente}
                      onCheckedChange={(checked) => {
                        const on = checked === true;
                        setForm((prev) => ({
                          ...prev,
                          novoCliente: on,
                          contatoId: on ? "" : prev.contatoId,
                        }));
                      }}
                      disabled={readOnly}
                      className="mt-0.5"
                    />
                    <span className="text-sm leading-snug">
                      <span className="font-medium">Cliente novo</span>
                      <span className="block text-muted-foreground text-xs">
                        Marque se o cliente ainda não está no banco — ao
                        salvar, o cadastro é criado junto com a documentação.
                      </span>
                    </span>
                  </label>
                )}

                {!form.novoCliente ? (
                  <div className="space-y-2">
                    <Label>Lead ou cliente</Label>
                    <Select
                      value={form.contatoId || "__none__"}
                      onValueChange={(v) => {
                        if (v === "__none__") {
                          setForm((prev) => ({
                            ...prev,
                            contatoId: "",
                          }));
                          return;
                        }
                        selectContato(v);
                      }}
                      disabled={readOnly || formMode === "edit"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {contatoOptions.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.nome} · {l.tipo === "cliente" ? "Cliente" : "Lead"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            </FormSection>

            <FormSection title="Dados da planilha">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={form.nome}
                    onChange={(e) => setField("nome", e.target.value)}
                    disabled={readOnly}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Construtora</Label>
                    {canQuickCreateEmpreendimento && !readOnly && (
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() => setQuickOpen(true)}
                      >
                        + Nova construtora
                      </Button>
                    )}
                  </div>
                  <Select
                    value={form.construtoraId || "__none__"}
                    onValueChange={(v) => {
                      setField("construtoraId", v === "__none__" ? "" : v);
                      setField("empreendimentoId", "");
                    }}
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {construtoras.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(() => {
                    const selected = construtoras.find(
                      (c) => c.id === form.construtoraId,
                    );
                    if (!selected?.nome) return null;
                    return (
                      <div className="pt-1">
                        <Badge
                          variant="secondary"
                          className="border-transparent"
                          style={construtoraBadgeStyle(selected.cor)}
                        >
                          {selected.nome}
                        </Badge>
                      </div>
                    );
                  })()}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Empreendimento</Label>
                    {canQuickCreateEmpreendimento && !readOnly && (
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={openQuickEmpreendimento}
                      >
                        + Novo empreendimento
                      </Button>
                    )}
                  </div>
                  <Select
                    value={form.empreendimentoId || "__none__"}
                    onValueChange={(v) =>
                      setField("empreendimentoId", v === "__none__" ? "" : v)
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {filteredEmpreendimentos.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.nome}
                          {e.cidade ? ` · ${e.cidade}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Fonte</Label>
                    {canCreateStatus && !readOnly && (
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() => {
                          setFonteLabel("");
                          setFonteOpen(true);
                        }}
                      >
                        + Nova fonte
                      </Button>
                    )}
                  </div>
                  <Select
                    value={form.fonte}
                    onValueChange={(v) => setField("fonte", v)}
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fonteOptions.map((label) => (
                        <SelectItem key={label} value={label}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Status 1</Label>
                    {canCreateStatus && !readOnly && (
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() => {
                          setStatusLabel("");
                          setStatusOpen("status1");
                        }}
                      >
                        + Novo status
                      </Button>
                    )}
                  </div>
                  <Select
                    value={form.status1}
                    onValueChange={(v) => {
                      setForm((prev) => ({
                        ...prev,
                        status1: v,
                        dataAnalise:
                          isStatusAnalise(v) && !prev.dataAnalise
                            ? todayDateInput()
                            : prev.dataAnalise,
                      }));
                    }}
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {status1Options.map((label) => (
                        <SelectItem key={label} value={label}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Status 2</Label>
                    {canCreateStatus && !readOnly && (
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() => {
                          setStatusLabel("");
                          setStatusOpen("status2");
                        }}
                      >
                        + Novo status
                      </Button>
                    )}
                  </div>
                  <Select
                    value={form.status2}
                    onValueChange={(v) => setField("status2", v)}
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {status2Options.map((label) => (
                        <SelectItem key={label} value={label}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Corretor</Label>
                  <Select
                    value={form.corretorId || "__none__"}
                    onValueChange={(v) => {
                      const corretorId = v === "__none__" ? "" : v;
                      setForm((prev) => ({
                        ...prev,
                        corretorId,
                        gerenteId: corretorId
                          ? gerenteIdOfCorretor(corretorId) || prev.gerenteId
                          : prev.gerenteId,
                      }));
                    }}
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {corretorOptions.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Gerente</Label>
                  <Select
                    value={form.gerenteId || "__none__"}
                    onValueChange={(v) =>
                      setField("gerenteId", v === "__none__" ? "" : v)
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {gerenteOptions.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataAnalise">Data análise</Label>
                  <Input
                    id="dataAnalise"
                    type="date"
                    value={form.dataAnalise}
                    onChange={(e) => setField("dataAnalise", e.target.value)}
                    disabled={readOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataVenda">Data venda</Label>
                  <Input
                    id="dataVenda"
                    type="date"
                    value={form.dataVenda}
                    onChange={(e) => setField("dataVenda", e.target.value)}
                    disabled={readOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vgv">VGV (R$)</Label>
                  <Input
                    id="vgv"
                    inputMode="numeric"
                    value={form.vgv}
                    onChange={(e) => setField("vgv", e.target.value)}
                    disabled={readOnly}
                    placeholder="Ex: 250000"
                  />
                </div>

                <div className="space-y-3 sm:col-span-2 rounded-lg border border-border/60 p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Condições do cliente
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="temEntrada">Tem entrada?</Label>
                        <Switch
                          id="temEntrada"
                          checked={form.temEntrada}
                          onCheckedChange={(checked) => {
                            setForm((prev) => ({
                              ...prev,
                              temEntrada: checked,
                              valorEntrada: checked ? prev.valorEntrada : "",
                            }));
                          }}
                          disabled={readOnly}
                        />
                      </div>
                      {form.temEntrada && (
                        <Input
                          inputMode="numeric"
                          placeholder="Valor da entrada (R$)"
                          value={form.valorEntrada}
                          onChange={(e) =>
                            setField("valorEntrada", e.target.value)
                          }
                          disabled={readOnly}
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="temFgts">Tem FGTS?</Label>
                        <Switch
                          id="temFgts"
                          checked={form.temFgts}
                          onCheckedChange={(checked) => {
                            setForm((prev) => ({
                              ...prev,
                              temFgts: checked,
                              valorFgts: checked ? prev.valorFgts : "",
                            }));
                          }}
                          disabled={readOnly}
                        />
                      </div>
                      {form.temFgts && (
                        <Input
                          inputMode="numeric"
                          placeholder="Valor do FGTS (R$)"
                          value={form.valorFgts}
                          onChange={(e) =>
                            setField("valorFgts", e.target.value)
                          }
                          disabled={readOnly}
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:col-span-2">
                      <Label htmlFor="temDependente">Tem dependente?</Label>
                      <Switch
                        id="temDependente"
                        checked={form.temDependente}
                        onCheckedChange={(checked) =>
                          setField("temDependente", checked)
                        }
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="obs">OBS</Label>
                  <Textarea
                    id="obs"
                    value={form.obs}
                    onChange={(e) => setField("obs", e.target.value)}
                    disabled={readOnly}
                    rows={3}
                  />
                </div>
              </div>
            </FormSection>
          </FormDialogBody>
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {readOnly ? "Fechar" : "Cancelar"}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Salvar
              </Button>
            )}
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <FormDialogShell
        open={quickOpen}
        onOpenChange={setQuickOpen}
        icon={<Building className="w-5 h-5" />}
        title="Nova construtora"
      >
        <form
          onSubmit={handleQuickCreate}
          className="flex flex-col flex-1 min-h-0"
        >
          <FormDialogBody>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="quickNome">Nome *</Label>
                <Input
                  id="quickNome"
                  value={quickNome}
                  onChange={(e) => setQuickNome(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quickContato">Contato</Label>
                <Input
                  id="quickContato"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={PHONE_PLACEHOLDER}
                  value={quickContato}
                  onChange={(e) => setQuickContato(formatPhone(e.target.value))}
                  maxLength={15}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quickCor">Cor do nome</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="quickCor"
                    type="color"
                    value={quickCor || "#3b82f6"}
                    onChange={(e) => setQuickCor(e.target.value)}
                    className="h-10 w-14 cursor-pointer p-1"
                  />
                  <Input
                    value={quickCor}
                    onChange={(e) => setQuickCor(e.target.value)}
                    placeholder="#3b82f6"
                    maxLength={7}
                    className="max-w-[140px] font-mono text-sm"
                  />
                  {quickNome.trim() && quickCor ? (
                    <Badge
                      variant="secondary"
                      className="border-transparent"
                      style={construtoraBadgeStyle(quickCor)}
                    >
                      {quickNome.trim()}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {CONSTRUTORA_CORES_PRESET.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      title={hex}
                      className="h-6 w-6 rounded-md border border-border"
                      style={{ backgroundColor: hex }}
                      onClick={() => setQuickCor(hex)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </FormDialogBody>
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuickOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={quickSaving}>
              {quickSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Criar
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <FormDialogShell
        open={empOpen}
        onOpenChange={setEmpOpen}
        icon={<Building2 className="w-5 h-5" />}
        title="Novo empreendimento"
      >
        <form
          onSubmit={handleQuickCreateEmpreendimento}
          className="flex flex-col flex-1 min-h-0"
        >
          <FormDialogBody>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="empNome">Nome *</Label>
                <Input
                  id="empNome"
                  value={empNome}
                  onChange={(e) => setEmpNome(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="empCidade">Cidade</Label>
                <Input
                  id="empCidade"
                  value={empCidade}
                  onChange={(e) => setEmpCidade(e.target.value)}
                />
              </div>
              <CorPicker
                id="empCor"
                value={empCor}
                onChange={setEmpCor}
                previewLabel={empNome}
              />
            </div>
          </FormDialogBody>
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEmpOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={empSaving}>
              {empSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Criar
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <FormDialogShell
        open={statusOpen !== null}
        onOpenChange={(o) => !o && setStatusOpen(null)}
        icon={<FolderOpen className="w-5 h-5" />}
        title={
          statusOpen === "status2" ? "Novo status 2" : "Novo status 1"
        }
      >
        <form
          onSubmit={handleQuickCreateStatus}
          className="flex flex-col flex-1 min-h-0"
        >
          <FormDialogBody>
            <div className="space-y-2">
              <Label htmlFor="statusLabel">Nome do status *</Label>
              <Input
                id="statusLabel"
                value={statusLabel}
                onChange={(e) => setStatusLabel(e.target.value)}
                placeholder="Ex.: Pendente documentação"
                required
              />
            </div>
          </FormDialogBody>
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusOpen(null)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              Criar
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <FormDialogShell
        open={fonteOpen}
        onOpenChange={setFonteOpen}
        icon={<FolderOpen className="w-5 h-5" />}
        title="Nova fonte"
      >
        <form
          onSubmit={handleQuickCreateFonte}
          className="flex flex-col flex-1 min-h-0"
        >
          <FormDialogBody>
            <div className="space-y-2">
              <Label htmlFor="fonteLabel">Nome da fonte *</Label>
              <Input
                id="fonteLabel"
                value={fonteLabel}
                onChange={(e) => setFonteLabel(e.target.value)}
                placeholder="Ex.: Indicação"
                required
              />
            </div>
          </FormDialogBody>
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFonteOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Criar</Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documentação?</AlertDialogTitle>
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

      <Dialog open={importHelpOpen} onOpenChange={setImportHelpOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Importar documentação</DialogTitle>
            <DialogDescription>
              Baixe o modelo Excel, preencha uma ficha por linha e mantenha os
              nomes das colunas sem alterações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium mb-1.5">Colunas do modelo</p>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-muted/60 text-left">
                      <th className="p-2 font-medium">Nome</th>
                      <th className="p-2 font-medium">Construtora</th>
                      <th className="p-2 font-medium">Empreendimento</th>
                      <th className="p-2 font-medium">Fonte</th>
                      <th className="p-2 font-medium">Status 1</th>
                      <th className="p-2 font-medium">Status 2</th>
                      <th className="p-2 font-medium">Corretor</th>
                      <th className="p-2 font-medium">Gerente</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t text-muted-foreground">
                      <td className="p-2">Maria Silva</td>
                      <td className="p-2">Cyrela</td>
                      <td className="p-2">Torre Aurora</td>
                      <td className="p-2">Indicação</td>
                      <td className="p-2">Análise</td>
                      <td className="p-2">Andamento</td>
                      <td className="p-2">Rafael Souza</td>
                      <td className="p-2">Juliana Costa</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                O modelo também contém Data Análise, Data Venda, VGV e
                Observação.
              </p>
            </div>

            <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <p className="font-medium text-foreground">
                Atribuição de corretor e gerente
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Preencha as colunas <strong>Corretor</strong> e{" "}
                <strong>Gerente</strong> com o nome completo usado no cadastro.
                O sistema procura cada profissional pelo nome e vincula a ficha
                automaticamente. Deixe a célula vazia quando não quiser fazer
                uma atribuição.
              </p>
            </div>

            <div>
              <p className="font-medium mb-1.5">Antes de importar</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>
                  <span className="text-foreground">Nome</span> é a única coluna
                  obrigatória
                </li>
                <li>
                  Se o contato não existir, o sistema cria o{" "}
                  <span className="text-foreground">cliente</span> pelo nome
                </li>
                <li>
                  Construtora, empreendimento, fonte e status são vinculados
                  pelo nome e podem ser cadastrados automaticamente, conforme
                  a permissão do usuário
                </li>
                <li>
                  Se um corretor ou gerente ainda não existir, somente um{" "}
                  <span className="text-foreground">administrador</span> poderá
                  criá-lo automaticamente; outros usuários importarão a ficha
                  sem essa atribuição
                </li>
                <li>
                  Use datas no formato{" "}
                  <span className="text-foreground">dd/mm/aaaa</span> e informe
                  o VGV somente com números
                </li>
                <li>
                  Não renomeie, remova ou reorganize os cabeçalhos do modelo
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadDocumentacaoImportTemplate()}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              Baixar modelo Excel
            </Button>
            <Button
              type="button"
              disabled={importParsing}
              onClick={() => importInputRef.current?.click()}
            >
              {importParsing ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-1" />
              )}
              Escolher arquivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Confirmar importação</DialogTitle>
            <DialogDescription>
              {importFileName ? `Arquivo: ${importFileName}. ` : ""}
              Revise as linhas antes de confirmar. Linhas inválidas serão
              ignoradas.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto flex-1 min-h-0 border rounded-md">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr className="text-left text-muted-foreground border-b">
                  <th className="p-2 font-medium">Nome</th>
                  <th className="p-2 font-medium">Empreendimento</th>
                  <th className="p-2 font-medium">Status</th>
                  <th className="p-2 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {importRows.map((row, index) => (
                  <tr
                    key={`${row.nome}-${index}`}
                    className={cn(
                      "border-b last:border-0",
                      row.error && "bg-destructive/5",
                    )}
                  >
                    <td className="p-2">{row.nome || "—"}</td>
                    <td className="p-2">{row.empreendimentoNome || "—"}</td>
                    <td className="p-2 text-xs">
                      {row.status1} · {row.status2}
                    </td>
                    <td className="p-2">
                      {row.error ? (
                        <span className="text-xs text-destructive">
                          {row.error}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            {importRows.filter((r) => !r.error).length} válido(s) ·{" "}
            {importRows.filter((r) => r.error).length} inválido(s) (serão
            ignorados)
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={importSaving}
              onClick={() => setImportOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={
                importSaving || importRows.every((r) => Boolean(r.error))
              }
              onClick={() => void confirmImport()}
            >
              {importSaving && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              Importar válidos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
