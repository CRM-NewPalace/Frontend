import { createFileRoute } from "@tanstack/react-router";
import WhatsAppAiPage from "@/marketing/pages/WhatsAppAiPage";
import { marketingHead } from "@/marketing/seo";

export const Route = createFileRoute("/produtos/ia-whatsapp")({
  ssr: true,
  head: () =>
    marketingHead({
      title:
        "IA para WhatsApp Imobiliário | Qualifique e Distribua Leads",
      description:
        "IA de WhatsApp que atende 24h, qualifica leads, agenda visitas e integra com o CRM Zone Connection. Planos IA SDR e IA Comercial.",
      path: "/produtos/ia-whatsapp",
    }),
  component: WhatsAppAiPage,
});
