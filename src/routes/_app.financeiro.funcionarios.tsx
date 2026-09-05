import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { FormDialogActions, FormDialogBody, FormDialogShell } from "@/components/form-dialog";
import { TablePager } from "@/components/table-pager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import {
  createFuncionario,
  deleteFuncionario,
  downloadContracheque,
  fetchContracheques,
  fetchFuncionarios,
  updateFuncionario,
  type ContrachequeHistorico,
  type Funcionario,
  type FuncionarioLancamento,
} from "@/lib/funcionarios-api";
import { SOFT_BTN } from "@/lib/soft-btn";
import { useTablePager } from "@/lib/use-table-pager";
import { getSession } from "@/lib/auth";
import {
  Download,
  History,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/financeiro/funcionarios")({
  head: () => ({ meta: [{ title: "Funcionários — Zone Connection" }] }),
  component: Page,
});

type LineForm = { descricao: string; valor: string };

type FormState = {
  nome: string;
  cargo: string;
  empresa: string;
  status: "ativo" | "inativo";
  salarioBruto: string;
  beneficios: LineForm[];
  descontos: LineForm[];
  observacoes: string;
};

function emptyForm(empresa = ""): FormState {
  return {
    nome: "",
    cargo: "",
    empresa,
    status: "ativo",
    salarioBruto: "",
    beneficios: [{ descricao: "", valor: "" }],
    descontos: [{ descricao: "", valor: "" }],
    observacoes: "",
  };
}

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseMoney(raw: string) {
  const normalized = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function toLines(items: FuncionarioLancamento[]): LineForm[] {
  return items.length
    ? items.map((item) => ({
        descricao: item.descricao,
        valor: item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
      }))
    : [{ descricao: "", valor: "" }];
}

function fromLines(items: LineForm[]): FuncionarioLancamento[] {
  return items
    .map((item) => ({
      descricao: item.descricao.trim(),
      valor: parseMoney(item.valor),
    }))
    .filter((item) => item.descricao);
}

function Page() {
  const session = getSession();
  const empresaPadrao = session?.tenant?.name ?? "";
  const [items, setItems] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Funcionario | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(empresaPadrao));
  const [removing, setRemoving] = useState<Funcionario | null>(null);
  const [historicoDe, setHistoricoDe] = useState<Funcionario | null>(null);
  const [historico, setHistorico] = useState<ContrachequeHistorico[]>([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchFuncionarios());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os funcionários.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      [item.nome, item.cargo, item.empresa].some((v) =>
        v.toLowerCase().includes(term),
      ),
    );
  }, [items, q]);

  const pager = useTablePager(filtered, q);

  const bruto = parseMoney(form.salarioBruto);
  const beneficios = fromLines(form.beneficios);
  const descontos = fromLines(form.descontos);
  const liquido =
    bruto +
    beneficios.reduce((s, i) => s + i.valor, 0) -
    descontos.reduce((s, i) => s + i.valor, 0);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(empresaPadrao));
    setDialogOpen(true);
  }

  function openEdit(item: Funcionario) {
    setEditing(item);
    setForm({
      nome: item.nome,
      cargo: item.cargo,
      empresa: item.empresa,
      status: item.status,
      salarioBruto: item.salarioBruto.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      }),
      beneficios: toLines(item.beneficios),
      descontos: toLines(item.descontos),
      observacoes: item.observacoes,
    });
    setDialogOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        cargo: form.cargo.trim(),
        empresa: form.empresa.trim() || undefined,
        status: form.status,
        salarioBruto: bruto,
        beneficios,
        descontos,
        observacoes: form.observacoes.trim(),
      };
      if (editing) await updateFuncionario(editing.id, payload);
      else await createFuncionario(payload);
      toast.success(editing ? "Funcionário atualizado." : "Funcionário cadastrado.");
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    try {
      await deleteFuncionario(removing.id);
      toast.success("Funcionário excluído.");
      setRemoving(null);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível excluir.",
      );
    }
  }

  async function openHistorico(item: Funcionario) {
    setHistoricoDe(item);
    setHistoricoLoading(true);
    try {
      setHistorico(await fetchContracheques(item.id));
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível carregar o histórico.",
      );
    } finally {
      setHistoricoLoading(false);
    }
  }

  async function onDownload(item: Funcionario) {
    setDownloadingId(item.id);
    try {
      await downloadContracheque(item.id);
      toast.success("Contracheque gerado com a data de hoje.");
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível gerar o PDF.",
      );
    } finally {
      setDownloadingId(null);
    }
  }

  function setLine(
    key: "beneficios" | "descontos",
    index: number,
    patch: Partial<LineForm>,
  ) {
    setForm((current) => ({
      ...current,
      [key]: current[key].map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  return (
    <div>
      <PageHeader
        title="Funcionários"
        description="Cadastre o salário uma vez. Ao baixar o contracheque, o PDF usa esses dados com a data de hoje."
        actions={
          <Button type="button" className={SOFT_BTN} onClick={openCreate}>
            <Plus className="size-4" />
            Novo funcionário
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, cargo ou empresa"
          className="max-w-sm"
        />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Users className="size-8 opacity-50" />
            <p className="text-sm">Nenhum funcionário cadastrado.</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">Líquido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pager.pageItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.nome}</div>
                      {item.ultimaCompetencia ? (
                        <div className="text-xs text-muted-foreground">
                          Último recibo: {item.ultimaCompetencia}
                          {item.variacaoLiquido != null
                            ? ` · ${item.variacaoLiquido > 0 ? "+" : ""}${money(item.variacaoLiquido)}`
                            : ""}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>{item.cargo}</TableCell>
                    <TableCell>{item.empresa}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(item.salarioBruto)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {money(item.salarioLiquido)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.status === "ativo" ? "secondary" : "outline"}>
                        {item.status === "ativo" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          title="Baixar contracheque"
                          onClick={() => void onDownload(item)}
                          disabled={downloadingId === item.id}
                        >
                          {downloadingId === item.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Download className="size-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          title="Histórico"
                          onClick={() => void openHistorico(item)}
                        >
                          <History className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          title="Editar"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          title="Excluir"
                          onClick={() => setRemoving(item)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePager
              page={pager.page}
              totalPages={pager.totalPages}
              total={pager.total}
              onPageChange={pager.setPage}
            />
          </>
        )}
      </Card>

      <FormDialogShell
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        icon={<Users className="size-5" />}
        title={editing ? "Editar funcionário" : "Novo funcionário"}
        description="Salário, benefícios e descontos ficam salvos. O líquido é calculado automaticamente."
      >
        <form onSubmit={onSubmit}>
          <FormDialogBody className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="nome">Funcionário</Label>
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={(e) => setForm((c) => ({ ...c, nome: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cargo">Cargo</Label>
                <Input
                  id="cargo"
                  value={form.cargo}
                  onChange={(e) => setForm((c) => ({ ...c, cargo: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="empresa">Empresa</Label>
                <Input
                  id="empresa"
                  value={form.empresa}
                  onChange={(e) => setForm((c) => ({ ...c, empresa: e.target.value }))}
                  placeholder={empresaPadrao}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bruto">Salário bruto</Label>
                <Input
                  id="bruto"
                  value={form.salarioBruto}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, salarioBruto: e.target.value }))
                  }
                  inputMode="decimal"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((c) => ({ ...c, status: v as "ativo" | "inativo" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <LancamentosEditor
              title="Benefícios / adicionais"
              items={form.beneficios}
              onChange={(index, patch) => setLine("beneficios", index, patch)}
              onAdd={() =>
                setForm((c) => ({
                  ...c,
                  beneficios: [...c.beneficios, { descricao: "", valor: "" }],
                }))
              }
            />
            <LancamentosEditor
              title="Descontos"
              items={form.descontos}
              onChange={(index, patch) => setLine("descontos", index, patch)}
              onAdd={() =>
                setForm((c) => ({
                  ...c,
                  descontos: [...c.descontos, { descricao: "", valor: "" }],
                }))
              }
            />

            <div className="rounded-xl bg-muted/40 px-3 py-2 text-sm">
              Líquido previsto:{" "}
              <span className="font-semibold tabular-nums">{money(liquido)}</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="obs">Observações</Label>
              <Textarea
                id="obs"
                value={form.observacoes}
                onChange={(e) =>
                  setForm((c) => ({ ...c, observacoes: e.target.value }))
                }
                rows={3}
              />
            </div>
          </FormDialogBody>
          <FormDialogActions>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Salvar
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <FormDialogShell
        open={Boolean(historicoDe)}
        onOpenChange={(open) => {
          if (!open) setHistoricoDe(null);
        }}
        icon={<History className="size-5" />}
        title={`Histórico — ${historicoDe?.nome ?? ""}`}
        description="Recibos gerados. A variação compara com a competência anterior."
      >
        <FormDialogBody className="p-4">
          {historicoLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum contracheque baixado ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {historico.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-black/5 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">{row.competenciaLabel}</div>
                    <div className="text-xs text-muted-foreground">
                      Pago em{" "}
                      {new Date(`${row.dataPagamento}T12:00:00`).toLocaleDateString(
                        "pt-BR",
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="tabular-nums font-medium">
                      {money(row.salarioLiquido)}
                    </div>
                    {row.variacaoLiquido != null ? (
                      <div className="text-xs text-muted-foreground">
                        {row.variacaoLiquido > 0 ? "+" : ""}
                        {money(row.variacaoLiquido)} vs ant.
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </FormDialogBody>
      </FormDialogShell>

      <FormDialogShell
        open={Boolean(removing)}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        icon={<Trash2 className="size-5" />}
        title="Excluir funcionário"
        description="O cadastro e o histórico de contracheques serão removidos."
      >
        <FormDialogActions>
          <Button type="button" variant="ghost" onClick={() => setRemoving(null)}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={() => void confirmRemove()}>
            Excluir
          </Button>
        </FormDialogActions>
      </FormDialogShell>
    </div>
  );
}

function LancamentosEditor({
  title,
  items,
  onChange,
  onAdd,
}: {
  title: string;
  items: LineForm[];
  onChange: (index: number, patch: Partial<LineForm>) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{title}</Label>
        <Button type="button" variant="ghost" size="sm" onClick={onAdd}>
          <Plus className="size-3.5" />
          Linha
        </Button>
      </div>
      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-[1fr_8rem] gap-2">
          <Input
            placeholder="Descrição"
            value={item.descricao}
            onChange={(e) => onChange(index, { descricao: e.target.value })}
          />
          <Input
            placeholder="0,00"
            inputMode="decimal"
            value={item.valor}
            onChange={(e) => onChange(index, { valor: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}
