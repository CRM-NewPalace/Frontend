import { createFileRoute } from "@tanstack/react-router";
import DemoPage from "@/marketing/pages/DemoPage";
import { marketingHead } from "@/marketing/seo";

export const Route = createFileRoute("/demonstracao")({
  ssr: true,
  head: () =>
    marketingHead({
      title: "Demonstração do CRM Imobiliário | Zone Connection",
      description:
        "Explore o CRM Zone Connection: dashboard, funil, leads e agenda em uma demonstração interativa antes de falar com o time.",
      path: "/demonstracao",
    }),
  component: DemoPage,
});
