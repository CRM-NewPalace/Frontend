import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
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
import { Switch } from "@/components/ui/switch";
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
import { brl, formatDate } from "@/lib/financeiro-mock";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseMoneyInput,
} from "@/lib/money-input";
import {
  baixarPlatformParcela,
  createPlatformContrato,
  deletePlatformContrato,
  fetchPlatformContratos,
  updatePlatformContrato,
  type PlatformContrato,
  type PlatformContratoParcela,
  type PlatformContratoStatus,
  type PlatformContratoTipo,
} from "@/lib/platform-contratos-api";
import { fetchTenants, type Tenant } from "@/lib/tenants-api";
import { PLANO_LABELS, type TenantPlano } from "@/lib/tenant-modules";
import {
  Banknote,
  CheckCircle2,
  FileText,
  ListOrdered,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/financeiro/contratos")({
  head: () => ({
    meta: [{ title: "Contratos — Zone Connection" }],
  }),
  component: Page,
});

const STATUS_LABEL: Record<PlatformContratoStatus, string> = {
  proposta: "Proposta",
  ativo: "Ativo",
  atrasado: "Atrasado",
  suspenso: "Suspenso",
  cancelado: "Cancelado",
  encerrado: "Encerrado",
};

const STATUS_CLASS: Record<PlatformContratoStatus, string> = {
  proposta: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
  ativo: "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300",
  atrasado: "border-transparent bg-red-500/15 text-red-700 dark:text-red-300",
  suspenso: "border-transparent bg-slate-500/15 text-slate-700 dark:text-slate-300",
  cancelado: "text-muted-foreground",
  encerrado: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

const TIPO_LABEL: Record<PlatformContratoTipo, string> = {
  assinatura: "Assinatura",
  financeiro: "Financeiro",
};

const FORMAS = ["Pix", "TED", "Boleto", "Dinheiro", "Cartão", "Outro"] as const;

type ParcelaDraft = { numero: number; valor: string; vencimento: string };

type FormState = {
  tenantId: string;
  titulo: string;
  tipo: PlatformContratoTipo;
  plano: TenantPlano;
  valor: string;
  dataInicio: string;
  vencimento: string;
  status: PlatformContratoStatus;
  observacao: string;
};

const emptyForm = (): FormState => ({
  tenantId: "",
  titulo: "",
  tipo: "assinatura",
  plano: "ouro",
  valor: "",
  dataInicio: new Date().toISOString().slice(0, 10),
  vencimento: "",
  status: "proposta",
  observacao: "",
});

function parseMoney(value: string): number {
  return parseMoneyInput(value);
}

function addMonthsIso(iso: string, months: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function buildParcelas(
  valorTotal: number,
  qtd: number,
  inicio: string,
): ParcelaDraft[] {
  if (qtd < 1 || !Number.isFinite(valorTotal) || valorTotal <= 0) return [];
  const centavos = Math.round(valorTotal * 100);
  const base = Math.floor(centavos / qtd);
  const resto = centavos - base * qtd;
  return Array.from({ length: qtd }, (_, i) => {
    const c = base + (i < resto ? 1 : 0);
    return {
      numero: i + 1,
      valor: (c / 100).toFixed(2).replace(".", ","),
      vencimento: addMonthsIso(inicio, i),
    };
  });
}

function Page() {
  const [items, setItems] = useState<PlatformContrato[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");

  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [parcelado, setParcelado] = useState(false);
  const [qtdParcelas, setQtdParcelas] = useState("2");
  const [parcelasDraft, setParcelasDraft] = useState<ParcelaDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PlatformContrato | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [parcelasOpen, setParcelasOpen] = useState(false);
  const [parcelasContrato, setParcelasContrato] =
    useState<PlatformContrato | null>(null);
  const [baixarTarget, setBaixarTarget] =
    useState<PlatformContratoParcela | null>(null);
  const [baixarData, setBaixarData] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [baixarForma, setBaixarForma] = useState<string>(FORMAS[0]);
  const [baixando, setBaixando] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [contratos, t] = await Promise.all([
        fetchPlatformContratos(),
        fetchTenants(),
      ]);
      setItems(contratos);
      setTenants(t.filter((x) => x.status === "ativo"));
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os contratos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      if (statusFilter !== "todos" && c.status !== statusFilter) return false;
      if (tipoFilter !== "todos" && c.tipo !== tipoFilter) return false;
      if (!q) return true;
      return (
        c.titulo.toLowerCase().includes(q) ||
        c.codigo.toLowerCase().includes(q) ||
        c.tenantNome.toLowerCase().includes(q) ||
        (c.plano ? PLANO_LABELS[c.plano].toLowerCase().includes(q) : false)
      );
    });
  }, [items, search, statusFilter, tipoFilter]);

  const kpis = useMemo(() => {
    const ativos = items.filter((c) => c.status === "ativo");
    const propostas = items.filter((c) => c.status === "proposta");
    const aberto = items.reduce((s, c) => s + c.valorAberto, 0);
    const valorAtivo = ativos.reduce((s, c) => s + c.valor, 0);
    return {
      ativos: ativos.length,
      propostas: propostas.length,
      valorAtivo,
      aberto,
    };
  }, [items]);

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm({
      ...emptyForm(),
      tenantId: tenants[0]?.id ?? "",
    });
    setParcelado(false);
    setQtdParcelas("2");
    setParcelasDraft([]);
    setOpen(true);
  }

  function openEdit(c: PlatformContrato) {
    setFormMode("edit");
    setEditingId(c.id);
    setForm({
      tenantId: c.tenantId,
      titulo: c.titulo,
      tipo: c.tipo,
      plano: c.plano ?? "ouro",
      valor: formatMoneyInput(c.valor),
      dataInicio: c.dataInicio.slice(0, 10),
      vencimento: c.vencimento?.slice(0, 10) ?? "",
      status: c.status,
      observacao: c.observacao || "",
    });
    const hasParcelas = c.parcelas.length > 0;
    setParcelado(hasParcelas);
    setQtdParcelas(String(Math.max(c.parcelas.length, 2)));
    setParcelasDraft(
      c.parcelas.map((p) => ({
        numero: p.numero,
        valor: String(p.valor).replace(".", ","),
        vencimento: p.vencimento.slice(0, 10),
      })),
    );
    setOpen(true);
  }

  function syncParcelasDraft(nextValor?: string, nextQtd?: string, nextInicio?: string) {
    const valor = parseMoney(nextValor ?? form.valor);
    const qtd = Math.max(1, Math.min(60, Number(nextQtd ?? qtdParcelas) || 1));
    const inicio = (nextInicio ?? form.dataInicio) || new Date().toISOString().slice(0, 10);
    if (!Number.isFinite(valor) || valor <= 0) {
      setParcelasDraft([]);
      return;
    }
    setParcelasDraft(buildParcelas(valor, qtd, inicio));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const titulo = form.titulo.trim();
    const valor = parseMoney(form.valor);
    if (!form.tenantId) {
      toast.error("Selecione a imobiliária.");
      return;
    }
    if (!titulo) {
      toast.error("Informe o título do contrato.");
      return;
    }
    if (!Number.isFinite(valor) || valor < 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    if (form.tipo === "assinatura" && !form.plano) {
      toast.error("Informe o plano.");
      return;
    }

    let parcelas:
      | { numero: number; valor: number; vencimento: string }[]
      | undefined;
    if (parcelado) {
      if (parcelasDraft.length === 0) {
        toast.error("Configure as parcelas.");
        return;
      }
      parcelas = [];
      for (const p of parcelasDraft) {
        const pv = parseMoney(p.valor);
        if (!Number.isFinite(pv) || pv <= 0 || !p.vencimento) {
          toast.error(`Parcela ${p.numero} inválida.`);
          return;
        }
        parcelas.push({
          numero: p.numero,
          valor: pv,
          vencimento: p.vencimento,
        });
      }
    }

    const payload = {
      tenantId: form.tenantId,
      titulo,
      tipo: form.tipo,
      plano: form.tipo === "assinatura" ? form.plano : null,
      valor,
      dataInicio: form.dataInicio,
      vencimento: form.vencimento || null,
      status: form.status,
      observacao: form.observacao.trim() || undefined,
      ...(parcelas ? { parcelas } : formMode === "create" ? {} : {}),
    };

    setSaving(true);
    try {
      if (formMode === "edit" && editingId) {
        await updatePlatformContrato(editingId, {
          ...payload,
          ...(parcelado ? { parcelas } : {}),
        });
        toast.success("Contrato atualizado.");
      } else {
        await createPlatformContrato(payload);
        toast.success("Contrato cadastrado.");
      }
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o contrato.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePlatformContrato(deleteTarget.id);
      toast.success(`Contrato ${deleteTarget.codigo} removido.`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível remover o contrato.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function confirmBaixar() {
    if (!parcelasContrato || !baixarTarget) return;
    setBaixando(true);
    try {
      const updated = await baixarPlatformParcela(
        parcelasContrato.id,
        baixarTarget.id,
        { dataPagamento: baixarData, formaPagamento: baixarForma },
      );
      setParcelasContrato(updated);
      setItems((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );
      setBaixarTarget(null);
      toast.success(`Parcela ${baixarTarget.numero} baixada.`);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível baixar a parcela.",
      );
    } finally {
      setBaixando(false);
    }
  }

  const hasActive = Boolean(
    search || statusFilter !== "todos" || tipoFilter !== "todos",
  );

  return (
    <div>
      <PageHeader
        title="Contratos"
        description="Propostas e acordos fechados com as imobiliárias — plano, valor, vencimento e parcelas"
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Novo contrato
          </Button>
        }
      />

      <FinanceiroFiltrosBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar imobiliária, código, título…"
        tipo={tipoFilter}
        onTipoChange={setTipoFilter}
        tipoOptions={[
          { value: "todos", label: "Todos os tipos" },
          { value: "assinatura", label: "Assinatura" },
          { value: "financeiro", label: "Financeiro" },
        ]}
        extra={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {(Object.keys(STATUS_LABEL) as PlatformContratoStatus[]).map(
                (s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        }
        hasActive={hasActive}
        onClear={() => {
          setSearch("");
          setStatusFilter("todos");
          setTipoFilter("todos");
        }}
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <FinanceKpiCard
          label="Contratos ativos"
          value={kpis.ativos}
          icon={CheckCircle2}
          tone="teal"
          format="number"
        />
        <FinanceKpiCard
          label="Em proposta"
          value={kpis.propostas}
          icon={FileText}
          tone="orange"
          format="number"
        />
        <FinanceKpiCard
          label="Valor ativos"
          value={kpis.valorAtivo}
          icon={Banknote}
          tone="blue"
        />
        <FinanceKpiCard
          label="Parcelas em aberto"
          value={kpis.aberto}
          icon={ListOrdered}
          tone="violet"
        />
      </section>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando contratos…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Imobiliária</TableHead>
                <TableHead>Tipo / Plano</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Parcelas</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground py-10"
                  >
                    Nenhum contrato encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium tabular-nums">
                      {c.codigo}
                      <div className="text-xs text-muted-foreground font-normal">
                        {c.titulo}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{c.tenantNome}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.tenantSlug}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{TIPO_LABEL[c.tipo]}</Badge>
                      {c.plano ? (
                        <div className="mt-1">
                          <Badge variant="outline">
                            {PLANO_LABELS[c.plano]}
                          </Badge>
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {brl(c.valor)}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {c.vencimento ? formatDate(c.vencimento) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={STATUS_CLASS[c.status]}
                      >
                        {STATUS_LABEL[c.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.qtdParcelas > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => {
                            setParcelasContrato(c);
                            setParcelasOpen(true);
                          }}
                        >
                          {c.qtdParcelas} · {brl(c.valorAberto)} aberto
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Editar"
                          onClick={() => openEdit(c)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Excluir"
                          onClick={() => setDeleteTarget(c)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {rows.length} de {items.length} contratos
      </p>

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        icon={<FileText className="w-5 h-5" />}
        title={formMode === "edit" ? "Editar contrato" : "Novo contrato"}
        description="Acordo comercial com a imobiliária — sem PDF ou relatório."
      >
        <form onSubmit={handleSubmit}>
          <FormDialogBody className="space-y-4">
            <FormSection>
              <div className="space-y-2">
                <Label>Imobiliária</Label>
                <Select
                  value={form.tenantId || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, tenantId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({PLANO_LABELS[t.plano]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-titulo">Título</Label>
                <Input
                  id="c-titulo"
                  value={form.titulo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, titulo: e.target.value }))
                  }
                  placeholder="Ex.: Assinatura anual Ouro"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={form.tipo}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        tipo: v as PlatformContratoTipo,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assinatura">Assinatura</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        status: v as PlatformContratoStatus,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.keys(STATUS_LABEL) as PlatformContratoStatus[]
                      ).map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.tipo === "assinatura" ? (
                <div className="space-y-2">
                  <Label>Plano</Label>
                  <Select
                    value={form.plano}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, plano: v as TenantPlano }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PLANO_LABELS) as TenantPlano[]).map((p) => (
                        <SelectItem key={p} value={p}>
                          {PLANO_LABELS[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="c-valor">Valor (R$)</Label>
                  <Input
                    id="c-valor"
                    value={form.valor}
                    onChange={(e) => {
                      const valor = maskMoneyInput(e.target.value);
                      setForm((f) => ({ ...f, valor }));
                      if (parcelado) syncParcelasDraft(valor);
                    }}
                    placeholder="0,00"
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-inicio">Início</Label>
                  <Input
                    id="c-inicio"
                    type="date"
                    value={form.dataInicio}
                    onChange={(e) => {
                      const dataInicio = e.target.value;
                      setForm((f) => ({ ...f, dataInicio }));
                      if (parcelado) syncParcelasDraft(undefined, undefined, dataInicio);
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-venc">Vencimento / próximo venc.</Label>
                <Input
                  id="c-venc"
                  type="date"
                  value={form.vencimento}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, vencimento: e.target.value }))
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <div>
                  <Label htmlFor="c-parc">Parcelado</Label>
                  <p className="text-xs text-muted-foreground">
                    Gera parcelas com vencimento mensal
                  </p>
                </div>
                <Switch
                  id="c-parc"
                  checked={parcelado}
                  onCheckedChange={(v) => {
                    setParcelado(v);
                    if (v) syncParcelasDraft();
                    else setParcelasDraft([]);
                  }}
                />
              </div>
              {parcelado ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="c-qtd">Qtd. parcelas</Label>
                    <Input
                      id="c-qtd"
                      type="number"
                      min={1}
                      max={60}
                      value={qtdParcelas}
                      onChange={(e) => {
                        setQtdParcelas(e.target.value);
                        syncParcelasDraft(undefined, e.target.value);
                      }}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-border/60">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Vencimento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parcelasDraft.map((p, idx) => (
                          <TableRow key={p.numero}>
                            <TableCell>{p.numero}</TableCell>
                            <TableCell>
                              <Input
                                value={p.valor}
                                onChange={(e) => {
                                  const valor = e.target.value;
                                  setParcelasDraft((prev) =>
                                    prev.map((x, i) =>
                                      i === idx ? { ...x, valor } : x,
                                    ),
                                  );
                                }}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="date"
                                value={p.vencimento}
                                onChange={(e) => {
                                  const vencimento = e.target.value;
                                  setParcelasDraft((prev) =>
                                    prev.map((x, i) =>
                                      i === idx ? { ...x, vencimento } : x,
                                    ),
                                  );
                                }}
                                className="h-8"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="c-obs">Observação</Label>
                <Input
                  id="c-obs"
                  value={form.observacao}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, observacao: e.target.value }))
                  }
                  placeholder="Opcional"
                />
              </div>
            </FormSection>
          </FormDialogBody>
          <FormDialogActions>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              Salvar
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <FormDialogShell
        open={parcelasOpen}
        onOpenChange={(next) => {
          setParcelasOpen(next);
          if (!next) setParcelasContrato(null);
        }}
        icon={<ListOrdered className="w-5 h-5" />}
        title={
          parcelasContrato
            ? `Parcelas — ${parcelasContrato.codigo}`
            : "Parcelas"
        }
        description={parcelasContrato?.tenantNome}
      >
        <FormDialogBody>
          {parcelasContrato ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelasContrato.parcelas.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.numero}</TableCell>
                    <TableCell className="tabular-nums">
                      {formatDate(p.vencimento)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {brl(p.valor)}
                    </TableCell>
                    <TableCell className="capitalize">{p.status}</TableCell>
                    <TableCell className="text-right">
                      {p.status === "aberto" || p.status === "atrasado" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setBaixarTarget(p);
                            setBaixarData(new Date().toISOString().slice(0, 10));
                            setBaixarForma(FORMAS[0]);
                          }}
                        >
                          Baixar
                        </Button>
                      ) : p.dataPagamento ? (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(p.dataPagamento)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </FormDialogBody>
        <FormDialogActions>
          <Button
            type="button"
            variant="outline"
            onClick={() => setParcelasOpen(false)}
          >
            Fechar
          </Button>
        </FormDialogActions>
      </FormDialogShell>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              Remover {deleteTarget?.codigo} ({deleteTarget?.tenantNome})? As
              parcelas também serão excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(baixarTarget)}
        onOpenChange={(o) => !o && setBaixarTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Baixar parcela {baixarTarget?.numero}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Confirma o recebimento de{" "}
              {baixarTarget ? brl(baixarTarget.valor) : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>Data do pagamento</Label>
              <Input
                type="date"
                value={baixarData}
                onChange={(e) => setBaixarData(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Forma</Label>
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
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={baixando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmBaixar();
              }}
              disabled={baixando}
            >
              {baixando ? "Salvando…" : "Confirmar baixa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
