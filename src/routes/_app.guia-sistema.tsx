import { createFileRoute } from "@tanstack/react-router";
import { GuiaSistemaPage } from "@/components/guia-sistema";

type GuiaSearch = {
  modulo?: string;
};

export const Route = createFileRoute("/_app/guia-sistema")({
  head: () => ({ meta: [{ title: "Guia do sistema — Zone Connection" }] }),
  validateSearch: (search: Record<string, unknown>): GuiaSearch => ({
    modulo: typeof search.modulo === "string" ? search.modulo : undefined,
  }),
  component: GuiaSistemaPage,
});
