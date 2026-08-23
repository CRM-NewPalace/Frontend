import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ApiError } from "@/lib/api";
import { getSession, type Role } from "@/lib/auth";
import {
  createUser,
  deleteUser,
  fetchUsers,
  fetchUsersQuota,
  type ApiUser,
  type UsersQuota,
} from "@/lib/users-api";
import { STATUS_CHIP_CLASS } from "@/lib/catalog-colors";
import { Copy, Loader2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  corretor: "Corretor",
  financeiro: "Financeiro",
  treinee: "Treinee",
};

const PASSWORD_HINT = "Mín. 8 caracteres, com maiúscula, minúscula e número.";

function isStrongPassword(value: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
}

function roleBadgeClass(role: Role) {
  if (role === "admin") {
    return `${STATUS_CHIP_CLASS} bg-primary/15 text-primary border-primary/30`;
  }
  if (role === "financeiro") {
    return `${STATUS_CHIP_CLASS} bg-amber-500/15 text-amber-800 border-amber-500/30`;
  }
  if (role === "treinee") {
    return `${STATUS_CHIP_CLASS} bg-emerald-500/15 text-emerald-700 border-emerald-500/30`;
  }
  return `${STATUS_CHIP_CLASS} bg-muted text-muted-foreground`;
}

export function ConfigUsuarioExtraPanel() {
  const session = getSession();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [quota, setQuota] = useState<UsersQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("corretor");
  const [credentials, setCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiUser | null>(null);

  const extras = users.filter((u) => u.id !== session?.id);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, nextQuota] = await Promise.all([
        fetchUsers({ limit: 50 }),
        fetchUsersQuota(),
      ]);
      setUsers(list.data);
      setQuota(nextQuota);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os usuários.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const nome = name.trim();
    const mail = email.trim().toLowerCase();
    if (!nome || !mail) {
      toast.error("Preencha nome e e-mail.");
      return;
    }
    if (!isStrongPassword(password)) {
      toast.error(PASSWORD_HINT);
      return;
    }
    if (quota && quota.restantes <= 0) {
      toast.error(
        `Limite do plano atingido (${quota.usados}/${quota.limite}).`,
      );
      return;
    }

    setSaving(true);
    try {
      const created = await createUser({
        name: nome,
        email: mail,
        password,
        role,
        status: "ativo",
        financeiroCanView: true,
        financeiroCanCreate: true,
        financeiroCanEdit: true,
        financeiroCanDelete: true,
      });
      setUsers((prev) => [created, ...prev.filter((u) => u.id !== created.id)]);
      setCredentials({
        name: created.name,
        email: created.email,
        password,
      });
      setName("");
      setEmail("");
      setPassword("");
      setRole("corretor");
      toast.success("Usuário extra cadastrado.");
      void fetchUsersQuota()
        .then(setQuota)
        .catch(() => undefined);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível cadastrar o usuário.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteUser(target.id);
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
      toast.success(`${target.name} excluído.`);
      void fetchUsersQuota()
        .then(setQuota)
        .catch(() => undefined);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir o usuário.",
      );
    }
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  const canCreate = !quota || quota.restantes > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-primary" />
            Usuário extra
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O plano Solo tem um administrador (você). Se precisar, cadastre um
            usuário extra aqui — sem as telas de equipe.
          </p>
          {quota ? (
            <p className="text-xs text-muted-foreground">
              {quota.usados}/{quota.limite} usuários no plano.
              {quota.restantes <= 0
                ? " Limite atingido."
                : ` ${quota.restantes} vaga restante.`}
            </p>
          ) : null}

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : extras.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum usuário extra cadastrado.
            </p>
          ) : (
            <div className="space-y-2">
              {extras.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email}
                    </p>
                  </div>
                  <Badge variant="outline" className={roleBadgeClass(u.role)}>
                    {ROLE_LABEL[u.role] ?? u.role}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteTarget(u)}
                    aria-label={`Excluir ${u.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cadastrar usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => void handleCreate(e)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="extra-nome">Nome</Label>
                <Input
                  id="extra-nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome completo"
                  disabled={!canCreate}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="extra-email">E-mail</Label>
                <Input
                  id="extra-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  disabled={!canCreate}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="extra-senha">Senha inicial</Label>
                <Input
                  id="extra-senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={!canCreate}
                />
                <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Perfil</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as Role)}
                  disabled={!canCreate}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corretor">Corretor</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="treinee">Treinee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving || !canCreate}>
                {saving ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Salvando…
                  </>
                ) : (
                  "Cadastrar"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {credentials ? (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">Credenciais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Anote e entregue a {credentials.name}. A senha só aparece agora.
            </p>
            <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3">
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">E-mail</p>
                <code className="break-all text-sm">{credentials.email}</code>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copyText(credentials.email, "E-mail")}
              >
                <Copy className="mr-1 h-3.5 w-3.5" />
                Copiar
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Senha</p>
                <code className="break-all text-sm font-semibold">
                  {credentials.password}
                </code>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copyText(credentials.password, "Senha")}
              >
                <Copy className="mr-1 h-3.5 w-3.5" />
                Copiar
              </Button>
            </div>
            <Button type="button" onClick={() => setCredentials(null)}>
              Entendi
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
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
              onClick={() => void handleDelete()}
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
