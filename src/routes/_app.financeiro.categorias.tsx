import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/financeiro/categorias")({
  beforeLoad: () => {
    throw redirect({ to: "/financeiro/centro-recebimentos" });
  },
});
