import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { ApiError } from "@/lib/api";
import type { UserStatus } from "@/lib/auth";
import {
  createMetaConnection,
  createOzapConnection,
  createTenant,
  deleteMetaConnection,
  deleteOzapConnection,
  fetchTenant,
  fetchTenants,
  slugifyTenantName,
  updateMetaConnection,
  updateOzapConnection,
  updateTenant,
  type Tenant,
  type TenantDetail,
  type TenantMetaConnection,
  type TenantOzapConnection,
} from "@/lib/tenants-api";
import {
  Building2,
  Link2,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/tenants")({
  head: () => ({ meta: [{ title: "Tenants — Zone Connection" }] }),
  component: TenantsPage,
});

type TenantForm = {
  name: string;
  slug: string;
  status: UserStatus;
};

const emptyTenantForm = (): TenantForm => ({
  name: "",
  slug: "",
  status: "ativo",
});

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

function TenantsPage() {
  const [items, setItems] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TenantForm>(emptyTenantForm());
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [metaPageId, setMetaPageId] = useState("");
  const [metaToken, setMetaToken] = useState("");
  const [ozapInstanceId, setOzapInstanceId] = useState("");
  const [savingConnection, setSavingConnection] = useState(false);

  const [deleteMeta, setDeleteMeta] = useState<TenantMetaConnection | null>(
    null,
  );
  const [deleteOzap, setDeleteOzap] = useState<TenantOzapConnection | null>(
    null,
  );

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchTenants());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os tenants.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyTenantForm());
    setSlugTouched(false);
    setFormOpen(true);
  }

  function openEdit(item: Tenant) {
    setFormMode("edit");
    setEditingId(item.id);
    setForm({
      name: item.name,
      slug: item.slug,
      status: item.status,
    });
    setSlugTouched(true);
    setFormOpen(true);
  }

  async function openDetail(item: Tenant) {
    setDetailOpen(true);
    setDetail(null);
    setMetaPageId("");
    setMetaToken("");
    setOzapInstanceId("");
    setDetailLoading(true);
    try {
      setDetail(await fetchTenant(item.id));
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o tenant.",
      );
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  async function reloadDetail(tenantId: string) {
    setDetail(await fetchTenant(tenantId));
    await loadItems();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const slug = form.slug.trim().toLowerCase();

    if (name.length < 2) {
      toast.error("Informe o nome da imobiliária.");
      return;
    }
    if (formMode === "create" && !SLUG_REGEX.test(slug)) {
      toast.error(
        "Slug inválido. Use letras minúsculas, números e hífens (ex.: new-palace).",
      );
      return;
    }

    setSaving(true);
    try {
      if (formMode === "create") {
        await createTenant({ name, slug, status: form.status });
        toast.success("Tenant criado.");
      } else if (editingId) {
        await updateTenant(editingId, { name, status: form.status });
        toast.success("Tenant atualizado.");
      }
      setFormOpen(false);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Falha ao salvar o tenant.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMeta(e: FormEvent) {
    e.preventDefault();
    if (!detail) return;
    const pageId = metaPageId.trim();
    const pageAccessToken = metaToken.trim();
    if (!pageId || !pageAccessToken) {
      toast.error("Informe page ID e page access token.");
      return;
    }

    setSavingConnection(true);
    try {
      await createMetaConnection(detail.id, { pageId, pageAccessToken });
      setMetaPageId("");
      setMetaToken("");
      toast.success("Conexão Meta adicionada.");
      await reloadDetail(detail.id);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Falha ao adicionar conexão Meta.",
      );
    } finally {
      setSavingConnection(false);
    }
  }

  async function handleAddOzap(e: FormEvent) {
    e.preventDefault();
    if (!detail) return;
    const instanceId = Number(ozapInstanceId.trim());
    if (!Number.isInteger(instanceId) || instanceId <= 0) {
      toast.error("Informe um instance ID válido.");
      return;
    }

    setSavingConnection(true);
    try {
      await createOzapConnection(detail.id, { instanceId });
      setOzapInstanceId("");
      toast.success("Conexão OZap adicionada.");
      await reloadDetail(detail.id);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Falha ao adicionar conexão OZap.",
      );
    } finally {
      setSavingConnection(false);
    }
  }

  async function toggleMeta(connection: TenantMetaConnection) {
    if (!detail) return;
    try {
      await updateMetaConnection(detail.id, connection.id, {
        ativo: !connection.ativo,
      });
      await reloadDetail(detail.id);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Falha ao atualizar conexão Meta.",
      );
    }
  }

  async function toggleOzap(connection: TenantOzapConnection) {
    if (!detail) return;
    try {
      await updateOzapConnection(detail.id, connection.id, {
        ativo: !connection.ativo,
      });
      await reloadDetail(detail.id);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Falha ao atualizar conexão OZap.",
      );
    }
  }

  async function confirmDeleteMeta() {
    if (!detail || !deleteMeta) return;
    try {
      await deleteMetaConnection(detail.id, deleteMeta.id);
      toast.success("Conexão Meta removida.");
      setDeleteMeta(null);
      await reloadDetail(detail.id);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Falha ao remover conexão Meta.",
      );
    }
  }

  async function confirmDeleteOzap() {
    if (!detail || !deleteOzap) return;
    try {
      await deleteOzapConnection(detail.id, deleteOzap.id);
      toast.success("Conexão OZap removida.");
      setDeleteOzap(null);
      await reloadDetail(detail.id);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Falha ao remover conexão OZap.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        description="Cadastre imobiliárias e vincule páginas Meta e instâncias OZap."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo tenant
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando tenants…
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
              <Building2 className="h-10 w-10 opacity-40" />
              <p>Nenhum tenant cadastrado.</p>
              <Button variant="outline" size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Criar primeiro tenant
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imobiliária</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[160px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {item.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "ativo" ? "default" : "secondary"
                        }
                      >
                        {item.status === "ativo" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Conexões Meta / OZap"
                          onClick={() => void openDetail(item)}
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Editar"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <FormDialogShell
        open={formOpen}
        onOpenChange={setFormOpen}
        icon={<Building2 className="w-5 h-5" />}
        title={formMode === "create" ? "Novo tenant" : "Editar tenant"}
        description={
          formMode === "create"
            ? "Cadastre uma imobiliária na plataforma Zone Connection."
            : "Atualize nome e status. O slug não pode ser alterado."
        }
      >
        <form onSubmit={(e) => void handleSubmit(e)}>
          <FormDialogBody>
            <FormSection title="Dados">
              <div className="space-y-2">
                <Label htmlFor="tenant-name">Nome</Label>
                <Input
                  id="tenant-name"
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      name,
                      slug:
                        formMode === "create" && !slugTouched
                          ? slugifyTenantName(name)
                          : prev.slug,
                    }));
                  }}
                  placeholder="New Palace"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-slug">Slug</Label>
                <Input
                  id="tenant-slug"
                  value={form.slug}
                  disabled={formMode === "edit"}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setForm((prev) => ({
                      ...prev,
                      slug: e.target.value.toLowerCase(),
                    }));
                  }}
                  placeholder="new-palace"
                  required={formMode === "create"}
                />
                <p className="text-xs text-muted-foreground">
                  Identificador único na URL/login (ex.: new-palace).
                </p>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      status: value as UserStatus,
                    }))
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
            </FormSection>
          </FormDialogBody>
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : formMode === "create" ? (
                "Criar tenant"
              ) : (
                "Salvar"
              )}
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <FormDialogShell
        open={detailOpen}
        onOpenChange={setDetailOpen}
        icon={<Link2 className="w-5 h-5" />}
        title={detail ? `Conexões — ${detail.name}` : "Conexões"}
        description="Vincule páginas do Meta Lead Ads e instâncias OZap a este tenant."
      >
        <FormDialogBody>
          {detailLoading || !detail ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando…
            </div>
          ) : (
            <div className="space-y-6">
              <FormSection title="Meta Lead Ads">
                <form
                  className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
                  onSubmit={(e) => void handleAddMeta(e)}
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="meta-page">Page ID</Label>
                    <Input
                      id="meta-page"
                      value={metaPageId}
                      onChange={(e) => setMetaPageId(e.target.value)}
                      placeholder="1234567890"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="meta-token">Page Access Token</Label>
                    <Input
                      id="meta-token"
                      type="password"
                      value={metaToken}
                      onChange={(e) => setMetaToken(e.target.value)}
                      placeholder="EAA..."
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" disabled={savingConnection}>
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </form>

                {detail.metaConnections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma página Meta vinculada.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {detail.metaConnections.map((connection) => (
                      <li
                        key={connection.id}
                        className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Share2 className="h-4 w-4 shrink-0 text-blue-600" />
                            <span className="truncate font-medium">
                              {connection.pageId}
                            </span>
                            <Badge
                              variant={
                                connection.ativo ? "default" : "secondary"
                              }
                            >
                              {connection.ativo ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            Token {connection.pageAccessToken}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void toggleMeta(connection)}
                          >
                            {connection.ativo ? "Desativar" : "Ativar"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteMeta(connection)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </FormSection>

              <FormSection title="OZap / WhatsApp">
                <form
                  className="grid gap-3 sm:grid-cols-[1fr_auto]"
                  onSubmit={(e) => void handleAddOzap(e)}
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="ozap-instance">Instance ID</Label>
                    <Input
                      id="ozap-instance"
                      value={ozapInstanceId}
                      onChange={(e) => setOzapInstanceId(e.target.value)}
                      placeholder="1143"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" disabled={savingConnection}>
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </form>

                {detail.ozapConnections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma instância OZap vinculada.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {detail.ozapConnections.map((connection) => (
                      <li
                        key={connection.id}
                        className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-emerald-600" />
                          <span className="font-medium">
                            Instância {connection.instanceId}
                          </span>
                          <Badge
                            variant={
                              connection.ativo ? "default" : "secondary"
                            }
                          >
                            {connection.ativo ? "Ativa" : "Inativa"}
                          </Badge>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void toggleOzap(connection)}
                          >
                            {connection.ativo ? "Desativar" : "Ativar"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteOzap(connection)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </FormSection>
            </div>
          )}
        </FormDialogBody>
        <FormDialogActions>
          <Button type="button" variant="outline" onClick={() => setDetailOpen(false)}>
            Fechar
          </Button>
        </FormDialogActions>
      </FormDialogShell>

      <AlertDialog
        open={Boolean(deleteMeta)}
        onOpenChange={(open) => !open && setDeleteMeta(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conexão Meta?</AlertDialogTitle>
            <AlertDialogDescription>
              A página {deleteMeta?.pageId} deixará de enviar leads para este
              tenant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeleteMeta()}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteOzap)}
        onOpenChange={(open) => !open && setDeleteOzap(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conexão OZap?</AlertDialogTitle>
            <AlertDialogDescription>
              A instância {deleteOzap?.instanceId} deixará de enviar leads para
              este tenant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeleteOzap()}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
