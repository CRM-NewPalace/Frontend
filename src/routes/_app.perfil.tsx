import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { changePassword, getSession, type AuthUser } from "@/lib/auth";
import { getTheme, setTheme, type Theme } from "@/lib/theme";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/perfil")({
  head: () => ({ meta: [{ title: "Perfil — NP Connect" }] }),
  component: Perfil,
});

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  corretor: "Corretor",
};

function Perfil() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [pushNotif, setPushNotif] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setUser(getSession());
    setDarkMode(getTheme() === "dark");
  }, []);

  const initials = user?.name.split(" ").map((n) => n[0]).slice(0, 2).join("") ?? "U";

  async function handleChangePassword() {
    if (!currentPassword || !newPassword) {
      toast.error("Informe a senha atual e a nova senha");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Senha alterada com sucesso");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível alterar a senha",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  function handleDarkMode(checked: boolean) {
    const theme: Theme = checked ? "dark" : "light";
    setDarkMode(checked);
    setTheme(theme);
    toast.success(checked ? "Modo escuro ativado" : "Modo claro ativado");
  }

  return (
    <div>
      <PageHeader title="Perfil" description="Gerencie suas informações e preferências." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Avatar className="w-24 h-24 mx-auto mb-3">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="font-semibold">{user?.name}</div>
            <div className="text-xs text-muted-foreground">
              {user ? ROLE_LABEL[user.role] ?? user.role : ""}
            </div>
            <Button variant="outline" size="sm" className="mt-4">Alterar foto</Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Dados pessoais</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Nome</Label><Input defaultValue={user?.name} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input defaultValue={user?.email} /></div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input defaultValue={user?.phone ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <Input defaultValue={user?.cargo ?? ""} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button variant="outline">Cancelar</Button>
              <Button>Salvar alterações</Button>
            </div>

            <div className="md:col-span-2 border-t pt-4 space-y-4">
              <div className="text-sm font-medium">Alterar senha</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="senha-atual">Senha atual</Label>
                  <Input
                    id="senha-atual"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="senha-nova">Nova senha</Label>
                  <div className="relative">
                    <Input
                      id="senha-nova"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mínimo de 8 caracteres, com maiúscula, minúscula e número.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleChangePassword} disabled={savingPassword}>
                  {savingPassword ? "Salvando..." : "Alterar senha"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Preferências</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <div className="text-sm font-medium">Notificações push</div>
                <div className="text-xs text-muted-foreground">
                  Novos leads, tarefas e mensagens em tempo real
                </div>
              </div>
              <Switch checked={pushNotif} onCheckedChange={setPushNotif} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium">Modo escuro</div>
                <div className="text-xs text-muted-foreground">
                  Usar interface com tema escuro
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={handleDarkMode} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
