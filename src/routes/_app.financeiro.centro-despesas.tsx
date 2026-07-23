import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { FormDialogShell, FormDialogBody, FormDialogActions, FormSection } from "@/components/form-dialog";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Tags, Receipt, FolderKanban, CalendarX2, Banknote, CircleCheck, Pencil, Trash2,
} from "lucide-react";
import {
  moneyBRL,
  useFinanceiroContas,
  type ContaStatus,
  type TipoDespesa,
} from "@/lib/financeiro-contas-store";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/financeiro/centro-despesas")({
  head: () => ({ meta: [{ title: "Centro de despesas — Financeiro" }] }),
  component: CentroDespesas,
});

function statusBadge(status: ContaStatus) {
  if (status === "atrasado") return <Badge className="bg-red-600 hover:bg-red-600">Atrasado</Badge>;
  if (status === "previsto") return <Badge variant="secondary">Previsto</Badge>;
  if (status === "pago") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Pago</Badge>;
  return <Badge variant="outline">Em aberto</Badge>;
}

function CentroDespesas() {
  const {
    tiposDespesa,
    despesas,
    getTipoDespesaNome,
    addTipoDespesa,
    updateTipoDespesa,
    deleteTipoDespesa,
  } = useFinanceiroContas();

  const [openTipo, setOpenTipo] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);

  const kpis = useMemo(() => {
    const aberto = despesas.filter((c) => c.status === "aberto").reduce((s, c) => s + c.valor, 0);
    const atrasado = despesas.filter((c) => c.status === "atrasado").reduce((s, c) => s + c.valor, 0);
    const pago = despesas.filter((c) => c.status === "pago").reduce((s, c) => s + c.valor, 0);
    return {
      tipos: tiposDespesa.filter((t) => t.ativo).length,
      aberto,
      atrasado,
      pago,
      total: aberto + atrasado,
    };
  }, [despesas, tiposDespesa]);

  function resetForm() {
    setEditId(null);
    setNome("");
    setDescricao("");
    setAtivo(true);
  }

  function openCreate() {
    resetForm();
    setOpenTipo(true);
  }

  function openEdit(t: TipoDespesa) {
    setEditId(t.id);
    setNome(t.nome);
    setDescricao(t.descricao);
    setAtivo(t.ativo);
    setOpenTipo(true);
  }

  function saveTipo() {
    if (!nome.trim()) {
      toast.error("Informe o nome do tipo de despesa");
      return;
    }
    if (editId) {
      updateTipoDespesa(editId, { nome: nome.trim(), descricao: descricao.trim(), ativo });
      toast.success("Tipo de despesa atualizado");
    } else {
      addTipoDespesa({
        id: `td-${Date.now()}`,
        nome: nome.trim(),
        descricao: descricao.trim(),
        ativo,
      });
      toast.success("Tipo de despesa cadastrado");
    }
    setOpenTipo(false);
    resetForm();
  }

  function removeTipo(id: string) {
    const emUso = despesas.some((d) => d.tipoDespesaId === id);
    if (emUso) {
      toast.error("Tipo em uso em despesas. Inative em vez de excluir.");
      return;
    }
    deleteTipoDespesa(id);
    toast.success("Tipo de despesa removido");
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Centro de despesas"
        description="Cadastre tipos de despesa e acompanhe as despesas como em contas a pagar."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/financeiro/contas-a-pagar">Ver contas a pagar</Link>
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" />
              Novo tipo
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <FinanceKpiCard label="Tipos ativos" value={kpis.tipos} icon={Tags} tone="blue" format="number" />
        <FinanceKpiCard label="Despesas em aberto" value={kpis.aberto} icon={Banknote} tone="orange" />
        <FinanceKpiCard label="Despesas em atraso" value={kpis.atrasado} icon={CalendarX2} tone="red" />
        <FinanceKpiCard label="Despesas pagas" value={kpis.pago} icon={CircleCheck} tone="emerald" />
      </div>

      <Tabs defaultValue="despesas">
        <TabsList>
          <TabsTrigger value="despesas">
            <Receipt className="w-3.5 h-3.5 mr-1.5" />
            Despesas
          </TabsTrigger>
          <TabsTrigger value="tipos">
            <FolderKanban className="w-3.5 h-3.5 mr-1.5" />
            Tipos de despesas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="despesas" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo despesa</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {despesas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm tabular-nums">
                      {new Date(c.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{c.pessoa}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.descricao}</TableCell>
                    <TableCell>
                      <Badge className="bg-violet-600/15 text-violet-700 border-violet-300 hover:bg-violet-600/15">
                        {getTipoDespesaNome(c.tipoDespesaId)}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline">{c.categoria}</Badge></TableCell>
                    <TableCell>{statusBadge(c.status)}</TableCell>
                    <TableCell className="text-sm font-semibold text-right text-red-700 dark:text-red-400">
                      {moneyBRL(c.valor)}
                    </TableCell>
                  </TableRow>
                ))}
                {!despesas.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                      Nenhuma despesa cadastrada. Lance em Contas a pagar como tipo despesa.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="tipos" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiposDespesa.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm font-medium">{t.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.descricao || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={t.ativo ? "default" : "secondary"}>
                        {t.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(t)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeTipo(t.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <FormDialogShell
        open={openTipo}
        onOpenChange={(o) => {
          setOpenTipo(o);
          if (!o) resetForm();
        }}
        icon={<Tags className="w-5 h-5" />}
        title={editId ? "Editar tipo de despesa" : "Novo tipo de despesa"}
        description="Use estes tipos para classificar lançamentos em Contas a pagar."
        footer={
          <FormDialogActions>
            <Button variant="outline" onClick={() => setOpenTipo(false)}>Cancelar</Button>
            <Button onClick={saveTipo}>{editId ? "Salvar" : "Cadastrar"}</Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <FormSection title="Dados do tipo">
            <div className="space-y-1.5">
              <Label htmlFor="tipo-nome">Nome</Label>
              <Input id="tipo-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Marketing" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipo-desc">Descrição</Label>
              <Textarea
                id="tipo-desc"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Opcional"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <div className="text-sm font-medium">Ativo</div>
                <div className="text-xs text-muted-foreground">Disponível para novos lançamentos</div>
              </div>
              <Switch checked={ativo} onCheckedChange={setAtivo} />
            </div>
          </FormSection>
        </FormDialogBody>
      </FormDialogShell>
    </div>
  );
}
