import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/captacao/visao-geral", label: "Visão geral" },
  { to: "/captacao/captacoes", label: "Captações" },
  { to: "/captacao/proprietarios", label: "Proprietários" },
  { to: "/captacao/imoveis", label: "Imóveis" },
] as const;

export const Route = createFileRoute("/_app/captacao")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/captacao" || location.pathname === "/captacao/") {
      throw redirect({ to: "/captacao/visao-geral" });
    }
  },
  component: CaptacaoLayout,
});

function CaptacaoLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div>
      <nav className="mb-4 flex flex-wrap gap-1 rounded-xl border bg-card p-1">
        {TABS.map((tab) => {
          const active =
            pathname === tab.to || pathname.startsWith(`${tab.to}/`);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              preload={false}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
