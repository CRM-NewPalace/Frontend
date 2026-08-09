import { createFileRoute, redirect } from "@tanstack/react-router";

/** Contratos da plataforma passam a ser criados em Contas a receber. */
export const Route = createFileRoute("/_app/financeiro/contratos")({
  beforeLoad: () => {
    throw redirect({ to: "/financeiro/contas-a-receber" });
  },
});
