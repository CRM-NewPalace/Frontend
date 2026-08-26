import { createFileRoute } from "@tanstack/react-router";
import { ImoveisPage } from "@/components/imoveis-page";

export const Route = createFileRoute("/_app/imoveis")({
  head: () => ({ meta: [{ title: "Imóveis — Zone Connection" }] }),
  component: ImoveisPage,
});
