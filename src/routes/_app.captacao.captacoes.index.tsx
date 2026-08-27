import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { useCatalog } from "@/lib/catalog-store";
import {
  CAPTACAO_ORIGENS_PADRAO,
  createCaptacao,
  deleteCaptacao,
  fetchCaptacaoImoveis,
  fetchCaptacaoResponsaveis,
  fetchCaptacoes,
  fetchProprietarios,
  formatBrl,
  type Captacao,
  type CaptacaoResponsavel,
  type Imovel,
  type Proprietario,
} from "@/lib/captacao-api";
import { FILTER_BAR_SHELL, FILTER_CONTROL } from "@/lib/filter-bar";
import { StatusChip, TableFrame } from "@/components/operacao-ui";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { ImovelFotoThumb } from "@/components/imovel-foto-thumb";
import { RowIconButton, TableRowActions } from "@/components/table-row-actions";
import { maskMoneyInput, parseOptionalMoneyInput } from "@/lib/money-input";
import { Eye, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/captacao/captacoes/")({
  component: CaptacoesPage,
});

function CaptacoesPage() {
  const { origens } = useCatalog();
  const origemOpcoes = origens.length ? origens : [...CAPTACAO_ORIGENS_PADRAO];
  const [items, setItems] = useState<Captacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Captacao | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [proprietarios, setProprietarios] = useState<Proprietario[]>([]);
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [responsaveis, setResponsaveis] = useState<CaptacaoResponsavel[]>([]);
  const [filtros, setFiltros] = useState({
    origem: "",
    exclusividade: "",
    cidade: "",
  });
  const me = getSession();
  const [form, setForm] = useState({
    proprietarioId: "",
    imovelId: "",
    responsavelId: me?.id ?? "",
    origem: "",
    exclusividade: false,
    valorPretendido: "",
    valorAvaliacao: "",
  });

  const imoveisDoDono = useMemo(
    () => imoveis.filter((i) => i.proprietarioId === form.proprietarioId),
    [imoveis, form.proprietarioId],
  );

  async function load() {
    setLoading(true);
    try {
      setItems(
        await fetchCaptacoes({
          origem: filtros.origem || undefined,
          exclusividade:
            filtros.exclusividade === ""
              ? undefined
              : filtros.exclusividade === "sim",
          cidade: filtros.cidade || undefined,
        }),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível listar.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openCreate() {
    const [props, ims, users] = await Promise.all([
      fetchProprietarios(),
      fetchCaptacaoImoveis(),
      fetchCaptacaoResponsaveis(),
    ]);
    setProprietarios(props);
    setImoveis(ims);
    setResponsaveis(users);
    setForm({
      proprietarioId: "",
      imovelId: "",
      responsavelId: me?.id ?? users[0]?.id ?? "",
      origem: origemOpcoes[0] ?? "",
      exclusividade: false,
      valorPretendido: "",
      valorAvaliacao: "",
    });
    setOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createCaptacao({
        proprietarioId: form.proprietarioId,
        imovelId: form.imovelId,
        responsavelId: form.responsavelId,
        origem: form.origem,
        exclusividade: form.exclusividade,
        valorPretendido: parseOptionalMoneyInput(form.valorPretendido) ?? undefined,
        valorAvaliacao: parseOptionalMoneyInput(form.valorAvaliacao) ?? undefined,
      });
      toast.success("Captação criada.");
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível criar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteCaptacao(pendingDelete.id);
      toast.success("Captação excluída.");
      setPendingDelete(null);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível excluir.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Captações"
        description="Processos no funil de Captação. A etapa inicial vem do funil ativo."
        actions={
          <Button size="sm" onClick={() => void openCreate()}>
            <Plus className="mr-1 h-4 w-4" />
            Nova captação
          </Button>
        }
      />
      <div className={FILTER_BAR_SHELL}>
        <Input
          className={FILTER_CONTROL}
          placeholder="Cidade"
          value={filtros.cidade}
          onChange={(e) => setFiltros({ ...filtros, cidade: e.target.value })}
        />
        <Input
          className={FILTER_CONTROL}
          placeholder="Origem"
          value={filtros.origem}
          onChange={(e) => setFiltros({ ...filtros, origem: e.target.value })}
        />
        <select
          className={`h-9 rounded-md border px-2 text-sm ${FILTER_CONTROL}`}
          value={filtros.exclusividade}
          onChange={(e) =>
            setFiltros({ ...filtros, exclusividade: e.target.value })
          }
        >
          <option value="">Exclusividade</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
        <Button variant="outline" onClick={() => void load()}>
          Filtrar
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      ) : (
        <TableFrame>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proprietário</TableHead>
              <TableHead>Imóvel</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Exclusividade</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  Nenhuma captação.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      to="/captacao/proprietarios/$id"
                      params={{ id: item.proprietario.id }}
                      className="hover:underline"
                    >
                      {item.proprietario.nome}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      to="/captacao/imoveis/$id"
                      params={{ id: item.imovel.id }}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <ImovelFotoThumb src={item.imovel.fotoUrl} alt="" />
                      <span>{item.imovel.titulo}</span>
                    </Link>
                  </TableCell>
                  <TableCell>{item.responsavel.name}</TableCell>
                  <TableCell>{item.origem || "—"}</TableCell>
                  <TableCell>
                    {item.exclusividade ? (
                      <StatusChip tone="teal">Sim</StatusChip>
                    ) : (
                      <span className="text-muted-foreground">Não</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatBrl(item.valorPretendido)}
                  </TableCell>
                  <TableCell>
                    <Link
                      to="/captacao/captacoes/$id"
                      params={{ id: item.id }}
                      className="hover:underline"
                    >
                      {item.funilEtapa.label}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    <TableRowActions>
                      <RowIconButton title="Ver detalhes" asChild>
                        <Link
                          to="/captacao/captacoes/$id"
                          params={{ id: item.id }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </RowIconButton>
                      <RowIconButton title="Editar" asChild>
                        <Link
                          to="/captacao/captacoes/$id"
                          params={{ id: item.id }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </RowIconButton>
                      <RowIconButton
                        title="Excluir"
                        destructive
                        onClick={() => setPendingDelete(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </RowIconButton>
                    </TableRowActions>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </TableFrame>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>Nova captação</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-3">
              <div>
                <Label>Proprietário</Label>
                <select
                  className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.proprietarioId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      proprietarioId: e.target.value,
                      imovelId: "",
                    })
                  }
                >
                  <option value="">Selecione</option>
                  {proprietarios.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Imóvel</Label>
                <select
                  className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.imovelId}
                  onChange={(e) => setForm({ ...form, imovelId: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {imoveisDoDono.map((imovel) => (
                    <option key={imovel.id} value={imovel.id}>
                      {imovel.titulo}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Responsável</Label>
                <select
                  className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.responsavelId}
                  onChange={(e) =>
                    setForm({ ...form, responsavelId: e.target.value })
                  }
                >
                  {responsaveis.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Origem</Label>
                <select
                  className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.origem}
                  onChange={(e) => setForm({ ...form, origem: e.target.value })}
                >
                  {origemOpcoes.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.exclusividade}
                  onChange={(e) =>
                    setForm({ ...form, exclusividade: e.target.checked })
                  }
                />
                Exclusividade
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Valor pretendido</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0,00"
                    value={form.valorPretendido}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        valorPretendido: maskMoneyInput(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Valor de avaliação</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0,00"
                    value={form.valorAvaliacao}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        valorAvaliacao: maskMoneyInput(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Criando…" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDeleteDialog
        open={pendingDelete != null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        title="Excluir captação?"
        description={
          pendingDelete
            ? `A captação de ${pendingDelete.proprietario.nome} será removida. O imóvel permanece cadastrado.`
            : ""
        }
        loading={deleting}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
