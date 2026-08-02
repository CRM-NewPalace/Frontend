import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { defaultRouteForRole } from "@/lib/permissions";
import LeadingPage from "@/marketing/pages/LeadingPage";

const siteSearchSchema = z.object({
  site: z.literal("1").optional(),
});

export const Route = createFileRoute("/")({
  ssr: false,
  validateSearch: siteSearchSchema,
  beforeLoad: ({ search }) => {
    const user = getSession();
    if (user) {
      throw redirect({ to: defaultRouteForRole(user.role, user) });
    }

    if (search.site !== "1") {
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
