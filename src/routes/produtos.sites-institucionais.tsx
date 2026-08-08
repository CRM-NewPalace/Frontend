import { createFileRoute } from "@tanstack/react-router";
import SitesPage from "@/marketing/pages/SitesPage";

export const Route = createFileRoute("/produtos/sites-institucionais")({
  ssr: false,
  head: () => ({
    meta: [
      {
        title: "Sites e Landing Pages | Zone Connection",
      },
      {
        name: "description",
        content:
          "Sites institucionais para imobiliárias e landing pages para corretores. Condição especial para parceiros do CRM Zone Connection.",
      },
      {
        property: "og:title",
        content: "Sites e Landing Pages | Zone Connection",
      },
      {
        property: "og:description",
        content:
          "Landing page a partir de R$ 190 para corretores parceiros do CRM. Sites institucionais sob consulta.",
      },
    ],
  }),
  component: SitesPage,
});
