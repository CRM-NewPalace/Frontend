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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, CalendarRange, HandCoins, CalendarX2, CalendarClock, CircleCheck,
  MoreHorizontal, Eye, Pencil, Trash2, ArrowDownLeft,
} from "lucide-react";
import {
  moneyBRL,
  useFinanceiroContas,
  type ContaFinanceira,
  type ContaStatus,
} from "@/lib/financeiro-contas-store";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/financeiro/contas-a-receber")({
  head: () => ({ meta: [{ title: "Contas a receber — Financeiro" }] }),
  component: ContasAReceber,
});

type DialogMode = "create" | "edit" | "view" | null;

function statusBadge(status: ContaStatus) {
  if (status === "atrasado") return <Badge className="bg-red-600 hover:bg-red-600">Atrasado</Badge>;
  if (status === "previsto") return <Badge variant="secondary">Previsto</Badge>;
  if (status === "pago") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Recebido</Badge>;
  return <Badge variant="outline">Em aberto</Badge>;
}

function parseMoney(raw: string): number {
  const n = Number(raw.trim().replace(/\s/g, "").replace(/R\$\s?/i, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatMoneyInput(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function emptyForm(): Omit<ContaFinanceira, "id" | "tipo"> {
  return {
    descricao: "",
    pessoa: "",
    valor: 0,
    vencimento: new Date().toISOString().slice(0, 10),
    status: "aberto",
    categoria: "Comissões",
  };
}

function ContasAReceber() {
  const { contasAReceber, addConta, updateConta, deleteConta } = useFinanceiroContas();
  const [mode, setMode] = useState<DialogMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [valorInput, setValorInput] = useState("0,00");

  const kpis = useMemo(() => {
    const aberto = contasAReceber.filter((c) => c.status === "aberto").reduce((s, c) => s + c.valor, 0);
    const atrasado = contasAReceber.filter((c) => c.status === "atrasado").reduce((s, c) => s + c.valor, 0);
    const previsto = contasAReceber.filter((c) => c.status === "previsto").reduce((s, c) => s + c.valor, 0);
    const recebido = contasAReceber.filter((c) => c.status === "pago").reduce((s, c) => s + c.valor, 0);
    return { aberto, atrasado, previsto, recebido, total: aberto + atrasado + previsto };
  }, [contasAReceber]);

  const readOnly = mode === "view";
  const dialogOpen = mode !== null;

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setValorInput("0,00");
    setMode("create");
  }

  function openView(c: ContaFinanceira) {
    setEditingId(c.id);
    setForm({
      descricao: c.descricao,
      pessoa: c.pessoa,
      valor: c.valor,
      vencimento: c.vencimento,
      status: c.status,
      categoria: c.categoria,
    });
    setValorInput(formatMoneyInput(c.valor));
    setMode("view");
  }

  function openEdit(c: ContaFinanceira) {
    setEditingId(c.id);
    setForm({
      descricao: c.descricao,
      pessoa: c.pessoa,
      valor: c.valor,
      vencimento: c.vencimento,
      status: c.status,
      categoria: c.categoria,
    });
    setValorInput(formatMoneyInput(c.valor));
    setMode("edit");
  }

  function closeDialog() {
    setMode(null);
    setEditingId(null);
  }

  function save() {
    if (!form.pessoa.trim() || !form.descricao.trim()) {
      toast.error("Informe cliente e descrição");
      return;
    }
    const valor = parseMoney(valorInput);
    if (valor <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    const payload = {
      ...form,
      pessoa: form.pessoa.trim(),
      descricao: form.descricao.trim(),
      valor,
      tipo: "receber" as const,
    };
    if (mode === "create") {
      addConta({ ...payload, id: `cr-${Date.now()}` });
      toast.success("Conta a receber cadastrada — já aparece no fluxo de caixa");
    } else if (editingId) {
      updateConta(editingId, payload);
      toast.success("Conta a receber atualizada");
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
        title="Contas a receber"
        description={`Total pendente: ${moneyBRL(kpis.total)} — refletido no fluxo de caixa pela data de vencimento.`}
        actions={
          <>
            <Button size="sm" variant="outline" className="flex-1 sm:flex-none" asChild>
              <Link to="/financeiro/fluxo-caixa">
                <CalendarRange className="w-4 h-4 mr-1" />
                <span className="sm:hidden">Fluxo</span>
                <span className="hidden sm:inline">Ver no fluxo</span>
              </Link>
            </Button>
            <Button size="sm" className="flex-1 sm:flex-none" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" />
              Nova conta
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 [&>*]:min-w-0">
        <FinanceKpiCard label="Em aberto neste mês" value={kpis.aberto} icon={HandCoins} tone="emerald" />
        <FinanceKpiCard label="Em atraso" value={kpis.atrasado} icon={CalendarX2} tone="teal" />
        <FinanceKpiCard label="Previsão de entrada" value={kpis.previsto} icon={CalendarClock} tone="violet" />
        <FinanceKpiCard label="Já recebidas" value={kpis.recebido} icon={CircleCheck} tone="blue" />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {contasAReceber.map((c) => (
          <Card key={c.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{c.pessoa}</div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{c.descricao}</div>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {new Date(c.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                  </span>
                  <Badge variant="outline" className="text-[10px]">{c.categoria}</Badge>
                  {statusBadge(c.status)}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
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
        ))}
        {!contasAReceber.length && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma conta a receber.
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
                <TableHead>Cliente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contasAReceber.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm tabular-nums">
                    {new Date(c.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{c.pessoa}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.descricao}</TableCell>
                  <TableCell><Badge variant="outline">{c.categoria}</Badge></TableCell>
                  <TableCell>{statusBadge(c.status)}</TableCell>
                  <TableCell className="text-sm font-semibold text-right text-emerald-700 dark:text-emerald-400">
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
              ))}
              {!contasAReceber.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                    Nenhuma conta a receber.
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
        icon={<ArrowDownLeft className="w-5 h-5" />}
        title={
          mode === "create" ? "Nova conta a receber"
            : mode === "edit" ? "Editar conta a receber"
              : "Detalhes — conta a receber"
        }
        description="O vencimento define o dia em que a conta aparece no fluxo de caixa."
        footer={
          <FormDialogActions>
            <Button variant="outline" onClick={closeDialog}>{readOnly ? "Fechar" : "Cancelar"}</Button>
            {readOnly ? (
              <Button onClick={() => {
                const c = contasAReceber.find((x) => x.id === editingId);
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
                <DetailField label="Cliente" value={form.pessoa} />
                <DetailField label="Vencimento" value={new Date(form.vencimento + "T12:00:00").toLocaleDateString("pt-BR")} />
                <DetailField label="Descrição" value={form.descricao} className="sm:col-span-2" />
                <DetailField label="Categoria" value={form.categoria} />
                <DetailField label="Status" value={form.status} />
                <DetailField label="Valor" value={moneyBRL(form.valor)} />
              </div>
            </FormSection>
          ) : (
            <FormSection title="Dados da conta">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Cliente</Label>
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
                  <Label>Categoria</Label>
                  <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Comissões", "Sinais", "Taxas", "Reservas", "Aluguéis", "Outros"].map((c) => (
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
                      <SelectItem value="pago">Recebido</SelectItem>
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
