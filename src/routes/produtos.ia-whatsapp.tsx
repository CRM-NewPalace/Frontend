import { createFileRoute } from "@tanstack/react-router";
import WhatsAppAiPage from "@/marketing/pages/WhatsAppAiPage";

export const Route = createFileRoute("/produtos/ia-whatsapp")({
  ssr: false,
  head: () => ({
    meta: [
      {
        title: "IA para WhatsApp | Zone Connection",
      },
      {
        name: "description",
        content:
          "IA de WhatsApp que automatiza o atendimento da imobiliária, integra com o CRM e distribui leads para os corretores.",
      },
      {
        property: "og:title",
        content: "IA para WhatsApp | Zone Connection",
      },
      {
        property: "og:description",
        content:
          "Automatize o atendimento no WhatsApp, envie leads ao CRM e distribua oportunidades com inteligência artificial.",
      },
    ],
  }),
  component: WhatsAppAiPage,
});
