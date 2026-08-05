import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import {
  createParceiro,
  deleteParceiro,
  fetchParceiros,
  updateParceiro,
} from "@/lib/financeiro-api";
import { digitsOnly, formatCpfCnpj } from "@/lib/utils";
import {
  type ParceiroFinanceiro,
  type TipoParceiro,
} from "@/lib/financeiro-mock";
import { formatPhone, PHONE_PLACEHOLDER } from "@/lib/phone";
import { Building2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/financeiro/clientes-fornecedores")({
  head: () => ({
    meta: [{ title: "Clientes e fornecedores ? Zone Connection" }],
  }),
  component: Page,
});

const TIPO_OPTIONS = [
  { value: "todos", label: "Todos os tipos" },
  { value: "cliente", label: "Clientes" },
  { value: "fornecedor", label: "Fornecedores" },
  { value: "ambos", label: "Ambos" },
];

const STATUS_ATIVO = [
  { value: "todos", label: "Ativos e inativos" },
  { value: "ativo", label: "Somente ativos" },
  { value: "inativo", label: "Somente inativos" },
];

const TIPO_FORM_OPTIONS: { value: TipoParceiro; label: string }[] = [
  { value: "cliente", label: "Cliente" },
  { value: "fornecedor", label: "Fornecedor" },
  { value: "ambos", label: "Cliente e fornecedor" },
];

type FormState = {
  nome: string;
  documento: string;
  tipo: TipoParceiro;
  email: string;
  telefone: string;
  cidade: string;
  imobiliaria: string;
  ativo: boolean;
};

const EMPTY_FORM: FormState = {
  nome: "",
  documento: "",
  tipo: "cliente",
  email: "",
  telefone: "",
  cidade: "",
  imobiliaria: "",
  ativo: true,
};

function toForm(p: ParceiroFinanceiro): FormState {
  return {
    nome: p.nome,
    documento: formatCpfCnpj(p.documento),
    tipo: p.tipo,
    email: p.email || "",
    telefone: p.telefone || "",
    cidade: p.cidade || "",
    imobiliaria: p.imobiliaria || "",
    ativo: p.ativo,
  };
}

function Page() {
  const [parceiros, setParceiros] = useState<ParceiroFinanceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [ativo, setAtivo] = useState("todos");
  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ParceiroFinanceiro | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setParceiros(await fetchParceiros());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os parceiros.",
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
    return parceiros.filter((p) => {
      if (tipo !== "todos" && p.tipo !== (tipo as TipoParceiro)) return false;
      if (ativo === "ativo" && !p.ativo) return false;
      if (ativo === "inativo" && p.ativo) return false;
      if (!q) return true;
      return (
        p.nome.toLowerCase().includes(q) ||
        p.documento.includes(q) ||
        p.cidade.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.imobiliaria || "").toLowerCase().includes(q)
      );
    });
  }, [parceiros, search, tipo, ativo]);

  const hasActive = Boolean(search || tipo !== "todos" || ativo !== "todos");

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(p: ParceiroFinanceiro) {
    setFormMode("edit");
    setEditingId(p.id);
    setForm(toForm(p));
    setOpen(true);
  }

  function upsertLocal(updated: ParceiroFinanceiro) {
    setParceiros((prev) =>
      [updated, ...prev.filter((p) => p.id !== updated.id)].sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR"),
      ),
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nome = form.nome.trim();
    const documento = digitsOnly(form.documento);
    if (!nome) {
      toast.error("Informe o nome do parceiro.");
      return;
    }
    if (documento.length !== 11 && documento.length !== 14) {
      toast.error("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).");
      return;
    }

    const payload = {
      nome,
      documento,
      tipo: form.tipo,
      email: form.email.trim() || undefined,
      telefone: form.telefone.trim() || undefined,
      cidade: form.cidade.trim() || undefined,
      imobiliaria: form.imobiliaria.trim(),
      ativo: form.ativo,
    };

    setSaving(true);
    try {
      if (formMode === "edit" && editingId) {
        const updated = await updateParceiro(editingId, payload);
        upsertLocal(updated);
        toast.success(`${updated.nome} atualizado.`);
      } else {
        const created = await createParceiro(payload);
        upsertLocal(created);
        toast.success(`${created.nome} cadastrado.`);
      }
      setOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      setFormMode("create");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "N?o foi poss?vel salvar o parceiro.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteParceiro(deleteTarget.id);
      setParceiros((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast.success(`${deleteTarget.nome} exclu?do.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "N?o foi poss?vel excluir o parceiro.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Clientes e fornecedores"
        description="Cadastro de parceiros financeiros"
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Novo parceiro
          </Button>
        }
      />

      <FinanceiroFiltrosBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar nome, CNPJ, cidade?"
        tipo={tipo}
        onTipoChange={setTipo}
        tipoOptions={TIPO_OPTIONS}
        extra={
          <Select value={ativo} onValueChange={setAtivo}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ATIVO.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        hasActive={hasActive}
        onClear={() => {
          setSearch("");
          setTipo("todos");
          setAtivo("todos");
        }}
      />

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando parceiros?
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Imobiliária</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[88px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground py-10"
                  >
                    Nenhum parceiro encontrado para os filtros.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {p.documento}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {p.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.imobiliaria || "—"}</TableCell>
                    <TableCell>{p.cidade || "—"}</TableCell>
                    <TableCell className="text-sm">
                      <div>{p.email || "—"}</div>
                      <div className="text-muted-foreground">
                        {p.telefone || "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          p.ativo
                            ? "border-transparent bg-emerald-500/15 text-emerald-700"
                            : "text-muted-foreground"
                        }
                      >
                        {p.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Editar"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Excluir"
                          onClick={() => setDeleteTarget(p)}
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
        {rows.length} de {parceiros.length} parceiros
      </p>

      <FormDialogShell
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setFormMode("create");
            setEditingId(null);
            setForm(EMPTY_FORM);
          }
        }}
        icon={<Building2 className="w-5 h-5" />}
        title={formMode === "edit" ? "Editar parceiro" : "Novo parceiro"}
        description={
          formMode === "edit"
            ? "Atualize os dados do cliente ou fornecedor."
            : "Cadastre um cliente, fornecedor ou ambos."
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <FormDialogBody>
            <FormSection title="Dados do parceiro">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="parceiro-nome">Nome *</Label>
                  <Input
                    id="parceiro-nome"
                    value={form.nome}
                    onChange={(e) => setField("nome", e.target.value)}
                    placeholder="Ex.: Construtora Horizonte Ltda"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parceiro-documento">CPF / CNPJ *</Label>
                  <Input
                    id="parceiro-documento"
                    inputMode="numeric"
                    autoComplete="off"
                    value={form.documento}
                    onChange={(e) =>
                      setField("documento", formatCpfCnpj(e.target.value))
                    }
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    maxLength={18}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select
                    value={form.tipo}
                    onValueChange={(v) => setField("tipo", v as TipoParceiro)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPO_FORM_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parceiro-email">E-mail</Label>
                  <Input
                    id="parceiro-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="financeiro@empresa.com.br"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parceiro-telefone">Telefone</Label>
                  <Input
                    id="parceiro-telefone"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.telefone}
                    onChange={(e) =>
                      setField("telefone", formatPhone(e.target.value))
                    }
                    placeholder={PHONE_PLACEHOLDER}
                    maxLength={15}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parceiro-cidade">Cidade</Label>
                  <Input
                    id="parceiro-cidade"
                    value={form.cidade}
                    onChange={(e) => setField("cidade", e.target.value)}
                    placeholder="São Paulo"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="parceiro-imobiliaria">Imobiliária</Label>
                  <Input
                    id="parceiro-imobiliaria"
                    value={form.imobiliaria}
                    onChange={(e) => setField("imobiliaria", e.target.value)}
                    placeholder="Ex.: New Palace Imóveis"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 sm:col-span-2">
                  <div>
                    <div className="text-sm font-medium">Ativo</div>
                    <p className="text-xs text-muted-foreground">
                      Parceiros inativos ficam ocultos no filtro padr?o.
                    </p>
                  </div>
                  <Switch
                    checked={form.ativo}
                    onCheckedChange={(v) => setField("ativo", v)}
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
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Salvando?"
                : formMode === "edit"
                  ? "Salvar altera??es"
                  : "Salvar parceiro"}
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(next) => {
          if (!next && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir parceiro?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Isso remover? permanentemente "${deleteTarget.nome}" do cadastro financeiro.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? "Excluindo?" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
