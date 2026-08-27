import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/imoveis-usados/visao-geral", label: "Visão geral" },
  { to: "/imoveis-usados/vendas", label: "Imóveis" },
  { to: "/imoveis-usados/interessados", label: "Interessados" },
] as const;

export const Route = createFileRoute("/_app/imoveis-usados")({
  beforeLoad: ({ location }) => {
    if (
      location.pathname === "/imoveis-usados" ||
      location.pathname === "/imoveis-usados/"
    ) {
      throw redirect({ to: "/imoveis-usados/visao-geral" });
    }
  },
  component: UsadosLayout,
});

function UsadosLayout() {
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
