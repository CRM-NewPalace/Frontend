import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth";

export const Route = createFileRoute("/_app/financeiro")({
  beforeLoad: ({ location }) => {
    if (
      location.pathname === "/financeiro" ||
      location.pathname === "/financeiro/"
    ) {
      const plano = getSession()?.tenant?.plano;
      throw redirect({
        to:
          plano === "solo"
            ? "/financeiro/fluxo-caixa"
            : "/financeiro/visao-geral",
      });
    }
  },
  component: () => <Outlet />,
});
