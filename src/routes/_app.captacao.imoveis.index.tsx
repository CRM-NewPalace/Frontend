import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
} from "@/components/form-dialog";
import { ApiError } from "@/lib/api";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  createCaptacaoImovel,
  deleteCaptacaoImovel,
  deleteCaptacaoImovelFoto,
  fetchCaptacaoImoveis,
  fetchProprietarios,
  formatBrl,
  updateCaptacaoImovel,
  uploadCaptacaoImovelFoto,
  type CaptacaoImovelTipo,
  type Imovel,
  type Proprietario,
} from "@/lib/captacao-api";
import { FILTER_BAR_SHELL } from "@/lib/filter-bar";
import { TableFrame } from "@/components/operacao-ui";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { ImovelFotoThumb } from "@/components/imovel-foto-thumb";
import { RowIconButton, TableRowActions } from "@/components/table-row-actions";
import { ImovelFichaFields } from "@/components/imovel-ficha-fields";
import {
  emptyImovelFicha,
  fichaToPayload,
  imovelToFicha,
} from "@/lib/imovel-ficha";
import { Building2, Eye, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const imoveisRoute = getRouteApi("/_app/captacao/imoveis");

export const Route = createFileRoute("/_app/captacao/imoveis/")({
  component: CaptacaoImoveisPage,
});

const emptyForm = {
  proprietarioId: "",
  tipo: "apartamento" as CaptacaoImovelTipo,
  cep: "",
  logradouro: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  fotoUrl: "" as string,
  ...emptyImovelFicha(),
};

function CaptacaoImoveisPage() {
  const { proprietarioId } = imoveisRoute.useSearch();
  const [items, setItems] = useState<Imovel[]>([]);
  const [proprietarios, setProprietarios] = useState<Proprietario[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Imovel | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Imovel | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingFoto, setPendingFoto] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [fotoBusy, setFotoBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [list, props] = await Promise.all([
        fetchCaptacaoImoveis({ proprietarioId }),
        fetchProprietarios(),
      ]);
      setItems(list);
      setProprietarios(props);
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
  }, [proprietarioId]);

  function clearPendingFoto() {
    setPendingFoto(null);
    setPendingPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }

  function openEdit(item: Imovel) {
    clearPendingFoto();
    setEditing(item);
    setForm({
      proprietarioId: item.proprietarioId,
      tipo: item.tipo,
      cep: item.cep,
      logradouro: item.logradouro,
      numero: item.numero,
      bairro: item.bairro,
      cidade: item.cidade,
      estado: item.estado,
      fotoUrl: item.fotoUrl ?? "",
      ...imovelToFicha(item),
    });
    setOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form.proprietarioId) {
      toast.error("Selecione o proprietário.");
      return;
    }
    setSaving(true);
    try {
      const ficha = fichaToPayload(form);
      const body = {
        proprietarioId: form.proprietarioId,
        tipo: form.tipo,
        cep: form.cep,
        logradouro: form.logradouro,
        numero: form.numero,
        bairro: form.bairro,
        cidade: form.cidade,
        estado: form.estado,
        ...ficha,
      };
      if (editing) {
        await updateCaptacaoImovel(editing.id, body);
        toast.success("Imóvel atualizado.");
      } else {
        const created = await createCaptacaoImovel(body);
        if (pendingFoto) {
          await uploadCaptacaoImovelFoto(created.id, pendingFoto);
        }
        toast.success("Imóvel cadastrado.");
      }
      clearPendingFoto();
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

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteCaptacaoImovel(pendingDelete.id);
      toast.success("Imóvel excluído.");
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
        title="Imóveis"
        description="Imóveis individuais vinculados aos proprietários."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              clearPendingFoto();
              setForm({
                ...emptyForm,
                proprietarioId: proprietarioId ?? "",
              });
              setOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Novo imóvel
          </Button>
        }
      />
      <div className={FILTER_BAR_SHELL}>
        {proprietarioId ? (
          <p className="text-sm text-muted-foreground">
            Filtrado por proprietário.
          </p>
        ) : null}
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
              <TableHead>Imóvel</TableHead>
              <TableHead>Proprietário</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Captação</TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  Nenhum imóvel cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <Link
                      to="/captacao/imoveis/$id"
                      params={{ id: item.id }}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <ImovelFotoThumb src={item.fotoUrl} alt="" />
                      <span>{item.titulo}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {item.proprietario ? (
                      <Link
                        to="/captacao/proprietarios/$id"
                        params={{ id: item.proprietario.id }}
                        className="hover:underline"
                      >
                        {item.proprietario.nome}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{CAPTACAO_IMOVEL_TIPO_LABEL[item.tipo]}</TableCell>
                  <TableCell>{item.cidade || "—"}</TableCell>
                  <TableCell className="text-right">{formatBrl(item.valor)}</TableCell>
                  <TableCell>
                    {item.captacao ? (
                      <Link
                        to="/captacao/captacoes/$id"
                        params={{ id: item.captacao.id }}
                        className="hover:underline"
                      >
                        {item.captacao.etapa ?? "Ver"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <TableRowActions>
                      <RowIconButton title="Ver detalhes" asChild>
                        <Link
                          to="/captacao/imoveis/$id"
                          params={{ id: item.id }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </RowIconButton>
                      <RowIconButton
                        title="Editar"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
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

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        className="max-w-3xl"
        icon={<Building2 className="h-5 w-5" />}
        title={editing ? "Editar imóvel" : "Novo imóvel"}
        description="Ficha única para captação, venda de usados e o portal do proprietário."
      >
        <form
          onSubmit={handleSave}
          className="flex min-h-0 flex-1 flex-col"
        >
          <FormDialogBody>
            <ImovelFichaFields
              resetKey={`${open}-${editing?.id ?? "new"}`}
              value={form}
              onChange={(ficha) => setForm({ ...form, ...ficha })}
              cadastro={{
                proprietarioId: form.proprietarioId,
                tipo: form.tipo,
                cep: form.cep,
                logradouro: form.logradouro,
                numero: form.numero,
                bairro: form.bairro,
                cidade: form.cidade,
                estado: form.estado,
                proprietarios,
                onChange: (patch) => setForm({ ...form, ...patch }),
              }}
              foto={{
                url: form.fotoUrl || null,
                previewUrl: pendingPreview,
                busy: fotoBusy,
                onAdd: (file) => {
                  if (editing) {
                    setFotoBusy(true);
                    void uploadCaptacaoImovelFoto(editing.id, file)
                      .then((next) => {
                        setForm((current) => ({
                          ...current,
                          fotoUrl: next.fotoUrl ?? "",
                        }));
                        setEditing(next);
                        toast.success("Foto atualizada.");
                      })
                      .catch((err) => {
                        toast.error(
                          err instanceof ApiError
                            ? err.message
                            : "Não foi possível enviar a foto.",
                        );
                      })
                      .finally(() => setFotoBusy(false));
                    return;
                  }
                  setPendingPreview((current) => {
                    if (current) URL.revokeObjectURL(current);
                    return URL.createObjectURL(file);
                  });
                  setPendingFoto(file);
                },
                onRemove: () => {
                  if (editing) {
                    setFotoBusy(true);
                    void deleteCaptacaoImovelFoto(editing.id)
                      .then((next) => {
                        setForm((current) => ({ ...current, fotoUrl: "" }));
                        setEditing(next);
                        toast.success("Foto removida.");
                      })
                      .catch((err) => {
                        toast.error(
                          err instanceof ApiError
                            ? err.message
                            : "Não foi possível remover a foto.",
                        );
                      })
                      .finally(() => setFotoBusy(false));
                    return;
                  }
                  clearPendingFoto();
                },
              }}
            />
          </FormDialogBody>
          <FormDialogActions hint="A ficha vale para captação e venda de usados.">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>
      <ConfirmDeleteDialog
        open={pendingDelete != null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        title="Excluir imóvel?"
        description={
          pendingDelete
            ? `O imóvel “${pendingDelete.titulo}” e as captações ligadas a ele serão removidos. Venda de usados impede a exclusão.`
            : ""
        }
        loading={deleting}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
