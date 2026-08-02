import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth";
import { hasMarketingHomeAccess } from "@/lib/marketing-nav";
import { defaultRouteForRole } from "@/lib/permissions";
import LeadingPage from "@/marketing/pages/LeadingPage";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    const user = getSession();
    if (user) {
      throw redirect({ to: defaultRouteForRole(user.role, user) });
    }

    if (typeof window !== "undefined" && !hasMarketingHomeAccess()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Zone Connection | Tudo em uma só conexão" },
      {
        name: "description",
        content:
          "CRM, financeiro, imóveis, atendimento e funil comercial conectados para imobiliárias.",
      },
      {
        property: "og:title",
        content: "Zone Connection | Tudo em uma só conexão",
      },
      {
        property: "og:description",
        content: "Toda a gestão da sua imobiliária em um único lugar.",
      },
    ],
  }),
  component: LeadingPage,
});
