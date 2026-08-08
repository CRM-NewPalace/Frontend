import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  DetailField,
} from "@/components/form-dialog";
import { CorPicker } from "@/components/cor-picker";
import {
  Plus,
  MoreHorizontal,
  KeyRound,
  Ban,
  Pencil,
  Trash2,
  Eye,
  UserPlus,
  Search,
  CheckCircle2,
  Sparkles,
  Shield,
  Copy,
  Check,
} from "lucide-react";
import { getSession, type Role, type UserStatus } from "@/lib/auth";
import { isAnalistaAllowed } from "@/lib/tenant-modules";
import { canViewTeamData } from "@/lib/permissions";
import { ApiError } from "@/lib/api";
import { useLeads } from "@/lib/leads-store";
import {
  createUser,
  deleteUser,
  fetchUsers,
  fetchUsersQuota,
  resetUserPassword,
  updateUser,
  updateUserStatus,
  type ApiUser,
  type UsersQuota,
} from "@/lib/users-api";
import { PLANO_LABELS } from "@/lib/tenant-modules";
import {
  formatPhone,
  isValidPhone,
  PHONE_INVALID_MESSAGE,
  PHONE_PLACEHOLDER,
} from "@/lib/phone";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Zone Connection" }] }),
  component: Usuarios,
});

/** Cache da lista para abrir a tela sem esperar a API (sincroniza em background). */
const USERS_CACHE_KEY = "crm_users_cache_v2";
let usersMemoryCache: ApiUser[] | null = null;

function getUsersCache(): ApiUser[] | null {
  if (usersMemoryCache) return usersMemoryCache;
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(USERS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApiUser[];
    if (!Array.isArray(parsed)) return null;
    usersMemoryCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function setUsersCache(users: ApiUser[]) {
  usersMemoryCache = users;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
  } catch {
    // quota / private mode — ignore
  }
}

const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  gerente: "Gerente",
  corretor: "Corretor",
  analista: "Analista",
};

const STATUS_LABEL: Record<UserStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
};

const PASSWORD_HINT = "Mín. 8 caracteres, com maiúscula, minúscula e número.";

type FormMode = "create" | "edit";
type FormState = {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  dataNascimento: string;
  cargo: string;
  cor: string;
  role: Role;
  status: UserStatus;
  password: string;
};

const emptyForm = (): FormState => ({
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  dataNascimento: "",
  cargo: "",
  cor: "",
  role: "corretor",
  status: "ativo",
  password: "",
});

function toDateInput(value: string | null | undefined) {
  return value?.slice(0, 10) ?? "";
}

function formatBirthDate(value: string | null | undefined) {
  const day = toDateInput(value);
  if (!day) return "—";
  const [y, m, d] = day.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "—";
}

function userToForm(u: ApiUser): FormState {
  return {
    name: u.name,
    email: u.email,
    phone: u.phone ? formatPhone(u.phone) : "",
    whatsapp: u.whatsapp ? formatPhone(u.whatsapp) : "",
    dataNascimento: toDateInput(u.dataNascimento),
    cargo: u.cargo ?? "",
    cor: u.cor ?? "",
    role: u.role,
    status: u.status,
    password: "",
  };
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function roleBadgeClass(role: Role) {
  if (role === "admin") return "bg-primary/15 text-primary border-primary/30";
  if (role === "gerente") return "bg-info/15 text-info border-info/30";
  if (role === "analista")
    return "bg-sky-500/15 text-sky-700 border-sky-500/30";
  return "bg-muted text-muted-foreground";
}

function formatLastAccess(iso: string | null): string {
  if (!iso) return "Nunca";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const min = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.floor(h / 24);
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  return d.toLocaleDateString("pt-BR");
}

function isStrongPassword(value: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
}

function Usuarios() {
  const session = getSession();
  const isAdmin = session?.role === "admin";
  const isManager = session ? canViewTeamData(session.role) : false;
  const canUseAnalista = isAnalistaAllowed(
    session?.tenant?.plano,
    session?.tenant?.modules ?? null,
  );
  const { refresh: refreshLeads } = useLeads();

  const cachedUsers = getUsersCache();
  const [users, setUsersState] = useState<ApiUser[]>(cachedUsers ?? []);
  // Só bloqueia com "Carregando..." na primeira visita sem cache.
  const [loading, setLoading] = useState(!cachedUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [quota, setQuota] = useState<UsersQuota | null>(null);

  /** Atualiza estado + cache juntos. */
  const setUsers = useCallback((updater: (prev: ApiUser[]) => ApiUser[]) => {
    setUsersState((prev) => {
      const next = updater(prev);
      setUsersCache(next);
      return next;
    });
  }, []);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<ApiUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiUser | null>(null);
  const [credentials, setCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    title: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<"email" | "password" | null>(
    null,
  );

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const [page, q] = await Promise.all([
          fetchUsers({ page: 1, limit: 100 }),
          isAdmin ? fetchUsersQuota().catch(() => null) : Promise.resolve(null),
        ]);
        setUsers(() => page.data);
        if (q) setQuota(q);
      } catch (err) {
        if (!opts?.silent) {
          toast.error(
            err instanceof ApiError
              ? err.message
              : "Não foi possível carregar os usuários.",
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [setUsers, isAdmin],
  );

  useEffect(() => {
    void load({ silent: Boolean(cachedUsers) });
    // Só no mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q) {
        const hay =
          `${u.name} ${u.email} ${u.phone ?? ""} ${u.cargo ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  function openCreate() {
    if (quota && quota.restantes <= 0) {
      toast.error(
        `Limite do plano atingido (${quota.usados}/${quota.limite}). Peça usuários extras ao administrador da plataforma.`,
      );
      return;
    }
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(u: ApiUser) {
    setFormMode("edit");
    setEditingId(u.id);
    setForm(userToForm(u));
    setFormOpen(true);
    setDetail(null);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function syncTeam() {
    // Assignees dos leads em background (sem travar a UI).
    void refreshLeads({ silent: true });
  }

  async function copyText(value: string, field: "email" | "password") {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast.success(field === "email" ? "E-mail copiado." : "Senha copiada.");
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("Apenas administradores podem criar ou editar usuários.");
      return;
    }
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const whatsapp = form.whatsapp.trim();
    const cargo = form.cargo.trim();
    const cor = form.cor.trim();

    if (!name || !email) {
      toast.error("Preencha nome e e-mail.");
      return;
    }
    if (phone && !isValidPhone(phone)) {
      toast.error(PHONE_INVALID_MESSAGE);
      return;
    }
    if (whatsapp && !isValidPhone(whatsapp)) {
      toast.error("Informe um WhatsApp válido com DDD.");
      return;
    }
    if (formMode === "create" && !isStrongPassword(form.password)) {
      toast.error(PASSWORD_HINT);
      return;
    }

    setSaving(true);
    try {
      if (formMode === "create") {
        const created = await createUser({
          name,
          email,
          password: form.password,
          phone: phone || undefined,
          whatsapp: whatsapp || undefined,
          dataNascimento: form.dataNascimento || null,
          cargo: cargo || undefined,
          cor: cor || undefined,
          role: form.role,
          status: form.status,
        });
        setUsers((prev) => [
          created,
          ...prev.filter((u) => u.id !== created.id),
        ]);
        setFormOpen(false);
        setCredentials({
          name: created.name,
          email: created.email,
          password: form.password,
          title: "Credenciais do novo usuário",
        });
        void fetchUsersQuota()
          .then(setQuota)
          .catch(() => undefined);
      } else if (editingId) {
        const updated = await updateUser(editingId, {
          name,
          email,
          phone: phone || null,
          whatsapp: whatsapp || null,
          dataNascimento: form.dataNascimento || null,
          cargo: cargo || null,
          cor: cor || null,
          role: form.role,
          status: form.status,
        });
        setUsers((prev) =>
          prev.map((u) => (u.id === updated.id ? updated : u)),
        );
        toast.success("Usuário atualizado.");
        setFormOpen(false);
      }
      void syncTeam();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    // Otimista: some da tabela na hora; volta se a API falhar.
    setUsers((prev) => prev.filter((u) => u.id !== target.id));
    setDeleteTarget(null);
    setDetail(null);
    toast.success(`Usuário ${target.name} excluído.`);
    try {
      await deleteUser(target.id);
      void syncTeam();
    } catch (err) {
      setUsers((prev) => [target, ...prev.filter((u) => u.id !== target.id)]);
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível excluir.",
      );
    }
  }

  async function toggleStatus(u: ApiUser) {
    const next: UserStatus = u.status === "ativo" ? "inativo" : "ativo";
    // Otimista: badge muda na hora; volta se a API falhar.
    setUsers((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, status: next } : x)),
    );
    if (detail?.id === u.id) setDetail((d) => (d ? { ...d, status: next } : d));
    toast.success(
      next === "ativo" ? `${u.name} reativado.` : `${u.name} inativado.`,
    );
    try {
      const updated = await updateUserStatus(u.id, next);
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      void syncTeam();
    } catch (err) {
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, status: u.status } : x)),
      );
      if (detail?.id === u.id)
        setDetail((d) => (d ? { ...d, status: u.status } : d));
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível alterar o status.",
      );
    }
  }

  async function handleResetPassword(u: ApiUser) {
    try {
      const result = await resetUserPassword(u.id);
      if (result.temporaryPassword) {
        setDetail(null);
        setCredentials({
          name: u.name,
          email: u.email,
          password: result.temporaryPassword,
          title: "Senha temporária gerada",
        });
      } else {
        toast.success(`Senha de ${u.name} redefinida.`);
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível resetar a senha.",
      );
    }
  }

  return (
    <div>
      <PageHeader
        title="Usuários"
        description={
          loading
            ? "Carregando usuários..."
            : isAdmin
              ? quota
                ? `${filtered.length} de ${users.length} · ${quota.usados}/${quota.limite} no plano ${PLANO_LABELS[quota.plano].split(" — ")[0]}`
                : `${filtered.length} de ${users.length} usuários`
              : `Membros da sua equipe — ${filtered.length} usuário(s). E-mail visível; use Resetar senha se alguém esquecer.`
        }
        actions={
          isAdmin ? (
            <Button
              size="sm"
              onClick={openCreate}
              disabled={Boolean(quota && quota.restantes <= 0)}
              title={
                quota && quota.restantes <= 0
                  ? "Limite do plano atingido"
                  : undefined
              }
            >
              <Plus className="w-4 h-4 mr-1" />
              Novo usuário
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-4">
        <div className="p-3 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-220px">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail, telefone..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os perfis</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="gerente">Gerente</SelectItem>
              {canUseAnalista && (
                <SelectItem value="analista">Analista</SelectItem>
              )}
              <SelectItem value="corretor">Corretor</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Carregando usuários...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {initials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell className="text-sm">{u.phone || "—"}</TableCell>
                  <TableCell className="text-sm">{u.cargo || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={roleBadgeClass(u.role)}>
                      {ROLE_LABEL[u.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={u.status === "ativo" ? "default" : "secondary"}
                    >
                      {STATUS_LABEL[u.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatLastAccess(u.lastLoginAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetail(u)}>
                          <Eye className="w-3.5 h-3.5 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                        {isAdmin && (
                          <DropdownMenuItem onClick={() => openEdit(u)}>
                            <Pencil className="w-3.5 h-3.5 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {(isAdmin || (isManager && u.role === "corretor")) && (
                          <DropdownMenuItem
                            onClick={() => void handleResetPassword(u)}
                          >
                            <KeyRound className="w-3.5 h-3.5 mr-2" />
                            Gerar senha temporária
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <DropdownMenuItem
                            disabled={
                              session?.id === u.id && u.status === "ativo"
                            }
                            onClick={() => void toggleStatus(u)}
                          >
                            {u.status === "ativo" ? (
                              <>
                                <Ban className="w-3.5 h-3.5 mr-2" />
                                Inativar
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                                Reativar
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              disabled={session?.id === u.id}
                              onClick={() => setDeleteTarget(u)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <FormDialogShell
        open={formOpen}
        onOpenChange={setFormOpen}
        icon={
          formMode === "edit" ? (
            <Pencil className="w-5 h-5" />
          ) : (
            <UserPlus className="w-5 h-5" />
          )
        }
        title={formMode === "edit" ? "Editar usuário" : "Novo usuário"}
        description={
          formMode === "edit"
            ? "Atualize os dados de acesso da equipe."
            : "Cadastre um novo acesso ao CRM."
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <FormDialogBody>
            <FormSection
              icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
              title="Dados"
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor="usr-nome"
                  className="text-xs text-muted-foreground"
                >
                  Nome completo
                </Label>
                <Input
                  id="usr-nome"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Ex.: Marina Alves"
                  className="h-10 bg-background"
                  autoFocus
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="usr-email"
                    className="text-xs text-muted-foreground"
                  >
                    E-mail
                  </Label>
                  <Input
                    id="usr-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="nome@imob.com"
                    className="h-10 bg-background"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="usr-tel"
                    className="text-xs text-muted-foreground"
                  >
                    Telefone
                  </Label>
                  <Input
                    id="usr-tel"
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setField("phone", formatPhone(e.target.value))
                    }
                    placeholder={PHONE_PLACEHOLDER}
                    className="h-10 bg-background"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="usr-wa"
                  className="text-xs text-muted-foreground"
                >
                  WhatsApp
                </Label>
                <Input
                  id="usr-wa"
                  type="tel"
                  value={form.whatsapp}
                  onChange={(e) =>
                    setField("whatsapp", formatPhone(e.target.value))
                  }
                  placeholder={PHONE_PLACEHOLDER}
                  className="h-10 bg-background"
                />
                <p className="text-[11px] text-muted-foreground">
                  Usado para enviar o resultado da análise ao corretor.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="usr-nascimento"
                  className="text-xs text-muted-foreground"
                >
                  Data de nascimento
                </Label>
                <Input
                  id="usr-nascimento"
                  type="date"
                  value={form.dataNascimento}
                  onChange={(e) => setField("dataNascimento", e.target.value)}
                  className="h-10 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="usr-cargo"
                  className="text-xs text-muted-foreground"
                >
                  Cargo
                </Label>
                <Input
                  id="usr-cargo"
                  value={form.cargo}
                  onChange={(e) => setField("cargo", e.target.value)}
                  placeholder="Ex.: Corretor sênior"
                  className="h-10 bg-background"
                />
              </div>
              <CorPicker
                id="usr-cor"
                value={form.cor}
                onChange={(hex) => setField("cor", hex)}
                previewLabel={form.name}
              />
            </FormSection>
            <FormSection
              icon={<Shield className="w-3.5 h-3.5 text-primary" />}
              title="Acesso"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Perfil
                  </Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => setField("role", v as Role)}
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      {canUseAnalista && (
                        <SelectItem value="analista">Analista</SelectItem>
                      )}
                      <SelectItem value="corretor">Corretor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Status
                  </Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setField("status", v as UserStatus)}
                    disabled={formMode === "edit" && editingId === session?.id}
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formMode === "create" && (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="usr-senha"
                    className="text-xs text-muted-foreground"
                  >
                    Senha inicial
                  </Label>
                  <Input
                    id="usr-senha"
                    type="text"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    placeholder="Ex.: Senha@123"
                    className="h-10 bg-background"
                    required
                  />
                  <p
                    className={cn(
                      "text-[11px]",
                      form.password && !isStrongPassword(form.password)
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {PASSWORD_HINT}
                  </p>
                </div>
              )}
            </FormSection>
          </FormDialogBody>
          <FormDialogActions hint="As alterações são salvas no banco.">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Salvando..."
                : formMode === "edit"
                  ? "Salvar alterações"
                  : "Criar usuário"}
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <FormDialogShell
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        icon={<Eye className="w-5 h-5" />}
        title={detail?.name ?? "Detalhes do usuário"}
        description={
          detail ? (
            <span className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={roleBadgeClass(detail.role)}>
                {ROLE_LABEL[detail.role]}
              </Badge>
              <Badge
                variant={detail.status === "ativo" ? "default" : "secondary"}
              >
                {STATUS_LABEL[detail.status]}
              </Badge>
            </span>
          ) : undefined
        }
      >
        {detail && (
          <>
            <FormDialogBody>
              <FormSection
                icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
                title="Contato"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-[11px] text-muted-foreground">
                      E-mail
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium break-all">
                        {detail.email}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => void copyText(detail.email, "email")}
                        title="Copiar e-mail"
                      >
                        {copiedField === "email" ? (
                          <Check className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <DetailField label="Telefone" value={detail.phone || "—"} />
                  <DetailField
                    label="WhatsApp"
                    value={detail.whatsapp || "—"}
                  />
                  <DetailField
                    label="Nascimento"
                    value={formatBirthDate(detail.dataNascimento)}
                  />
                  <DetailField label="Cargo" value={detail.cargo || "—"} />
                  <DetailField
                    label="Último acesso"
                    value={formatLastAccess(detail.lastLoginAt)}
                  />
                </div>
              </FormSection>
              <FormSection
                icon={<Shield className="w-3.5 h-3.5 text-primary" />}
                title="Acesso"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Perfil" value={ROLE_LABEL[detail.role]} />
                  <DetailField
                    label="Status"
                    value={STATUS_LABEL[detail.status]}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  A senha original não pode ser visualizada (fica
                  criptografada). Use <strong>Gerar senha temporária</strong> se
                  o usuário esquecer.
                </p>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDetail(null)}
              >
                Fechar
              </Button>
              {(isAdmin || (isManager && detail.role === "corretor")) && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleResetPassword(detail)}
                >
                  <KeyRound className="w-4 h-4 mr-1" />
                  Gerar senha temporária
                </Button>
              )}
              {isAdmin && (
                <Button type="button" onClick={() => openEdit(detail)}>
                  <Pencil className="w-4 h-4 mr-1" />
                  Editar
                </Button>
              )}
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>

      <FormDialogShell
        open={!!credentials}
        onOpenChange={(o) => !o && setCredentials(null)}
        icon={<KeyRound className="w-5 h-5" />}
        title={credentials?.title ?? "Credenciais"}
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
                title="Acesso"
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
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions hint="Peça ao usuário para trocar a senha no perfil após o login.">
              <Button type="button" onClick={() => setCredentials(null)}>
                Entendi
              </Button>
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Tem certeza que deseja excluir ${deleteTarget.name}? Esta ação não pode ser desfeita.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
