import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/imoveis-usados/vendas/")({
  beforeLoad: () => {
    throw redirect({ to: "/imoveis" });
  },
});
