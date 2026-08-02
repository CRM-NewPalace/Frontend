import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/financeiro")({
  beforeLoad: ({ location }) => {
    if (
      location.pathname === "/financeiro" ||
      location.pathname === "/financeiro/"
    ) {
      throw redirect({ to: "/financeiro/visao-geral" });
    }
  },
  component: () => <Outlet />,
});
