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
  createTenantInitialAdmin,
  deleteMetaConnection,
  deleteOzapConnection,
  deleteTenant,
  fetchTenant,
  fetchTenants,
  resetTenantAdminPassword,
  slugifyTenantName,
  updateMetaConnection,
  updateOzapConnection,
  updateTenant,
  type Tenant,
  type TenantAdminUser,
  type TenantDetail,
  type TenantMetaConnection,
  type TenantOzapConnection,
} from "@/lib/tenants-api";
import {
  adminGroupEnabled,
  modulesFromTenantJson,
  modulesPresetForPlano,
  PLANO_LABELS,
  PLANO_MAX_USUARIOS,
  setAdminGroupEnabled,
  TENANT_MODULE_GROUPS,
  type TenantModuleKey,
  type TenantPlano,
} from "@/lib/tenant-modules";
import {
  Building2,
  Check,
  Copy,
  KeyRound,
  Link2,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Share2,
  Shield,
  Trash2,
  UserPlus,
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
  logoUrl: string;
  plano: TenantPlano;
  usuariosExtras: number;
  iaBotEnabled: boolean;
  modules: Record<TenantModuleKey, boolean>;
};

const emptyTenantForm = (): TenantForm => ({
  name: "",
  slug: "",
  status: "ativo",
  logoUrl: "",
  plano: "bronze",
  usuariosExtras: 0,
  iaBotEnabled: false,
  modules: modulesPresetForPlano("bronze"),
});

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOGO_URL_REGEX = /^https?:\/\/.+/i;

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

  const [savingAdmin, setSavingAdmin] = useState(false);

  const [deleteMeta, setDeleteMeta] = useState<TenantMetaConnection | null>(
    null,
  );
  const [deleteOzap, setDeleteOzap] = useState<TenantOzapConnection | null>(
    null,
  );
  const [deleteTenantTarget, setDeleteTenantTarget] = useState<Tenant | null>(
    null,
  );
  const [deletingTenant, setDeletingTenant] = useState(false);

  const [editingAdmin, setEditingAdmin] = useState<TenantAdminUser | null>(
    null,
  );
  const [resettingPassword, setResettingPassword] = useState(false);
  const [credentials, setCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    slug: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<"email" | "password" | null>(
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
    setEditingAdmin(null);
    setForm(emptyTenantForm());
    setSlugTouched(false);
    setFormOpen(true);
  }

  function openEdit(item: Tenant) {
    setFormMode("edit");
    setEditingId(item.id);
    setEditingAdmin(item.admin);
    setForm({
      name: item.name,
      slug: item.slug,
      status: item.status,
      logoUrl: item.logoUrl ?? "",
      plano: item.plano ?? "bronze",
      usuariosExtras: item.usuariosExtras ?? 0,
      iaBotEnabled: item.iaBotEnabled ?? false,
      modules: modulesFromTenantJson(item.modules),
    });
    setSlugTouched(true);
    setFormOpen(true);
  }

  async function copyText(value: string, field: "email" | "password") {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  async function handleResetAdminPassword() {
    if (!editingId || !editingAdmin) return;
    setResettingPassword(true);
    try {
      const result = await resetTenantAdminPassword(editingId);
      setCredentials({
        name: result.user.name,
        email: result.user.email,
        password: result.temporaryPassword,
        slug: form.slug,
      });
      setEditingAdmin({
        ...editingAdmin,
        ...result.user,
      });
      toast.success("Senha temporária gerada.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Falha ao gerar senha temporária.",
      );
    } finally {
      setResettingPassword(false);
    }
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

    const logoUrl = form.logoUrl.trim();
    if (logoUrl && !LOGO_URL_REGEX.test(logoUrl)) {
      toast.error("A URL do logo deve começar com http:// ou https://.");
      return;
    }

    const modules = { ...form.modules };

    if (formMode === "create") {
      setSaving(true);
      try {
        const created = await createTenant({
          name,
          slug,
          status: form.status,
          logoUrl: logoUrl || null,
          plano: form.plano,
          usuariosExtras: form.usuariosExtras,
          iaBotEnabled: form.iaBotEnabled,
          modules,
        });
        setFormOpen(false);
        setCredentials({
          name: created.admin.name,
          email: created.admin.email,
          password: created.temporaryPassword,
          slug: created.slug,
        });
        toast.success("Tenant criado com administrador.");
        await loadItems();
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Falha ao salvar o tenant.",
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!editingId) return;

    setSaving(true);
    try {
      await updateTenant(editingId, {
        name,
        status: form.status,
        logoUrl: logoUrl || null,
        plano: form.plano,
        usuariosExtras: form.usuariosExtras,
        iaBotEnabled: form.iaBotEnabled,
        modules,
      });
      toast.success("Tenant atualizado.");
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

  async function handleCreateInitialAdmin(tenantId: string, slug: string) {
    setSavingAdmin(true);
    try {
      const result = await createTenantInitialAdmin(tenantId);
      setCredentials({
        name: result.user.name,
        email: result.user.email,
        password: result.temporaryPassword,
        slug,
      });
      if (editingId === tenantId) {
        setEditingAdmin(result.user);
      }
      toast.success("Administrador gerado.");
      if (detail?.id === tenantId) {
        await reloadDetail(tenantId);
      } else {
        await loadItems();
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Falha ao criar o administrador.",
      );
    } finally {
      setSavingAdmin(false);
    }
  }

  async function confirmDeleteTenant() {
    if (!deleteTenantTarget) return;
    setDeletingTenant(true);
    try {
      await deleteTenant(deleteTenantTarget.id);
      toast.success(`Tenant "${deleteTenantTarget.name}" removido.`);
      setDeleteTenantTarget(null);
      if (editingId === deleteTenantTarget.id) {
        setFormOpen(false);
      }
      if (detail?.id === deleteTenantTarget.id) {
        setDetailOpen(false);
        setDetail(null);
      }
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Falha ao remover o tenant.",
      );
    } finally {
      setDeletingTenant(false);
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
                  <TableHead>Plano</TableHead>
                  <TableHead>Admin (e-mail)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[200px] text-right">Ações</TableHead>
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
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {item.plano ?? "—"}
                        {item.iaBotEnabled ? " · IA" : ""}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.admin ? (
                        <div className="min-w-0">
                          <div className="truncate text-sm">
                            {item.admin.name}
                          </div>
                          <code className="text-xs text-muted-foreground break-all">
                            {item.admin.email}
                          </code>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Sem admin
                        </span>
                      )}
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Excluir"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTenantTarget(item)}
                        >
                          <Trash2 className="h-4 w-4" />
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
            ? "Cadastre a imobiliária, o plano, a logo e os módulos. O admin é gerado automaticamente."
            : "Atualize plano, cota, logo e módulos do tenant."
        }
        className={
          formMode === "edit" || formMode === "create" ? "max-w-2xl" : undefined
        }
      >
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
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
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select
                  value={form.plano}
                  onValueChange={(value) => {
                    const plano = value as TenantPlano;
                    setForm((prev) => ({
                      ...prev,
                      plano,
                      modules: modulesPresetForPlano(plano),
                      iaBotEnabled:
                        plano === "ouro" ? true : prev.iaBotEnabled,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PLANO_LABELS) as TenantPlano[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {PLANO_LABELS[p]} ({PLANO_MAX_USUARIOS[p]} users)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Cota base: {PLANO_MAX_USUARIOS[form.plano]} usuários. Extras
                  liberam além do limite para o admin da imobiliária.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="tenant-extras">Usuários extras</Label>
                  <Input
                    id="tenant-extras"
                    type="number"
                    min={0}
                    value={form.usuariosExtras}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        usuariosExtras: Math.max(
                          0,
                          Number(e.target.value) || 0,
                        ),
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Limite total:{" "}
                    {PLANO_MAX_USUARIOS[form.plano] + form.usuariosExtras}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Bot de IA</Label>
                  <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.iaBotEnabled}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          iaBotEnabled: e.target.checked,
                        }))
                      }
                    />
                    Conexão com bot de IA liberada
                  </label>
                </div>
              </div>
            </FormSection>

            {formMode === "edit" && (
              <FormSection title="Administrador">
                {editingAdmin ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                      <div className="text-[11px] text-muted-foreground">
                        Nome
                      </div>
                      <div className="text-sm font-medium">
                        {editingAdmin.name}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                      <div className="text-[11px] text-muted-foreground">
                        E-mail de login
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-sm break-all">
                          {editingAdmin.email}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() =>
                            void copyText(editingAdmin.email, "email")
                          }
                        >
                          {copiedField === "email" ? (
                            <Check className="w-3.5 h-3.5 mr-1" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 mr-1" />
                          )}
                          Copiar
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground pt-1">
                        Slug no login (opcional):{" "}
                        <code className="rounded bg-muted px-1">
                          {form.slug}
                        </code>
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={resettingPassword}
                      onClick={() => void handleResetAdminPassword()}
                    >
                      {resettingPassword ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Gerando…
                        </>
                      ) : (
                        <>
                          <KeyRound className="h-4 w-4" />
                          Gerar senha temporária
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Este tenant ainda não tem administrador. Gere um com
                      e-mail e senha temporária.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={savingAdmin || !editingId}
                      onClick={() => {
                        if (!editingId) return;
                        void handleCreateInitialAdmin(editingId, form.slug);
                      }}
                    >
                      {savingAdmin ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Gerando…
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          Gerar administrador
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </FormSection>
            )}

            {formMode === "create" && (
              <FormSection title="Administrador">
                <p className="text-sm text-muted-foreground">
                  Ao criar o tenant, um admin é gerado automaticamente (e-mail{" "}
                  <code className="rounded bg-muted px-1">
                    admin@
                    {(form.slug || "slug").replace(/-/g, "")}
                    .com
                  </code>{" "}
                  e senha temporária). As credenciais aparecem na tela seguinte.
                </p>
              </FormSection>
            )}

            <FormSection title="Logo">
              <p className="text-xs text-muted-foreground -mt-1">
                URL da logo da imobiliária. Se vazio, usa a logo da Zone
                Connection.
              </p>
              <div className="space-y-2">
                <Label htmlFor="tenant-logo">URL do logo</Label>
                <Input
                  id="tenant-logo"
                  value={form.logoUrl}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      logoUrl: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                />
              </div>
              {form.logoUrl.trim() ? (
                <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
                  <img
                    src={form.logoUrl.trim()}
                    alt="Prévia do logo"
                    className="h-10 w-10 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    Prévia (se a URL for válida)
                  </span>
                </div>
              ) : null}
            </FormSection>

            <FormSection title="Módulos">
              <p className="text-xs text-muted-foreground -mt-1">
                Marque os módulos ativos para este tenant. Desmarcados ficam
                ocultos no menu.
              </p>
              <div className="space-y-4">
                {TENANT_MODULE_GROUPS.map((group) => {
                  const adminOn =
                    group.id === "administrativo" &&
                    adminGroupEnabled(form.modules);
                  return (
                    <div
                      key={group.id}
                      className="rounded-lg border bg-muted/20 p-3 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{group.label}</p>
                        {group.id === "administrativo" ? (
                          <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                            <span className="text-muted-foreground">
                              {adminOn ? "Ativo" : "Desativado"}
                            </span>
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={adminOn}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  modules: setAdminGroupEnabled(
                                    prev.modules,
                                    e.target.checked,
                                  ),
                                }))
                              }
                            />
                            <span className="font-medium">
                              Todo o administrativo
                            </span>
                          </label>
                        ) : null}
                      </div>
                      {group.id === "administrativo" && !adminOn ? (
                        <p className="text-[11px] text-muted-foreground">
                          Desativar o administrativo oculta todos os módulos
                          desta seção, exceto Usuários (criar usuário).
                        </p>
                      ) : null}
                      <div className="grid gap-2 sm:grid-cols-2 text-sm">
                        {group.modules.map((mod) => {
                          const lockedOff =
                            group.id === "administrativo" &&
                            !adminOn &&
                            !mod.keepOnAdminBulkOff;
                          return (
                            <label
                              key={mod.key}
                              className={`flex items-center gap-2 rounded-md border px-3 py-2 ${
                                lockedOff
                                  ? "opacity-60 bg-muted/40"
                                  : "bg-background"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={form.modules[mod.key] !== false}
                                disabled={lockedOff}
                                onChange={(e) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    modules: {
                                      ...prev.modules,
                                      [mod.key]: e.target.checked,
                                    },
                                  }))
                                }
                              />
                              <span>{mod.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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
              {detail.userCount === 0 && (
                <FormSection title="Administrador">
                  <p className="text-xs text-muted-foreground -mt-1">
                    Este tenant ainda não tem usuários. Gere o admin para
                    liberar o login em /login (slug:{" "}
                    <code className="rounded bg-muted px-1">{detail.slug}</code>
                    ).
                  </p>
                  <Button
                    type="button"
                    disabled={savingAdmin}
                    onClick={() =>
                      void handleCreateInitialAdmin(detail.id, detail.slug)
                    }
                  >
                    {savingAdmin ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Gerando…
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Gerar administrador
                      </>
                    )}
                  </Button>
                </FormSection>
              )}

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
                            variant={connection.ativo ? "default" : "secondary"}
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
          <Button
            type="button"
            variant="outline"
            onClick={() => setDetailOpen(false)}
          >
            Fechar
          </Button>
        </FormDialogActions>
      </FormDialogShell>

      <FormDialogShell
        open={!!credentials}
        onOpenChange={(o) => !o && setCredentials(null)}
        icon={<KeyRound className="w-5 h-5" />}
        title="Credenciais do administrador"
        description={
          credentials
            ? `Anote e entregue a ${credentials.name}. A senha só aparece agora.`
            : undefined
        }
      >
        {credentials && (
          <>
            <FormDialogBody>
              <FormSection
                icon={<Shield className="w-3.5 h-3.5 text-primary" />}
                title="Acesso do admin"
              >
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                    <div className="text-[11px] text-muted-foreground">
                      E-mail
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm break-all">
                        {credentials.email}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() =>
                          void copyText(credentials.email, "email")
                        }
                      >
                        {copiedField === "email" ? (
                          <Check className="w-3.5 h-3.5 mr-1" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 mr-1" />
                        )}
                        Copiar
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
                    <div className="text-[11px] text-muted-foreground">
                      Senha temporária
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm font-semibold tracking-wide break-all">
                        {credentials.password}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() =>
                          void copyText(credentials.password, "password")
                        }
                      >
                        {copiedField === "password" ? (
                          <Check className="w-3.5 h-3.5 mr-1" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 mr-1" />
                        )}
                        Copiar
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Login em /login com este e-mail. Slug opcional:{" "}
                    <code className="rounded bg-muted px-1">
                      {credentials.slug}
                    </code>
                  </p>
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions hint="Peça ao admin para trocar a senha no perfil após o login.">
              <Button type="button" onClick={() => setCredentials(null)}>
                Entendi
              </Button>
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>

      <AlertDialog
        open={Boolean(deleteTenantTarget)}
        onOpenChange={(open) =>
          !open && !deletingTenant && setDeleteTenantTarget(null)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove permanentemente{" "}
              <strong>{deleteTenantTarget?.name}</strong> (
              <code>{deleteTenantTarget?.slug}</code>), incluindo usuários,
              leads, conexões Meta/OZap e demais dados vinculados. Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingTenant}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingTenant}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmDeleteTenant();
              }}
            >
              {deletingTenant ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
