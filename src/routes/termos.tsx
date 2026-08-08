import { createFileRoute } from "@tanstack/react-router";
import TermsOfUsePage from "@/marketing/pages/TermsOfUsePage";
import { marketingHead } from "@/marketing/seo";

export const Route = createFileRoute("/termos")({
  ssr: true,
  head: () =>
    marketingHead({
      title: "Termos de Uso | Zone Connection",
      description:
        "Termos de Uso do site e dos serviços digitais da Zone Connection para o mercado imobiliário.",
      path: "/termos",
    }),
  component: TermsOfUsePage,
});
