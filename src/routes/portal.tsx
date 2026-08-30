import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ensurePortalSession, getPortalSession, signOutPortal } from "@/lib/portal-auth";
import { changePortalPassword } from "@/lib/portal-api";
import { ApiError } from "@/lib/api";
import { Building2, KeyRound, LayoutDashboard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/portal")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/portal/login") return { proprietario: null };
    const cached = getPortalSession();
    const session = cached ?? (await ensurePortalSession());
    if (!session) throw redirect({ to: "/portal/login", search: { email: undefined } });
    return { proprietario: session };
  },
  component: PortalLayout,
});

function PortalLayout() {
  const { proprietario } = Route.useRouteContext();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [senhaOpen, setSenhaOpen] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [senhaBusy, setSenhaBusy] = useState(false);
  if (!proprietario) return <Outlet />;

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setSenhaBusy(true);
    try {
      await changePortalPassword(senhaAtual, senhaNova);
      toast.success("Senha atualizada.");
      setSenhaAtual("");
      setSenhaNova("");
      setSenhaOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível trocar a senha.");
    } finally {
      setSenhaBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-primary/15 bg-card/90 backdrop-blur">
        <div className="h-1 w-full bg-primary" />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Acompanhamento
              </p>
              <p className="text-sm font-semibold tracking-tight">
                Portal do Proprietário
              </p>
            </div>
            <nav className="hidden items-center gap-1 sm:flex">
              <Link
                to="/portal"
                activeOptions={{ exact: true }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium",
                  pathname === "/portal" || pathname === "/portal/"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                to="/portal/imoveis"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium",
                  pathname.startsWith("/portal/imoveis")
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
                )}
              >
                <Building2 className="h-4 w-4" />
                Meus imóveis
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 px-3 py-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
              onClick={() => setSenhaOpen((open) => !open)}
            >
              <KeyRound className="h-4 w-4" />
              Senha
            </button>
            <span className="hidden max-w-40 truncate text-muted-foreground sm:inline">
              {proprietario.nome}
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 px-3 py-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
              onClick={() => {
                void signOutPortal().then(() =>
                  navigate({ to: "/portal/login", search: { email: undefined } }),
                );
              }}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {senhaOpen ? (
          <form
            onSubmit={(e) => void onChangePassword(e)}
            className="mb-6 grid max-w-md gap-3 rounded-2xl border border-primary/15 bg-card p-4"
          >
            <p className="text-sm font-medium">Trocar senha do portal</p>
            <div className="space-y-1">
              <Label htmlFor="senha-atual">Senha atual</Label>
              <Input
                id="senha-atual"
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="senha-nova">Nova senha</Label>
              <Input
                id="senha-nova"
                type="password"
                value={senhaNova}
                onChange={(e) => setSenhaNova(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={senhaBusy}>
              {senhaBusy ? "Salvando…" : "Atualizar senha"}
            </Button>
          </form>
        ) : null}
        <Outlet />
      </main>
    </div>
  );
}
