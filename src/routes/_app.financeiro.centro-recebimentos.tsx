import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/financeiro/centro-recebimentos")({
  beforeLoad: () => {
    throw redirect({ to: "/financeiro/visao-geral" });
  },
});
