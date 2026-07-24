import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import {
  FormDialogShell, FormDialogBody, FormDialogActions, FormSection, DetailField,
} from "@/components/form-dialog";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, CalendarRange, Banknote, CalendarClock, CalendarX2, CircleCheck,
  MoreHorizontal, Eye, Pencil, Trash2, ArrowUpRight,
} from "lucide-react";
import {
  moneyBRL,
  TIPOS_CONTA,
  useFinanceiroContas,
  type ClassificacaoPagar,
  type ContaFinanceira,
  type ContaStatus,
} from "@/lib/financeiro-contas-store";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/financeiro/contas-a-pagar")({
  head: () => ({ meta: [{ title: "Contas a pagar — Financeiro" }] }),
  component: ContasAPagar,
});

type Filtro = "todas" | "conta" | "despesa";
type DialogMode = "create" | "edit" | "view" | null;

function statusBadge(status: ContaStatus) {
  if (status === "atrasado") return <Badge className="bg-red-600 hover:bg-red-600">Atrasado</Badge>;
  if (status === "previsto") return <Badge variant="secondary">Previsto</Badge>;
  if (status === "pago") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Pago</Badge>;
  return <Badge variant="outline">Em aberto</Badge>;
}

function parseMoney(raw: string): number {
  const n = Number(raw.trim().replace(/\s/g, "").replace(/R\$\s?/i, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatMoneyInput(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type FormState = {
  descricao: string;
  pessoa: string;
  valor: number;
  vencimento: string;
  status: ContaStatus;
  categoria: string;
  classificacao: ClassificacaoPagar;
  tipoConta: string;
  tipoDespesaId: string;
};

function emptyForm(): FormState {
  return {
    descricao: "",
    pessoa: "",
    valor: 0,
    vencimento: new Date().toISOString().slice(0, 10),
    status: "aberto",
    categoria: "Operacional",
    classificacao: "conta",
    tipoConta: "Fornecedor",
    tipoDespesaId: "",
  };
}

function ContasAPagar() {
  const {
    contasAPagar,
    tiposDespesa,
    getTipoDespesaNome,
    addConta,
    updateConta,
    deleteConta,
  } = useFinanceiroContas();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [mode, setMode] = useState<DialogMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [valorInput, setValorInput] = useState("0,00");

  const tiposAtivos = useMemo(
    () => tiposDespesa.filter((t) => t.ativo),
    [tiposDespesa],
  );

  const lista = useMemo(() => {
    if (filtro === "todas") return contasAPagar;
    return contasAPagar.filter((c) => (c.classificacao ?? "conta") === filtro);
  }, [contasAPagar, filtro]);

  const kpis = useMemo(() => {
    const base = lista;
    const aberto = base.filter((c) => c.status === "aberto").reduce((s, c) => s + c.valor, 0);
    const atrasado = base.filter((c) => c.status === "atrasado").reduce((s, c) => s + c.valor, 0);
    const previsto = base.filter((c) => c.status === "previsto").reduce((s, c) => s + c.valor, 0);
    const pago = base.filter((c) => c.status === "pago").reduce((s, c) => s + c.valor, 0);
    return { aberto, atrasado, previsto, pago, total: aberto + atrasado + previsto };
  }, [lista]);

  const readOnly = mode === "view";
  const dialogOpen = mode !== null;

  function tipoLabel(c: ContaFinanceira) {
    if (c.classificacao === "despesa") return getTipoDespesaNome(c.tipoDespesaId);
    return c.tipoConta ?? "Conta";
  }

  function openCreate() {
    setEditingId(null);
    const base = emptyForm();
    if (filtro === "despesa") {
      base.classificacao = "despesa";
      base.tipoDespesaId = tiposAtivos[0]?.id ?? "";
    }
    setForm(base);
    setValorInput("0,00");
    setMode("create");
  }

  function fillFromConta(c: ContaFinanceira) {
    setEditingId(c.id);
    setForm({
      descricao: c.descricao,
      pessoa: c.pessoa,
      valor: c.valor,
      vencimento: c.vencimento,
      status: c.status,
      categoria: c.categoria,
      classificacao: c.classificacao ?? "conta",
      tipoConta: c.tipoConta ?? "Fornecedor",
      tipoDespesaId: c.tipoDespesaId ?? "",
    });
    setValorInput(formatMoneyInput(c.valor));
  }

  function openView(c: ContaFinanceira) {
    fillFromConta(c);
    setMode("view");
  }

  function openEdit(c: ContaFinanceira) {
    fillFromConta(c);
    setMode("edit");
  }

  function closeDialog() {
    setMode(null);
    setEditingId(null);
  }

  function save() {
    if (!form.pessoa.trim() || !form.descricao.trim()) {
      toast.error("Informe fornecedor e descrição");
      return;
    }
    const valor = parseMoney(valorInput);
    if (valor <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (form.classificacao === "despesa" && !form.tipoDespesaId) {
      toast.error("Selecione o tipo de despesa");
      return;
    }
    const payload: ContaFinanceira = {
      id: editingId ?? `cp-${Date.now()}`,
      tipo: "pagar",
      descricao: form.descricao.trim(),
      pessoa: form.pessoa.trim(),
      valor,
      vencimento: form.vencimento,
      status: form.status,
      categoria: form.categoria,
      classificacao: form.classificacao,
      tipoConta: form.classificacao === "conta" ? form.tipoConta : undefined,
      tipoDespesaId: form.classificacao === "despesa" ? form.tipoDespesaId : undefined,
    };
    if (mode === "create") {
      addConta(payload);
      toast.success("Conta a pagar cadastrada — já aparece no fluxo de caixa");
    } else if (editingId) {
      updateConta(editingId, payload);
      toast.success("Conta a pagar atualizada");
    }
    closeDialog();
  }

  function remove(c: ContaFinanceira) {
    if (!window.confirm(`Excluir a conta de "${c.pessoa}"?`)) return;
    deleteConta(c.id);
    toast.success("Conta excluída");
    if (editingId === c.id) closeDialog();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contas a pagar"
        description={`Total pendente: ${moneyBRL(kpis.total)} — refletido no fluxo de caixa pela data de vencimento.`}
        actions={
          <>
            <Button size="sm" variant="outline" className="hidden sm:inline-flex" asChild>
              <Link to="/financeiro/centro-despesas">Centro de despesas</Link>
            </Button>
            <Button size="sm" variant="outline" className="flex-1 sm:flex-none" asChild>
              <Link to="/financeiro/fluxo-caixa">
                <CalendarRange className="w-4 h-4 mr-1" />
                Fluxo
              </Link>
            </Button>
            <Button size="sm" className="flex-1 sm:flex-none" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" />
              Nova conta
            </Button>
          </>
        }
      />

      <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)} className="w-full">
        <TabsList className="w-full sm:w-auto h-auto flex flex-wrap justify-start gap-1">
          <TabsTrigger value="todas" className="flex-1 sm:flex-none">Todas</TabsTrigger>
          <TabsTrigger value="conta" className="flex-1 sm:flex-none">Tipo contas</TabsTrigger>
          <TabsTrigger value="despesa" className="flex-1 sm:flex-none">Tipo despesas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 [&>*]:min-w-0">
        <FinanceKpiCard label="Em aberto neste mês" value={kpis.aberto} icon={Banknote} tone="orange" />
        <FinanceKpiCard label="Em atraso" value={kpis.atrasado} icon={CalendarX2} tone="red" />
        <FinanceKpiCard label="Previstos" value={kpis.previsto} icon={CalendarClock} tone="violet" />
        <FinanceKpiCard label="Já pagas" value={kpis.pago} icon={CircleCheck} tone="emerald" />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {lista.map((c) => {
          const isDespesa = c.classificacao === "despesa";
          return (
            <Card key={c.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{c.pessoa}</div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">{c.descricao}</div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {new Date(c.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        isDespesa
                          ? "text-[10px] border-violet-300 text-violet-700 bg-violet-500/10"
                          : "text-[10px] border-orange-300 text-orange-700 bg-orange-500/10"
                      }
                    >
                      {isDespesa ? "Despesa" : "Conta"}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">{tipoLabel(c)}</Badge>
                    {statusBadge(c.status)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="text-sm font-semibold text-red-700 dark:text-red-400 tabular-nums">
                    {moneyBRL(c.valor)}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openView(c)}>
                        <Eye className="w-3.5 h-3.5 mr-2" /> Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(c)}>
                        <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => remove(c)}>
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          );
        })}
        {!lista.length && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma conta neste filtro.
          </Card>
        )}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vencimento</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((c) => {
                const isDespesa = c.classificacao === "despesa";
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm tabular-nums">
                      {new Date(c.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{c.pessoa}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.descricao}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          isDespesa
                            ? "border-violet-300 text-violet-700 bg-violet-500/10"
                            : "border-orange-300 text-orange-700 bg-orange-500/10"
                        }
                      >
                        {isDespesa ? "Tipo despesa" : "Tipo conta"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{tipoLabel(c)}</Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline">{c.categoria}</Badge></TableCell>
                    <TableCell>{statusBadge(c.status)}</TableCell>
                    <TableCell className="text-sm font-semibold text-right text-red-700 dark:text-red-400">
                      {moneyBRL(c.valor)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openView(c)}>
                            <Eye className="w-3.5 h-3.5 mr-2" /> Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(c)}>
                            <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => remove(c)}>
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!lista.length && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-10">
                    Nenhuma conta neste filtro.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <FormDialogShell
        open={dialogOpen}
        onOpenChange={(o) => { if (!o) closeDialog(); }}
        icon={<ArrowUpRight className="w-5 h-5" />}
        title={
          mode === "create" ? "Nova conta a pagar"
            : mode === "edit" ? "Editar conta a pagar"
              : "Detalhes — conta a pagar"
        }
        description="O vencimento define o dia em que a conta aparece no fluxo de caixa."
        footer={
          <FormDialogActions>
            <Button variant="outline" onClick={closeDialog}>{readOnly ? "Fechar" : "Cancelar"}</Button>
            {readOnly ? (
              <Button onClick={() => {
                const c = contasAPagar.find((x) => x.id === editingId);
                if (c) openEdit(c);
              }}>
                <Pencil className="w-4 h-4 mr-1" /> Editar
              </Button>
            ) : (
              <Button onClick={save}>{mode === "create" ? "Cadastrar" : "Salvar"}</Button>
            )}
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          {readOnly ? (
            <FormSection title="Informações">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailField label="Fornecedor" value={form.pessoa} />
                <DetailField label="Vencimento" value={new Date(form.vencimento + "T12:00:00").toLocaleDateString("pt-BR")} />
                <DetailField label="Descrição" value={form.descricao} className="sm:col-span-2" />
                <DetailField label="Classificação" value={form.classificacao === "despesa" ? "Tipo despesa" : "Tipo conta"} />
                <DetailField
                  label="Tipo"
                  value={form.classificacao === "despesa" ? getTipoDespesaNome(form.tipoDespesaId) : form.tipoConta}
                />
                <DetailField label="Categoria" value={form.categoria} />
                <DetailField label="Status" value={form.status} />
                <DetailField label="Valor" value={moneyBRL(form.valor)} />
              </div>
            </FormSection>
          ) : (
            <FormSection title="Dados da conta">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Fornecedor / favorecido</Label>
                  <Input value={form.pessoa} onChange={(e) => setForm({ ...form, pessoa: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Descrição</Label>
                  <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Vencimento</Label>
                  <Input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Valor</Label>
                  <Input inputMode="decimal" value={valorInput} onChange={(e) => setValorInput(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Classificação</Label>
                  <Select
                    value={form.classificacao}
                    onValueChange={(v) => setForm({
                      ...form,
                      classificacao: v as ClassificacaoPagar,
                      tipoDespesaId: v === "despesa" ? (form.tipoDespesaId || tiposAtivos[0]?.id || "") : "",
                    })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conta">Tipo de conta</SelectItem>
                      <SelectItem value="despesa">Tipo despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.classificacao === "conta" ? (
                  <div className="space-y-1.5">
                    <Label>Tipo de conta</Label>
                    <Select value={form.tipoConta} onValueChange={(v) => setForm({ ...form, tipoConta: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIPOS_CONTA.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label>Tipo de despesa</Label>
                    <Select
                      value={form.tipoDespesaId || undefined}
                      onValueChange={(v) => setForm({ ...form, tipoDespesaId: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {tiposAtivos.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Operacional", "Marketing", "Impostos", "Folha", "Infraestrutura", "Outros"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ContaStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberto">Em aberto</SelectItem>
                      <SelectItem value="previsto">Previsto</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormSection>
          )}
        </FormDialogBody>
      </FormDialogShell>
    </div>
  );
}
