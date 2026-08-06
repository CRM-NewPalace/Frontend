import { createFileRoute } from "@tanstack/react-router";
import DemoPage from "@/marketing/pages/DemoPage";

export const Route = createFileRoute("/demonstracao")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Demonstração do CRM | Zone Connection" },
      {
        name: "description",
        content:
          "Explore uma demonstração visual do CRM Zone Connection: dashboard, funil, leads e agenda em um ambiente ilustrativo.",
      },
      {
        property: "og:title",
        content: "Demonstração do CRM | Zone Connection",
      },
      {
        property: "og:description",
        content:
          "Veja como é por dentro da plataforma Zone Connection para imobiliárias.",
      },
    ],
  }),
  component: DemoPage,
});
