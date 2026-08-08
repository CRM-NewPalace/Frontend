import { createFileRoute } from "@tanstack/react-router";
import LeadingPage from "@/marketing/pages/LeadingPage";
import { marketingHead } from "@/marketing/seo";

export const Route = createFileRoute("/produtos/crm-imobiliario")({
  ssr: true,
  head: () =>
    marketingHead({
      title: "CRM Imobiliário para Imobiliárias | Zone Connection",
      description:
        "CRM imobiliário com funil, leads, agenda, imóveis, financeiro e automações. Centralize a operação da imobiliária em uma plataforma.",
      path: "/produtos/crm-imobiliario",
    }),
  component: LeadingPage,
});
