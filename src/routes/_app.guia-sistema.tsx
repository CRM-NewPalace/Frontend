import { createFileRoute } from "@tanstack/react-router";
import { GuiaSistemaPage } from "@/components/guia-sistema";

export const Route = createFileRoute("/_app/guia-sistema")({
  head: () => ({ meta: [{ title: "Guia do sistema — Zone Connection" }] }),
  component: GuiaSistemaPage,
});
