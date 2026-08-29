import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api";
import {
  deleteProprietario,
  fetchProprietario,
  updateProprietario,
  updateProprietarioPortal,
  type PessoaTipo,
  type Proprietario,
} from "@/lib/captacao-api";
import { StatusChip } from "@/components/operacao-ui";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { digitsOnly, formatCpfCnpj } from "@/lib/utils";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/captacao/proprietarios/$id")({
  component: ProprietarioDetalhePage,
});

function ProprietarioDetalhePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Proprietario | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalBusy, setPortalBusy] = useState(false);
  const [senhaPortal, setSenhaPortal] = useState("");
  const [senhaGerada, setSenhaGerada] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    tipoPessoa: "fisica" as PessoaTipo,
    cpfCnpj: "",
    telefone: "",
    email: "",
    observacoes: "",
  });

  useEffect(() => {
    setLoading(true);
    void fetchProprietario(id)
      .then(setItem)
      .catch((err) => {
        toast.error(
          err instanceof ApiError ? err.message : "Não foi possível carregar.",
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function togglePortal(ativo: boolean) {
    setPortalBusy(true);
    try {
      const result = await updateProprietarioPortal(id, {
        ativo,
        senha: senhaPortal.trim() || undefined,
      });
      setItem((current) =>
        current
          ? {
              ...current,
              portalAcesso: {
                ativo: result.ativo,
                lastLoginAt: result.lastLoginAt,
              },
            }
          : current,
      );
      setSenhaPortal("");
      if (result.senhaTemporaria) {
        setSenhaGerada(result.senhaTemporaria);
        toast.success("Acesso ativado. Guarde a senha temporária.");
      } else {
        setSenhaGerada(null);
        toast.success(ativo ? "Acesso ao portal ativado." : "Acesso ao portal desativado.");
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível atualizar o acesso.",
      );
    } finally {
      setPortalBusy(false);
    }
  }

  function openEdit() {
    if (!item) return;
    setForm({
      nome: item.nome,
      tipoPessoa: item.tipoPessoa,
      cpfCnpj: formatCpfCnpj(
        digitsOnly(item.cpfCnpj, item.tipoPessoa === "juridica" ? 14 : 11),
      ),
      telefone: item.telefone,
      email: item.email,
      observacoes: item.observacoes,
    });
    setEditOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Informe o nome.");
      return;
    }
    const doc = digitsOnly(
      form.cpfCnpj,
      form.tipoPessoa === "juridica" ? 14 : 11,
    );
    setSaving(true);
    try {
      const next = await updateProprietario(id, { ...form, cpfCnpj: doc });
      setItem({ ...item!, ...next });
      setEditOpen(false);
      toast.success("Proprietário atualizado.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    );
  }
  if (!item) {
    return (
      <div className="space-y-3 py-10">
        <p className="text-sm text-muted-foreground">
          Não foi possível abrir este proprietário.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/captacao/proprietarios">Voltar à lista</Link>
        </Button>
      </div>
    );
  }

  const portalAtivo = item.portalAcesso?.ativo === true;

  return (
    <>
      <PageHeader
        title={item.nome}
        description={`${item.tipoPessoa === "juridica" ? "Pessoa jurídica" : "Pessoa física"} · ${item.telefone || "sem telefone"}`}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={openEdit}>
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Editar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Excluir
            </Button>
            <Button asChild size="sm">
              <Link to="/imoveis" search={{ proprietarioId: item.id }}>
                Cadastrar imóvel
              </Link>
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-primary/15 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>E-mail: {item.email || "—"}</p>
            <p>
              {item.tipoPessoa === "juridica" ? "CNPJ" : "CPF"}:{" "}
              {item.cpfCnpj ? formatCpfCnpj(item.cpfCnpj) : "—"}
            </p>
            <p>Observações: {item.observacoes || "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/15 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Imóveis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(item.imoveis ?? []).length === 0 ? (
              <p className="text-muted-foreground">Nenhum imóvel.</p>
            ) : (
              item.imoveis!.map((imovel) => (
                <Link
                  key={imovel.id}
                  to="/captacao/imoveis/$id"
                  params={{ id: imovel.id }}
                  className="block hover:underline"
                >
                  {imovel.titulo}
                </Link>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="border-primary/15 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Acesso ao Portal</CardTitle>
            <StatusChip tone={portalAtivo ? "emerald" : "muted"}>
              {portalAtivo ? "Ativo" : "Inativo"}
            </StatusChip>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {item.portalAcesso?.lastLoginAt && (
              <p className="text-muted-foreground">
                Último acesso:{" "}
                {new Date(item.portalAcesso.lastLoginAt).toLocaleString("pt-BR")}
              </p>
            )}
            <div className="max-w-sm space-y-1">
              <Label htmlFor="senha-portal">Senha (opcional ao ativar)</Label>
              <Input
                id="senha-portal"
                type="password"
                value={senhaPortal}
                onChange={(e) => setSenhaPortal(e.target.value)}
                placeholder="Mín. 8 caracteres, maiúscula, minúscula e número"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={portalBusy || portalAtivo}
                onClick={() => void togglePortal(true)}
              >
                {portalBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ativar acesso"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={portalBusy || !portalAtivo}
                onClick={() => void togglePortal(false)}
              >
                Desativar acesso
              </Button>
            </div>
            {senhaGerada && (
              <p className="rounded-md border bg-muted/50 p-3">
                Senha temporária (exibida uma vez):{" "}
                <span className="font-mono font-medium">{senhaGerada}</span>
              </p>
            )}
            <p className="text-muted-foreground">
              O proprietário entra em <span className="font-mono">/portal/login</span> com o
              e-mail cadastrado. Sem e-mail, o acesso não pode ser ativado.
            </p>
          </CardContent>
        </Card>
      </div>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <form onSubmit={(e) => void handleSave(e)}>
            <DialogHeader>
              <DialogTitle>Editar proprietário</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-3">
              <div>
                <Label>Nome</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <select
                  className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.tipoPessoa}
                  onChange={(e) => {
                    const tipo = e.target.value as PessoaTipo;
                    setForm({
                      ...form,
                      tipoPessoa: tipo,
                      cpfCnpj: formatCpfCnpj(
                        digitsOnly(form.cpfCnpj, tipo === "juridica" ? 14 : 11),
                      ),
                    });
                  }}
                >
                  <option value="fisica">Pessoa física</option>
                  <option value="juridica">Pessoa jurídica</option>
                </select>
              </div>
              <div>
                <Label>
                  {form.tipoPessoa === "juridica" ? "CNPJ" : "CPF"}
                </Label>
                <Input
                  value={form.cpfCnpj}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cpfCnpj: formatCpfCnpj(
                        digitsOnly(
                          e.target.value,
                          form.tipoPessoa === "juridica" ? 14 : 11,
                        ),
                      ),
                    })
                  }
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={form.telefone}
                  onChange={(e) =>
                    setForm({ ...form, telefone: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Input
                  value={form.observacoes}
                  onChange={(e) =>
                    setForm({ ...form, observacoes: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir proprietário?"
        description="Só é possível se não houver imóveis, captações ou pós-venda."
        loading={deleting}
        onConfirm={() => {
          setDeleting(true);
          void deleteProprietario(item.id)
            .then(() => {
              toast.success("Proprietário excluído.");
              void navigate({ to: "/captacao/proprietarios" });
            })
            .catch((err) => {
              toast.error(
                err instanceof ApiError
                  ? err.message
                  : "Não foi possível excluir.",
              );
            })
            .finally(() => setDeleting(false));
        }}
      />
    </>
  );
}
