import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import {
  FormDialogShell, FormDialogBody, FormDialogActions, FormSection, DetailField,
} from "@/components/form-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, ArrowDownLeft, ArrowUpRight, Wallet, TrendingUp, TrendingDown,
  CircleDollarSign, MoreHorizontal, Eye, Pencil, Trash2, ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { useFinanceiroContas } from "@/lib/financeiro-contas-store";
import {
  useMovimentosFinanceiros,
  formatDataBR,
  type MovimentoFinanceiro,
  type MovimentoTipo,
} from "@/lib/movimentos-financeiros-store";

export const Route = createFileRoute("/_app/financeiro/movimentacao")({
  head: () => ({ meta: [{ title: "Movimentação financeira — Financeiro" }] }),
  component: Movimentacao,
});

const CATEGORIAS = ["Comissão", "Sinal", "Marketing", "Estrutura", "Pessoal", "Serviços", "Outros"];
const CONTAS = ["Conta corrente", "Cartão corporativo", "Caixa", "Poupança"];

type DialogMode = "create" | "edit" | "view" | null;

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseMoneyInput(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/\s/g, "")
    .replace(/R\$\s?/i, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatInput(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function emptyForm(): Omit<MovimentoFinanceiro, "id"> {
  return {
    data: new Date().toISOString().slice(0, 10),
    desc: "",
    tipo: "Entrada",
    categoria: "Comissão",
    conta: "Conta corrente",
    valor: 0,
    observacoes: "",
  };
}

function Movimentacao() {
  const { saldoInicial, setSaldoInicial } = useFinanceiroContas();
  const { movimentos, addMovimento, updateMovimento, deleteMovimento } = useMovimentosFinanceiros();

  const [inputSaldo, setInputSaldo] = useState(formatInput(saldoInicial));
  const [mode, setMode] = useState<DialogMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [valorInput, setValorInput] = useState("0,00");

  useEffect(() => {
    setInputSaldo(formatInput(saldoInicial));
  }, [saldoInicial]);

  const entradas = useMemo(
    () => movimentos.filter((m) => m.tipo === "Entrada").reduce((s, m) => s + m.valor, 0),
    [movimentos],
  );
  const saidas = useMemo(
    () => movimentos.filter((m) => m.tipo === "Saída").reduce((s, m) => s + m.valor, 0),
    [movimentos],
  );

  const resumo = useMemo(() => {
    const saldo = saldoInicial + entradas - saidas;
    return {
      saldoAnterior: saldoInicial,
      entradas,
      saidas,
      saldo,
      saldoAtual: saldo,
    };
  }, [saldoInicial, entradas, saidas]);

  const sorted = useMemo(
    () => [...movimentos].sort((a, b) => b.data.localeCompare(a.data)),
    [movimentos],
  );

  const readOnly = mode === "view";
  const dialogOpen = mode !== null;

  function salvarSaldoInicial() {
    const parsed = parseMoneyInput(inputSaldo);
    if (parsed == null) {
      toast.error("Informe um valor válido para o saldo inicial");
      return;
    }
    setSaldoInicial(parsed);
    setInputSaldo(formatInput(parsed));
    toast.success("Saldo inicial cadastrado");
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setValorInput("0,00");
    setMode("create");
  }

  function openView(m: MovimentoFinanceiro) {
    setEditingId(m.id);
    setForm({ ...m });
    setValorInput(formatInput(m.valor));
    setMode("view");
  }

  function openEdit(m: MovimentoFinanceiro) {
    setEditingId(m.id);
    setForm({ ...m });
    setValorInput(formatInput(m.valor));
    setMode("edit");
  }

  function closeDialog() {
    setMode(null);
    setEditingId(null);
  }

  function save() {
    if (!form.desc.trim()) {
      toast.error("Informe a descrição");
      return;
    }
    const valor = parseMoneyInput(valorInput);
    if (valor == null || valor <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    const payload = { ...form, desc: form.desc.trim(), valor };
    if (mode === "create") {
      addMovimento({ ...payload, id: `m-${Date.now()}` });
      toast.success("Movimentação criada");
    } else if (editingId) {
      updateMovimento(editingId, payload);
      toast.success("Movimentação atualizada");
    }
    closeDialog();
  }

  function remove(id: string, desc: string) {
    if (!window.confirm(`Excluir a movimentação "${desc}"?`)) return;
    deleteMovimento(id);
    toast.success("Movimentação excluída");
    if (editingId === id) closeDialog();
  }

  const dialogTitle =
    mode === "create" ? "Nova movimentação"
      : mode === "edit" ? "Editar movimentação"
        : "Detalhes da movimentação";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Movimentação financeira"
        description="Entradas e saídas — criar, consultar, editar e excluir."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Nova movimentação
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="space-y-1.5 flex-1 max-w-xs">
              <Label htmlFor="saldo-inicial">Saldo inicial</Label>
              <Input
                id="saldo-inicial"
                inputMode="decimal"
                value={inputSaldo}
                onChange={(e) => setInputSaldo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") salvarSaldoInicial();
                }}
                placeholder="0,00"
              />
              <p className="text-[11px] text-muted-foreground">
                Define o saldo anterior e recalcula o saldo atual.
              </p>
            </div>
          </div>
          <Button onClick={salvarSaldoInicial}>Cadastrar saldo</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 [&>*]:min-w-0">
        <FinanceKpiCard label="Saldo Anterior" value={resumo.saldoAnterior} icon={Wallet} tone="blue" />
        <FinanceKpiCard label="Entradas" value={resumo.entradas} icon={TrendingUp} tone="teal" />
        <FinanceKpiCard label="Saídas" value={resumo.saidas} icon={TrendingDown} tone="rose" />
        <FinanceKpiCard label="Saldo" value={resumo.saldo} icon={CircleDollarSign} tone="violet" />
        <FinanceKpiCard label="Saldo Atual" value={resumo.saldoAtual} icon={Wallet} tone="emerald" />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((m) => {
              const entrada = m.tipo === "Entrada";
              return (
                <TableRow key={m.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDataBR(m.data)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{m.desc}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        entrada
                          ? "border-success/40 text-success bg-success/10"
                          : "border-destructive/40 text-destructive bg-destructive/10"
                      }
                    >
                      {entrada
                        ? <ArrowDownLeft className="w-3 h-3 mr-1" />
                        : <ArrowUpRight className="w-3 h-3 mr-1" />}
                      {m.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{m.categoria}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.conta}</TableCell>
                  <TableCell
                    className={`text-sm font-semibold text-right ${entrada ? "text-success" : "text-destructive"}`}
                  >
                    {entrada ? "+" : "-"}
                    {money(m.valor)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openView(m)}>
                          <Eye className="w-3.5 h-3.5 mr-2" /> Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(m)}>
                          <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => remove(m.id, m.desc)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {!sorted.length && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                  Nenhuma movimentação cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <FormDialogShell
        open={dialogOpen}
        onOpenChange={(o) => { if (!o) closeDialog(); }}
        icon={<ArrowLeftRight className="w-5 h-5" />}
        title={dialogTitle}
        description="Registro de entrada ou saída no caixa."
        footer={
          <FormDialogActions>
            <Button variant="outline" onClick={closeDialog}>
              {readOnly ? "Fechar" : "Cancelar"}
            </Button>
            {readOnly ? (
              <Button
                onClick={() => {
                  if (editingId) {
                    const m = movimentos.find((x) => x.id === editingId);
                    if (m) openEdit(m);
                  }
                }}
              >
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
                <DetailField label="Data" value={formatDataBR(form.data)} />
                <DetailField label="Tipo" value={form.tipo} />
                <DetailField label="Descrição" value={form.desc} className="sm:col-span-2" />
                <DetailField label="Categoria" value={form.categoria} />
                <DetailField label="Conta" value={form.conta} />
                <DetailField label="Valor" value={money(form.valor)} />
                <DetailField label="Observações" value={form.observacoes || "—"} className="sm:col-span-2" />
              </div>
            </FormSection>
          ) : (
            <FormSection title="Dados da movimentação">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select
                    value={form.tipo}
                    onValueChange={(v) => setForm({ ...form, tipo: v as MovimentoTipo })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Entrada">Entrada</SelectItem>
                      <SelectItem value="Saída">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Descrição</Label>
                  <Input
                    value={form.desc}
                    onChange={(e) => setForm({ ...form, desc: e.target.value })}
                    placeholder="Ex.: Comissão venda IM-2001"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select
                    value={form.categoria}
                    onValueChange={(v) => setForm({ ...form, categoria: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Conta</Label>
                  <Select
                    value={form.conta}
                    onValueChange={(v) => setForm({ ...form, conta: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONTAS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Valor</Label>
                  <Input
                    inputMode="decimal"
                    value={valorInput}
                    onChange={(e) => setValorInput(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Observações</Label>
                  <Textarea
                    rows={3}
                    value={form.observacoes}
                    onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  />
                </div>
              </div>
            </FormSection>
          )}
        </FormDialogBody>
      </FormDialogShell>
    </div>
  );
}
