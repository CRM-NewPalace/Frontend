import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { FinanceiroFiltrosBar } from "@/components/financeiro-filtros";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ApiError } from "@/lib/api";
import {
  baixarTitulo,
  createDespesaTipo,
  createParceiro,
  createTitulo,
  createTitulosParcelado,
  deleteTitulo,
  deleteTitulosGrupo,
  fetchDespesaTipos,
  fetchParceiros,
  fetchTitulos,
  updateTitulo,
  updateTitulosGrupo,
} from "@/lib/financeiro-api";
import {
  getVistaParcelas,
  VISTA_PARCELAS_EVENT,
  type VistaParcelas,
} from "@/lib/financeiro-prefs";
import { digitsOnly, formatCpfCnpj } from "@/lib/utils";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseMoneyInput,
} from "@/lib/money-input";
import {
  brl,
  CATEGORIAS_ENTRADA,
  CATEGORIAS_SAIDA,
  formatDate,
  statusBadgeClass,
  statusLabel,
  type DespesaTipo,
  type ParceiroFinanceiro,
  type PeriodoFiltro,
  type StatusTitulo,
  type TipoParceiro,
  type TituloFinanceiro,
} from "@/lib/financeiro-mock";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Layers,
  ListOrdered,
  Loader2,
  Pencil,
  Plus,
  Tags,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const NONE = "__none__";
const FORMAS = ["Pix", "TED", "Boleto", "Dinheiro", "Cartão", "Outro"] as const;
const EXTRA_CAT_KEY = "financeiro.extraCategorias";

function loadExtras(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function saveExtras(key: string, values: string[]) {
  localStorage.setItem(key, JSON.stringify(values));
}

type QuickKind = "parceiro" | "categoria" | "centro" | null;

type FormState = {
  descricao: string;
  parceiroId: string;
  categoria: string;
  centro: string;
  vencimento: string;
  valor: string;
  status: StatusTitulo;
  parcela: string;
};

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseValor(raw: string): number {
  return parseMoneyInput(raw);
}

function formatValorInput(n: number): string {
  return formatMoneyInput(n);
}

function addMonthsIso(iso: string, months: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

type ParcelaDraft = {
  id?: string;
  vencimento: string;
  valor: string;
  label?: string;
  locked?: boolean;
};

function buildParcelasDraft(
  total: number,
  quantidade: number,
  primeiroVencimento: string,
): ParcelaDraft[] {
  const n = Math.max(2, Math.floor(quantidade));
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const remainder = cents - base * n;
  return Array.from({ length: n }, (_, i) => ({
    vencimento: addMonthsIso(primeiroVencimento, i),
    valor: formatValorInput((i === n - 1 ? base + remainder : base) / 100),
  }));
}

function emptyForm(
  tipo: "receber" | "pagar",
  defaultCentro = "",
): FormState {
  const cats = tipo === "receber" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;
  return {
    descricao: "",
    parceiroId: NONE,
    categoria: cats[0],
    centro: defaultCentro,
    vencimento: todayIso(),
    valor: "",
    status: "aberto",
    parcela: "",
  };
}

type DisplayRow =
  | { kind: "single"; titulo: TituloFinanceiro }
  | { kind: "group"; grupoId: string; titulos: TituloFinanceiro[] };

function buildDisplayRows(
  filtered: TituloFinanceiro[],
  vista: VistaParcelas,
): DisplayRow[] {
  if (vista === "lista") {
    return filtered.map((titulo) => ({ kind: "single" as const, titulo }));
  }
  const seen = new Set<string>();
  const out: DisplayRow[] = [];
  for (const t of filtered) {
    if (!t.grupoParcelasId) {
      out.push({ kind: "single", titulo: t });
      continue;
    }
    if (seen.has(t.grupoParcelasId)) continue;
    seen.add(t.grupoParcelasId);
    const titulos = filtered
      .filter((x) => x.grupoParcelasId === t.grupoParcelasId)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
    out.push({ kind: "group", grupoId: t.grupoParcelasId, titulos });
  }
  return out;
}

function groupSummary(titulos: TituloFinanceiro[]) {
  const first = titulos[0];
  const total = titulos.reduce((s, t) => s + t.valor, 0);
  const pagas = titulos.filter((t) => t.status === "pago").length;
  const abertas = titulos.filter(
    (t) => t.status === "aberto" || t.status === "atrasado",
  );
  const proxima = abertas[0] ?? first;
  let statusResumo: StatusTitulo = "aberto";
  if (pagas === titulos.length) statusResumo = "pago";
  else if (titulos.some((t) => t.status === "atrasado")) statusResumo = "atrasado";
  else if (titulos.some((t) => t.status === "cancelado") && pagas === 0)
    statusResumo = "cancelado";
  return {
    descricao: first?.descricao ?? "",
    parceiro: first?.parceiro ?? "",
    categoria: first?.categoria ?? "",
    centro: first?.centro ?? "",
    vencimento: proxima?.vencimento ?? first?.vencimento ?? "",
    total,
    n: titulos.length,
    pagas,
    statusResumo,
  };
}

export function FinanceiroTitulosPanel({
  tipo,
  title,
  description,
}: {
  tipo: "receber" | "pagar";
  title: string;
  description: string;
}) {
  const baseCategorias =
    tipo === "receber" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;
  const [items, setItems] = useState<TituloFinanceiro[]>([]);
  const [parceiros, setParceiros] = useState<ParceiroFinanceiro[]>([]);
  const [extraCategorias, setExtraCategorias] = useState<string[]>(() =>
    loadExtras(EXTRA_CAT_KEY),
  );
  const [despesaTipos, setDespesaTipos] = useState<DespesaTipo[]>([]);
  const [search, setSearch] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("tudo");
  const [status, setStatus] = useState<StatusTitulo | "todos">("todos");
  const [centro, setCentro] = useState("todos");
  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit" | "edit-grupo">(
    "create",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingGrupoId, setEditingGrupoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(tipo));
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TituloFinanceiro | null>(
    null,
  );
  const [deleteGrupoTarget, setDeleteGrupoTarget] = useState<{
    grupoId: string;
    descricao: string;
    n: number;
    pagas: number;
  } | null>(null);
  const [baixarTarget, setBaixarTarget] = useState<TituloFinanceiro | null>(
    null,
  );
  const [baixarData, setBaixarData] = useState(todayIso());
  const [baixarForma, setBaixarForma] = useState<string>(FORMAS[0]);
  const [busy, setBusy] = useState(false);
  const [quickKind, setQuickKind] = useState<QuickKind>(null);
  const [quickNome, setQuickNome] = useState("");
  const [quickDocumento, setQuickDocumento] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [parcelado, setParcelado] = useState(false);
  const [qtdParcelas, setQtdParcelas] = useState("2");
  const [parcelasDraft, setParcelasDraft] = useState<ParcelaDraft[]>([]);
  const [grupoOpen, setGrupoOpen] = useState(false);
  const [grupoTitulos, setGrupoTitulos] = useState<TituloFinanceiro[]>([]);
  const [grupoMeta, setGrupoMeta] = useState<{
    descricao: string;
    parceiro: string;
  } | null>(null);
  const [vistaParcelas, setVistaParcelasState] = useState<VistaParcelas>(() =>
    getVistaParcelas(),
  );
  const [expandedGrupos, setExpandedGrupos] = useState<Set<string>>(
    () => new Set(),
  );

  const categorias = useMemo(() => {
    const fromItems = items
      .map((t) => t.categoria)
      .filter((c) => c && c.trim());
    return Array.from(
      new Set([...baseCategorias, ...extraCategorias, ...fromItems]),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [baseCategorias, extraCategorias, items]);

  const centros = useMemo(() => {
    const fromTipos = despesaTipos
      .filter((t) => t.ativo)
      .map((t) => t.nome.trim())
      .filter(Boolean);
    const fromItems = items.map((t) => t.centro).filter((c) => c && c.trim());
    return Array.from(new Set([...fromTipos, ...fromItems])).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  }, [despesaTipos, items]);

  const load = useCallback(async () => {
    try {
      const [titulos, pars, tipos] = await Promise.all([
        fetchTitulos(tipo),
        fetchParceiros(),
        tipo === "pagar" ? fetchDespesaTipos() : Promise.resolve([]),
      ]);
      setItems(titulos);
      setParceiros(pars.filter((p) => p.ativo));
      setDespesaTipos(tipos);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os títulos.",
      );
    }
  }, [tipo]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const sync = () => setVistaParcelasState(getVistaParcelas());
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    window.addEventListener(VISTA_PARCELAS_EVENT, sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener(VISTA_PARCELAS_EVENT, sync);
    };
  }, []);

  const centroOptions = useMemo(
    () => [
      { value: "todos", label: "Todos os centros de custo" },
      ...centros.map((c) => ({ value: c, label: c })),
    ],
    [centros],
  );

  function openQuick(kind: Exclude<QuickKind, null>) {
    setQuickKind(kind);
    setQuickNome("");
    setQuickDocumento("");
  }

  async function handleQuickCreate(e: FormEvent) {
    e.preventDefault();
    const nome = quickNome.trim();
    if (nome.length < 2) {
      toast.error("Informe um nome com ao menos 2 caracteres.");
      return;
    }

    if (quickKind === "parceiro") {
      const documento = digitsOnly(quickDocumento);
      if (documento.length !== 11 && documento.length !== 14) {
        toast.error("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).");
        return;
      }
      setQuickSaving(true);
      try {
        const parceiroTipo: TipoParceiro =
          tipo === "receber" ? "cliente" : "fornecedor";
        const created = await createParceiro({
          nome,
          documento,
          tipo: parceiroTipo,
        });
        setParceiros((prev) =>
          [...prev, created].sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR"),
          ),
        );
        setForm((f) => ({ ...f, parceiroId: created.id }));
        setQuickKind(null);
        toast.success("Parceiro cadastrado.");
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível criar o parceiro.",
        );
      } finally {
        setQuickSaving(false);
      }
      return;
    }

    if (quickKind === "categoria") {
      if (categorias.some((c) => c.toLowerCase() === nome.toLowerCase())) {
        setForm((f) => ({ ...f, categoria: nome }));
        setQuickKind(null);
        return;
      }
      const next = [...extraCategorias, nome];
      setExtraCategorias(next);
      saveExtras(EXTRA_CAT_KEY, next);
      setForm((f) => ({ ...f, categoria: nome }));
      setQuickKind(null);
      toast.success("Categoria adicionada.");
      return;
    }

    if (quickKind === "centro") {
      const existing = despesaTipos.find(
        (t) => t.nome.toLowerCase() === nome.toLowerCase(),
      );
      if (existing) {
        setForm((f) => ({ ...f, centro: existing.nome }));
        setQuickKind(null);
        return;
      }
      setQuickSaving(true);
      try {
        const created = await createDespesaTipo({
          nome,
          natureza: "variavel",
          ativo: true,
        });
        setDespesaTipos((prev) =>
          [...prev, created].sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR"),
          ),
        );
        setForm((f) => ({ ...f, centro: created.nome }));
        setQuickKind(null);
        toast.success("Categoria criada no Centro de despesas.");
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível criar a categoria.",
        );
      } finally {
        setQuickSaving(false);
      }
    }
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    return items.filter((t) => {
      if (status !== "todos" && t.status !== status) return false;
      if (centro !== "todos" && t.centro !== centro) return false;
      if (periodo !== "tudo") {
        const d = new Date(t.vencimento + "T12:00:00");
        if (periodo === "mes") {
          if (
            d.getMonth() !== now.getMonth() ||
            d.getFullYear() !== now.getFullYear()
          )
            return false;
        } else if (periodo === "trimestre") {
          if (
            Math.floor(d.getMonth() / 3) !== Math.floor(now.getMonth() / 3) ||
            d.getFullYear() !== now.getFullYear()
          )
            return false;
        } else if (periodo === "ano") {
          if (d.getFullYear() !== now.getFullYear()) return false;
        }
      }
      if (!q) return true;
      return (
        t.descricao.toLowerCase().includes(q) ||
        t.parceiro.toLowerCase().includes(q) ||
        t.categoria.toLowerCase().includes(q)
      );
    });
  }, [items, search, periodo, status, centro]);

  const kpis = useMemo(() => {
    const aberto = rows
      .filter((r) => r.status === "aberto")
      .reduce((s, r) => s + r.valor, 0);
    const atrasado = rows
      .filter((r) => r.status === "atrasado")
      .reduce((s, r) => s + r.valor, 0);
    const pago = rows
      .filter((r) => r.status === "pago")
      .reduce((s, r) => s + r.valor, 0);
    return { aberto, atrasado, pago };
  }, [rows]);

  const displayRows = useMemo(
    () => buildDisplayRows(rows, vistaParcelas),
    [rows, vistaParcelas],
  );

  function toggleGrupo(grupoId: string) {
    setExpandedGrupos((prev) => {
      const next = new Set(prev);
      if (next.has(grupoId)) next.delete(grupoId);
      else next.add(grupoId);
      return next;
    });
  }

  function openBaixar(t: TituloFinanceiro) {
    setBaixarTarget(t);
    setBaixarData(todayIso());
    setBaixarForma(FORMAS[0]);
  }

  function renderTituloActions(
    t: TituloFinanceiro,
    opts?: {
      hideGrupo?: boolean;
      hideGrupoEdit?: boolean;
      hideBaixar?: boolean;
    },
  ) {
    return (
      <div className="flex justify-end gap-0.5">
        {!opts?.hideGrupo && t.grupoParcelasId ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Ver parcelas"
            onClick={() => void openGrupo(t)}
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </Button>
        ) : null}
        {!opts?.hideBaixar &&
        t.status !== "pago" &&
        t.status !== "cancelado" ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Baixar"
            onClick={() => openBaixar(t)}
          >
            <Banknote className="w-3.5 h-3.5" />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title={t.grupoParcelasId ? "Editar parcela" : "Editar"}
          onClick={() => openEdit(t)}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        {!opts?.hideGrupoEdit && t.grupoParcelasId ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Editar todas as parcelas"
            onClick={() => void openEditGrupo(t)}
          >
            <Layers className="w-3.5 h-3.5" />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          title="Excluir"
          onClick={() => setDeleteTarget(t)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  function regenerateParcelas(
    totalRaw: string,
    qtdRaw: string,
    primeiroVenc: string,
  ) {
    const total = parseValor(totalRaw);
    const qtd = Number(qtdRaw);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(qtd) || qtd < 2) {
      setParcelasDraft([]);
      return;
    }
    setParcelasDraft(
      buildParcelasDraft(total, qtd, primeiroVenc || todayIso()),
    );
  }

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setEditingGrupoId(null);
    const next = emptyForm(tipo, centros[0] || "");
    setForm(next);
    setParcelado(false);
    setQtdParcelas("2");
    setParcelasDraft([]);
    setOpen(true);
  }

  function openEdit(t: TituloFinanceiro) {
    setFormMode("edit");
    setEditingId(t.id);
    setEditingGrupoId(null);
    setParcelado(false);
    setParcelasDraft([]);
    setForm({
      descricao: t.descricao,
      parceiroId: t.parceiroId || NONE,
      categoria: t.categoria || categorias[0],
      centro: t.centro || centros[0] || "",
      vencimento: t.vencimento.slice(0, 10),
      valor: formatValorInput(t.valor),
      status: t.status,
      parcela: t.parcela || "",
    });
    setOpen(true);
  }

  async function openEditGrupo(seed: TituloFinanceiro | TituloFinanceiro[]) {
    const seedList = Array.isArray(seed) ? seed : [seed];
    const grupoId = seedList[0]?.grupoParcelasId;
    if (!grupoId) {
      toast.error("Este título não faz parte de um parcelamento.");
      return;
    }

    let rows = items
      .filter((t) => t.grupoParcelasId === grupoId)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
    if (rows.length === 0) {
      try {
        rows = [...(await fetchTitulos(tipo, grupoId))].sort((a, b) =>
          a.vencimento.localeCompare(b.vencimento),
        );
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar as parcelas.",
        );
        return;
      }
    }
    if (rows.length === 0) {
      toast.error("Nenhuma parcela encontrada neste grupo.");
      return;
    }

    const base = rows[0];
    setFormMode("edit-grupo");
    setEditingId(null);
    setEditingGrupoId(grupoId);
    setParcelado(false);
    setGrupoOpen(false);
    setForm({
      descricao: base.descricao,
      parceiroId: base.parceiroId || NONE,
      categoria: base.categoria || categorias[0],
      centro: base.centro || centros[0] || "",
      vencimento: base.vencimento.slice(0, 10),
      valor: formatValorInput(rows.reduce((s, t) => s + t.valor, 0)),
      status: "aberto",
      parcela: "",
    });
    setParcelasDraft(
      rows.map((t) => ({
        id: t.id,
        vencimento: t.vencimento.slice(0, 10),
        valor: formatValorInput(t.valor),
        label: t.parcela || "",
        locked: false,
      })),
    );
    setOpen(true);
  }

  async function openGrupo(t: TituloFinanceiro) {
    if (!t.grupoParcelasId) return;
    setGrupoMeta({ descricao: t.descricao, parceiro: t.parceiro });
    setGrupoOpen(true);
    try {
      const rows = await fetchTitulos(tipo, t.grupoParcelasId);
      setGrupoTitulos(
        [...rows].sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as parcelas.",
      );
      setGrupoOpen(false);
    }
  }

  async function refreshGrupo(grupoId: string) {
    const rows = await fetchTitulos(tipo, grupoId);
    setGrupoTitulos(
      [...rows].sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const descricao = form.descricao.trim();
    if (descricao.length < 2) {
      toast.error("Informe a descrição.");
      return;
    }
    if (tipo === "pagar" && !form.centro.trim()) {
      toast.error("Selecione o centro de custo.");
      return;
    }
    const centroValor = tipo === "pagar" ? form.centro.trim() : "";

    if (formMode === "create" && parcelado) {
      if (parcelasDraft.length < 2) {
        toast.error("Gere ao menos 2 parcelas.");
        return;
      }
      const parcelas: { vencimento: string; valor: number }[] = [];
      for (const p of parcelasDraft) {
        const v = parseValor(p.valor);
        if (!Number.isFinite(v) || v <= 0) {
          toast.error("Informe um valor válido em todas as parcelas.");
          return;
        }
        if (!p.vencimento) {
          toast.error("Informe o vencimento de todas as parcelas.");
          return;
        }
        parcelas.push({ vencimento: p.vencimento, valor: v });
      }
      setSaving(true);
      try {
        await createTitulosParcelado({
          tipo,
          descricao,
          parceiroId:
            form.parceiroId === NONE ? undefined : form.parceiroId,
          categoria: form.categoria,
          ...(centroValor ? { centro: centroValor } : {}),
          parcelas,
        });
        toast.success(`${parcelas.length} parcelas criadas.`);
        setOpen(false);
        await load();
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Não foi possível salvar.",
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    if (formMode === "edit-grupo") {
      if (!editingGrupoId) {
        toast.error("Grupo de parcelas inválido.");
        return;
      }
      const parcelas: {
        id: string;
        vencimento: string;
        valor: number;
      }[] = [];
      for (const p of parcelasDraft) {
        if (!p.id) continue;
        const v = parseValor(p.valor);
        if (!Number.isFinite(v) || v <= 0) {
          toast.error("Informe um valor válido em todas as parcelas.");
          return;
        }
        if (!p.vencimento) {
          toast.error("Informe o vencimento de todas as parcelas.");
          return;
        }
        parcelas.push({ id: p.id, vencimento: p.vencimento, valor: v });
      }
      if (parcelas.length === 0) {
        toast.error("Nenhuma parcela para editar.");
        return;
      }
      setSaving(true);
      try {
        const result = await updateTitulosGrupo(editingGrupoId, {
          descricao,
          parceiroId: form.parceiroId === NONE ? null : form.parceiroId,
          categoria: form.categoria,
          ...(tipo === "pagar" ? { centro: centroValor } : {}),
          parcelas,
        });
        toast.success(`${result.updated} parcela(s) atualizada(s).`);
        setOpen(false);
        setEditingGrupoId(null);
        await load();
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Não foi possível salvar.",
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    const valor = parseValor(form.valor);
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        tipo,
        descricao,
        parceiroId:
          form.parceiroId === NONE ? undefined : form.parceiroId,
        categoria: form.categoria,
        ...(tipo === "pagar" ? { centro: centroValor } : { centro: "" }),
        vencimento: form.vencimento,
        valor,
        status: form.status,
        parcela: form.parcela.trim() || undefined,
      };
      if (formMode === "create") {
        await createTitulo(payload);
        toast.success(
          form.status === "pago"
            ? "Título criado e baixado no fluxo de caixa."
            : "Título criado.",
        );
      } else if (editingId) {
        await updateTitulo(editingId, {
          ...payload,
          parceiroId: form.parceiroId === NONE ? null : form.parceiroId,
        });
        toast.success("Título atualizado.");
      }
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onBaixar() {
    if (!baixarTarget) return;
    const grupoId = baixarTarget.grupoParcelasId;
    setBusy(true);
    try {
      await baixarTitulo(baixarTarget.id, {
        dataPagamento: baixarData,
        formaPagamento: baixarForma,
      });
      toast.success(
        tipo === "receber" ? "Recebimento registrado." : "Pagamento registrado.",
      );
      setBaixarTarget(null);
      await load();
      if (grupoOpen && grupoId) {
        await refreshGrupo(grupoId);
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível baixar.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteTitulo(deleteTarget.id);
      toast.success("Título excluído.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível excluir.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteGrupo() {
    if (!deleteGrupoTarget) return;
    setBusy(true);
    try {
      const result = await deleteTitulosGrupo(deleteGrupoTarget.grupoId);
      toast.success(
        `${result.deleted} parcela${result.deleted === 1 ? "" : "s"} excluída${result.deleted === 1 ? "" : "s"}.`,
      );
      setDeleteGrupoTarget(null);
      setGrupoOpen(false);
      setGrupoTitulos([]);
      setGrupoMeta(null);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir o parcelamento.",
      );
    } finally {
      setBusy(false);
    }
  }

  const hasActive = Boolean(
    search ||
      periodo !== "tudo" ||
      status !== "todos" ||
      (tipo === "pagar" && centro !== "todos"),
  );

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Novo título
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3 mb-4">
        <FinanceKpiCard
          label="Em aberto"
          value={kpis.aberto}
          icon={Clock3}
          tone={tipo === "receber" ? "blue" : "orange"}
        />
        <FinanceKpiCard
          label="Atrasado"
          value={kpis.atrasado}
          icon={AlertTriangle}
          tone="red"
        />
        <FinanceKpiCard
          label={tipo === "receber" ? "Recebido (filtro)" : "Pago (filtro)"}
          value={kpis.pago}
          icon={CheckCircle2}
          tone="emerald"
        />
      </section>

      <FinanceiroFiltrosBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar título, parceiro…"
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        status={status}
        onStatusChange={setStatus}
        {...(tipo === "pagar"
          ? {
              tipo: centro,
              onTipoChange: setCentro,
              tipoOptions: centroOptions,
            }
          : {})}
        hasActive={hasActive}
        onClear={() => {
          setSearch("");
          setPeriodo("tudo");
          setStatus("todos");
          setCentro("todos");
        }}
      />

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Parceiro</TableHead>
              <TableHead>Categoria</TableHead>
              {tipo === "pagar" ? (
                <TableHead>Centro de custo</TableHead>
              ) : null}
              <TableHead>Vencimento</TableHead>
              <TableHead>Parcela</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[168px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={tipo === "pagar" ? 9 : 8}
                  className="text-center text-muted-foreground py-10"
                >
                  Nenhum título no filtro.
                </TableCell>
              </TableRow>
            ) : (
              displayRows.map((row) => {
                if (row.kind === "single") {
                  const t = row.titulo;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {t.descricao}
                      </TableCell>
                      <TableCell className="truncate max-w-[140px]">
                        {t.parceiro || "—"}
                      </TableCell>
                      <TableCell className="truncate max-w-[120px]">
                        {t.categoria || "—"}
                      </TableCell>
                      {tipo === "pagar" ? (
                        <TableCell className="truncate max-w-[120px]">
                          {t.centro || "—"}
                        </TableCell>
                      ) : null}
                      <TableCell>{formatDate(t.vencimento)}</TableCell>
                      <TableCell>{t.parcela || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {brl(t.valor)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusBadgeClass(t.status)}
                        >
                          {statusLabel(t.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{renderTituloActions(t)}</TableCell>
                    </TableRow>
                  );
                }

                const summary = groupSummary(row.titulos);
                const expanded = expandedGrupos.has(row.grupoId);
                return (
                  <Fragment key={row.grupoId}>
                    <TableRow>
                      <TableCell className="font-medium max-w-[220px]">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-left w-full min-w-0"
                          onClick={() => toggleGrupo(row.grupoId)}
                        >
                          {expanded ? (
                            <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate">{summary.descricao}</span>
                        </button>
                      </TableCell>
                      <TableCell className="truncate max-w-[140px]">
                        {summary.parceiro || "—"}
                      </TableCell>
                      <TableCell className="truncate max-w-[120px]">
                        {summary.categoria || "—"}
                      </TableCell>
                      {tipo === "pagar" ? (
                        <TableCell className="truncate max-w-[120px]">
                          {summary.centro || "—"}
                        </TableCell>
                      ) : null}
                      <TableCell>
                        {summary.vencimento
                          ? formatDate(summary.vencimento)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {summary.n} parcela{summary.n === 1 ? "" : "s"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {brl(summary.total)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusBadgeClass(summary.statusResumo)}
                        >
                          {summary.pagas === summary.n
                            ? statusLabel("pago")
                            : `${summary.pagas}/${summary.n} pagas`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title={expanded ? "Recolher" : "Expandir"}
                            onClick={() => toggleGrupo(row.grupoId)}
                          >
                            {expanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Ver parcelas"
                            onClick={() => void openGrupo(row.titulos[0])}
                          >
                            <ListOrdered className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Editar todas as parcelas"
                            onClick={() => void openEditGrupo(row.titulos)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            title="Excluir todas as parcelas"
                            onClick={() =>
                              setDeleteGrupoTarget({
                                grupoId: row.grupoId,
                                descricao: summary.descricao,
                                n: summary.n,
                                pagas: summary.pagas,
                              })
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded
                      ? row.titulos.map((t) => (
                          <TableRow
                            key={`${row.grupoId}-${t.id}`}
                            className="bg-muted/20"
                          >
                            <TableCell className="pl-9 text-sm text-muted-foreground">
                              Parcela {t.parcela || "—"}
                            </TableCell>
                            <TableCell className="truncate max-w-[140px]">
                              {t.parceiro || "—"}
                            </TableCell>
                            <TableCell className="truncate max-w-[120px]">
                              {t.categoria || "—"}
                            </TableCell>
                            {tipo === "pagar" ? (
                              <TableCell className="truncate max-w-[120px]">
                                {t.centro || "—"}
                              </TableCell>
                            ) : null}
                            <TableCell>{formatDate(t.vencimento)}</TableCell>
                            <TableCell>{t.parcela || "—"}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {brl(t.valor)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={statusBadgeClass(t.status)}
                              >
                                {statusLabel(t.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1 items-center">
                                {t.status !== "pago" &&
                                t.status !== "cancelado" ? (
                                  <Button
                                    size="sm"
                                    className="h-7"
                                    onClick={() => openBaixar(t)}
                                  >
                                    <Banknote className="w-3.5 h-3.5 mr-1" />
                                    Pagar
                                  </Button>
                                ) : null}
                                {renderTituloActions(t, {
                                  hideGrupo: true,
                                  hideGrupoEdit: true,
                                  hideBaixar: true,
                                })}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      : null}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        icon={<Banknote className="w-5 h-5" />}
        title={
          formMode === "create"
            ? "Novo título"
            : formMode === "edit-grupo"
              ? "Editar parcelas"
              : "Editar título"
        }
        description={
          formMode === "edit-grupo"
            ? "Altere os dados comuns e o vencimento/valor de todas as parcelas, inclusive as pagas."
            : formMode === "edit" && form.status === "pago"
              ? "Título pago: alterações sincronizam o lançamento no fluxo de caixa."
              : tipo === "receber"
                ? "Conta a receber vinculada ao fluxo de caixa."
                : "Conta a pagar vinculada ao fluxo de caixa."
        }
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" form="titulo-form" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Salvar
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <form id="titulo-form" className="space-y-4" onSubmit={onSubmit}>
            <FormSection title="Dados">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Descrição *</Label>
                  <Input
                    value={form.descricao}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, descricao: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Parceiro</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={() => openQuick("parceiro")}
                    >
                      {tipo === "pagar"
                        ? "+ Novo fornecedor"
                        : "+ Novo parceiro"}
                    </Button>
                  </div>
                  <Select
                    value={form.parceiroId}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, parceiroId: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {parceiros.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formMode === "create" ? (
                  <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5">
                    <div>
                      <Label htmlFor="titulo-parcelado">Parcelado</Label>
                      <p className="text-xs text-muted-foreground">
                        Gera várias parcelas com valor e vencimento próprios.
                      </p>
                    </div>
                    <Switch
                      id="titulo-parcelado"
                      checked={parcelado}
                      onCheckedChange={(checked) => {
                        setParcelado(checked);
                        if (checked) {
                          regenerateParcelas(
                            form.valor,
                            qtdParcelas,
                            form.vencimento,
                          );
                        } else {
                          setParcelasDraft([]);
                        }
                      }}
                    />
                  </div>
                ) : null}
                {formMode !== "edit-grupo" ? (
                  <>
                    <div className="space-y-1.5">
                      <Label>
                        {parcelado && formMode === "create"
                          ? "1º vencimento *"
                          : "Vencimento *"}
                      </Label>
                      <Input
                        type="date"
                        value={form.vencimento}
                        onChange={(e) => {
                          const vencimento = e.target.value;
                          setForm((f) => ({ ...f, vencimento }));
                          if (parcelado && formMode === "create") {
                            regenerateParcelas(
                              form.valor,
                              qtdParcelas,
                              vencimento,
                            );
                          }
                        }}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>
                        {parcelado && formMode === "create"
                          ? "Valor total (R$) *"
                          : "Valor (R$) *"}
                      </Label>
                      <Input
                        inputMode="numeric"
                        value={form.valor}
                        onChange={(e) => {
                          const valor = maskMoneyInput(e.target.value);
                          setForm((f) => ({ ...f, valor }));
                          if (parcelado && formMode === "create") {
                            regenerateParcelas(
                              valor,
                              qtdParcelas,
                              form.vencimento,
                            );
                          }
                        }}
                        required={!parcelado || formMode === "edit"}
                      />
                    </div>
                  </>
                ) : null}
                {parcelado && formMode === "create" ? (
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Quantidade de parcelas *</Label>
                    <Input
                      type="number"
                      min={2}
                      max={120}
                      value={qtdParcelas}
                      onChange={(e) => {
                        const next = e.target.value;
                        setQtdParcelas(next);
                        regenerateParcelas(form.valor, next, form.vencimento);
                      }}
                    />
                  </div>
                ) : formMode === "edit" ? (
                  <div className="space-y-1.5">
                    <Label>Parcela</Label>
                    <Input
                      value={form.parcela}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, parcela: e.target.value }))
                      }
                      placeholder="Ex.: 1/3"
                    />
                  </div>
                ) : null}
                {(parcelado && formMode === "create" && parcelasDraft.length > 0) ||
                formMode === "edit-grupo" ? (
                  <div className="sm:col-span-2 space-y-2">
                    <Label>
                      {formMode === "edit-grupo" ? "Todas as parcelas" : "Parcelas"}
                    </Label>
                    <div className="max-h-56 overflow-y-auto rounded-lg border border-border/60 divide-y divide-border/50">
                      {parcelasDraft.map((p, idx) => (
                        <div
                          key={p.id ?? `parcela-${idx}`}
                          className="grid grid-cols-[auto_1fr_1fr] gap-2 items-center p-2"
                        >
                          <span className="text-xs text-muted-foreground w-12">
                            {p.label || `${idx + 1}/${parcelasDraft.length}`}
                          </span>
                          <Input
                            type="date"
                            value={p.vencimento}
                            onChange={(e) => {
                              const vencimento = e.target.value;
                              setParcelasDraft((prev) =>
                                prev.map((row, i) =>
                                  i === idx ? { ...row, vencimento } : row,
                                ),
                              );
                            }}
                          />
                          <Input
                            inputMode="decimal"
                            value={p.valor}
                            onChange={(e) => {
                              const valor = maskMoneyInput(e.target.value);
                              setParcelasDraft((prev) =>
                                prev.map((row, i) =>
                                  i === idx ? { ...row, valor } : row,
                                ),
                              );
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total:{" "}
                      {brl(
                        parcelasDraft.reduce(
                          (s, p) => s + (parseValor(p.valor) || 0),
                          0,
                        ),
                      )}
                      {formMode === "edit-grupo"
                        ? " · Alterações em parcelas pagas atualizam o lançamento no fluxo."
                        : ""}
                    </p>
                  </div>
                ) : null}
                <div
                  className={
                    tipo === "pagar" ? "space-y-1.5" : "sm:col-span-2 space-y-1.5"
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <Label>Categoria</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={() => openQuick("categoria")}
                    >
                      + Nova categoria
                    </Button>
                  </div>
                  <Select
                    value={form.categoria}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, categoria: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {tipo === "pagar" ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Centro de custo *</Label>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() => openQuick("centro")}
                      >
                        + Novo centro
                      </Button>
                    </div>
                    <Select
                      value={form.centro || undefined}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, centro: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o centro de custo" />
                      </SelectTrigger>
                      <SelectContent>
                        {centros.length === 0 ? (
                          <SelectItem value="__empty" disabled>
                            Cadastre em Centro de despesas
                          </SelectItem>
                        ) : (
                          centros.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      Vinculado às categorias do Centro de despesas.
                    </p>
                  </div>
                ) : null}
                {formMode !== "edit-grupo" &&
                !(parcelado && formMode === "create") ? (
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          status: v as StatusTitulo,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aberto">Aberto</SelectItem>
                        <SelectItem value="atrasado">Atrasado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                        <SelectItem value="pago">
                          {formMode === "create" ? "Pago já" : "Pago"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {form.status === "pago" ? (
                      <p className="text-[11px] text-muted-foreground">
                        {formMode === "create"
                          ? "Já entra como pago/recebido no fluxo de caixa."
                          : "Mudar para Aberto/Atrasado/Cancelado estorna a baixa no fluxo de caixa."}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </FormSection>
          </form>
        </FormDialogBody>
      </FormDialogShell>

      <FormDialogShell
        open={quickKind !== null}
        onOpenChange={(o) => !o && setQuickKind(null)}
        icon={
          quickKind === "parceiro" ? (
            <Building2 className="w-5 h-5" />
          ) : (
            <Tags className="w-5 h-5" />
          )
        }
        title={
          quickKind === "parceiro"
            ? tipo === "pagar"
              ? "Novo fornecedor"
              : "Novo parceiro"
            : quickKind === "categoria"
              ? "Nova categoria"
              : "Novo centro de custo"
        }
        description={
          quickKind === "centro"
            ? "Cria a categoria no Centro de despesas para vincular neste título."
            : "Criação rápida para usar neste título."
        }
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuickKind(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="quick-financeiro-form"
              disabled={quickSaving}
            >
              {quickSaving && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              Criar
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <form
            id="quick-financeiro-form"
            className="space-y-3"
            onSubmit={handleQuickCreate}
          >
            <div className="space-y-1.5">
              <Label htmlFor="quick-fin-nome">Nome *</Label>
              <Input
                id="quick-fin-nome"
                value={quickNome}
                onChange={(e) => setQuickNome(e.target.value)}
                placeholder={
                  quickKind === "parceiro"
                    ? "Ex.: RedBull"
                    : quickKind === "categoria"
                      ? "Ex.: Aluguel"
                      : "Ex.: Comercial"
                }
                autoFocus
                required
              />
            </div>
            {quickKind === "parceiro" ? (
              <div className="space-y-1.5">
                <Label htmlFor="quick-fin-doc">CPF / CNPJ *</Label>
                <Input
                  id="quick-fin-doc"
                  inputMode="numeric"
                  autoComplete="off"
                  value={quickDocumento}
                  onChange={(e) =>
                    setQuickDocumento(formatCpfCnpj(e.target.value))
                  }
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  maxLength={18}
                  required
                />
              </div>
            ) : null}
          </form>
        </FormDialogBody>
      </FormDialogShell>

      <FormDialogShell
        open={!!baixarTarget}
        onOpenChange={(o) => !o && setBaixarTarget(null)}
        icon={<Banknote className="w-5 h-5" />}
        title={tipo === "receber" ? "Registrar recebimento" : "Registrar pagamento"}
        description={
          baixarTarget
            ? `${baixarTarget.descricao}${
                baixarTarget.parcela ? ` · Parcela ${baixarTarget.parcela}` : ""
              }`
            : undefined
        }
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBaixarTarget(null)}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={busy} onClick={() => void onBaixar()}>
              {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Confirmar baixa
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Data do pagamento</Label>
              <Input
                type="date"
                value={baixarData}
                onChange={(e) => setBaixarData(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
              <Select value={baixarForma} onValueChange={setBaixarForma}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {baixarTarget ? (
              <div className="sm:col-span-2 space-y-1 text-sm text-muted-foreground">
                <p>
                  Valor:{" "}
                  <span className="font-semibold text-foreground">
                    {brl(baixarTarget.valor)}
                  </span>
                </p>
                <p>
                  Vencimento:{" "}
                  <span className="text-foreground">
                    {formatDate(baixarTarget.vencimento)}
                  </span>
                </p>
                <p>O lançamento entra no fluxo de caixa como realizado.</p>
              </div>
            ) : null}
          </div>
        </FormDialogBody>
      </FormDialogShell>

      <FormDialogShell
        open={grupoOpen}
        onOpenChange={(o) => {
          if (!o) {
            setGrupoOpen(false);
            setGrupoTitulos([]);
            setGrupoMeta(null);
          }
        }}
        icon={<ListOrdered className="w-5 h-5" />}
        title="Parcelas"
        description={
          grupoMeta
            ? `${grupoMeta.descricao}${
                grupoMeta.parceiro ? ` · ${grupoMeta.parceiro}` : ""
              }`
            : undefined
        }
        footer={
          <FormDialogActions>
            {grupoTitulos.length > 0 ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void openEditGrupo(grupoTitulos)}
              >
                <Pencil className="w-3.5 h-3.5 mr-1" />
                Editar todas
              </Button>
            ) : null}
            {grupoTitulos[0]?.grupoParcelasId ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  const pagas = grupoTitulos.filter(
                    (t) => t.status === "pago",
                  ).length;
                  setDeleteGrupoTarget({
                    grupoId: grupoTitulos[0].grupoParcelasId!,
                    descricao: grupoMeta?.descricao || grupoTitulos[0].descricao,
                    n: grupoTitulos.length,
                    pagas,
                  });
                }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Excluir todas
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setGrupoOpen(false);
                setGrupoTitulos([]);
                setGrupoMeta(null);
              }}
            >
              Fechar
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          {(() => {
            const abertas = grupoTitulos.filter(
              (t) => t.status === "aberto" || t.status === "atrasado",
            );
            const pagas = grupoTitulos.filter((t) => t.status === "pago");
            const total = grupoTitulos.reduce((s, t) => s + t.valor, 0);
            const totalPago = pagas.reduce((s, t) => s + t.valor, 0);
            return (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Total {brl(total)} · Pago {brl(totalPago)} · Em aberto{" "}
                  {brl(total - totalPago)}
                </p>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Em aberto</h4>
                  {abertas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma parcela em aberto.
                    </p>
                  ) : (
                    <div className="rounded-lg border border-border/60 divide-y divide-border/50">
                      {abertas.map((t) => (
                        <div
                          key={t.id}
                          className="flex flex-wrap items-center justify-between gap-2 p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              Parcela {t.parcela || "—"} · {brl(t.valor)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Venc. {formatDate(t.vencimento)} ·{" "}
                              {statusLabel(t.status)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              setBaixarTarget(t);
                              setBaixarData(todayIso());
                              setBaixarForma(FORMAS[0]);
                            }}
                          >
                            <Banknote className="w-3.5 h-3.5 mr-1" />
                            Pagar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Pagas</h4>
                  {pagas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma parcela paga ainda.
                    </p>
                  ) : (
                    <div className="rounded-lg border border-border/60 divide-y divide-border/50">
                      {pagas.map((t) => (
                        <div key={t.id} className="p-3">
                          <p className="text-sm font-medium">
                            Parcela {t.parcela || "—"} · {brl(t.valor)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Pago em{" "}
                            {t.dataPagamento
                              ? formatDate(t.dataPagamento)
                              : "—"}
                            {t.formaPagamento
                              ? ` · ${t.formaPagamento}`
                              : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </FormDialogBody>
      </FormDialogShell>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir título?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.descricao}.
              {deleteTarget?.status === "pago"
                ? " O lançamento no fluxo de caixa também será removido e os totais do dashboard serão atualizados."
                : " Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void onDelete();
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteGrupoTarget}
        onOpenChange={(o) => !o && setDeleteGrupoTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir todas as parcelas?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteGrupoTarget
                ? `${deleteGrupoTarget.descricao} — ${deleteGrupoTarget.n} parcela${deleteGrupoTarget.n === 1 ? "" : "s"}${
                    deleteGrupoTarget.pagas > 0
                      ? ` (${deleteGrupoTarget.pagas} já paga${deleteGrupoTarget.pagas === 1 ? "" : "s"})`
                      : ""
                  }. Remove o parcelamento inteiro, inclusive baixas no fluxo de caixa.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void onDeleteGrupo();
              }}
            >
              Excluir todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
