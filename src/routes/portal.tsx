import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { ensurePortalSession, getPortalSession, signOutPortal } from "@/lib/portal-auth";
import { Building2, LayoutDashboard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/portal")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/portal/login") return { proprietario: null };
    const cached = getPortalSession();
    const session = cached ?? (await ensurePortalSession());
    if (!session) throw redirect({ to: "/portal/login" });
    return { proprietario: session };
  },
  component: PortalLayout,
});

function PortalLayout() {
  const { proprietario } = Route.useRouteContext();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (!proprietario) return <Outlet />;

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
            <span className="hidden max-w-40 truncate text-muted-foreground sm:inline">
              {proprietario.nome}
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 px-3 py-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
              onClick={() => {
                void signOutPortal().then(() =>
                  navigate({ to: "/portal/login" }),
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
        <Outlet />
      </main>
    </div>
  );
}
