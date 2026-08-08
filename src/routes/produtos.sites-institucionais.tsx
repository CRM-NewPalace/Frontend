import { createFileRoute } from "@tanstack/react-router";
import SitesPage from "@/marketing/pages/SitesPage";
import { marketingHead } from "@/marketing/seo";

export const Route = createFileRoute("/produtos/sites-institucionais")({
  ssr: true,
  head: () =>
    marketingHead({
      title:
        "Site Institucional e Landing Page para Corretores | Zone Connection",
      description:
        "Site institucional para imobiliárias e landing page para corretores. A partir de R$ 190 para parceiros do CRM. Domínio e hospedagem inclusos.",
      path: "/produtos/sites-institucionais",
    }),
  component: SitesPage,
});
