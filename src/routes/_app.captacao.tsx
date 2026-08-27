import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { OperationSubnav } from "@/components/operacao-ui";
import { ClipboardList, Kanban, LayoutDashboard, Users } from "lucide-react";

const TABS = [
  { to: "/captacao/visao-geral", label: "Visão geral", icon: LayoutDashboard },
  { to: "/captacao/funil", label: "Funil", icon: Kanban },
  { to: "/captacao/captacoes", label: "Captações", icon: ClipboardList },
  { to: "/captacao/proprietarios", label: "Proprietários", icon: Users },
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
      <OperationSubnav items={[...TABS]} pathname={pathname} />
      <Outlet />
    </div>
  );
}
