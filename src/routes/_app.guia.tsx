import { createFileRoute } from "@tanstack/react-router";
import { GuiaPlataformaPage } from "@/components/guia-plataforma";

export const Route = createFileRoute("/_app/guia")({
  head: () => ({ meta: [{ title: "Guia — Zone Connection" }] }),
  component: GuiaPlataformaPage,
});
