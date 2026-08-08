import { createFileRoute } from "@tanstack/react-router";
import PrivacyPolicyPage from "@/marketing/pages/PrivacyPolicyPage";
import { marketingHead } from "@/marketing/seo";

export const Route = createFileRoute("/privacidade")({
  ssr: true,
  head: () =>
    marketingHead({
      title: "Política de Privacidade | Zone Connection",
      description:
        "Saiba como a Zone Connection trata dados pessoais, cookies e Google Analytics no site, em conformidade com a LGPD.",
      path: "/privacidade",
    }),
  component: PrivacyPolicyPage,
});
