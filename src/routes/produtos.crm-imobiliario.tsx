import { createFileRoute } from "@tanstack/react-router";
import LeadingPage from "@/marketing/pages/LeadingPage";

export const Route = createFileRoute("/produtos/crm-imobiliario")({
  ssr: false,
  head: () => ({
    meta: [
      {
        title: "CRM Imobiliário | Zone Connection",
      },
      {
        name: "description",
        content:
          "Conheça o CRM Imobiliário da Zone Connection: gestão completa, módulos conectados e planos para imobiliárias.",
      },
      {
        property: "og:title",
        content: "CRM Imobiliário | Zone Connection",
      },
      {
        property: "og:description",
        content:
          "Plataforma completa para gestão de imobiliárias — conheça o produto e os planos.",
      },
    ],
  }),
  component: LeadingPage,
});
