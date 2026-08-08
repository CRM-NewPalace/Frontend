import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth";
import { defaultRouteForRole } from "@/lib/permissions";
import Home from "@/marketing/pages/Home";
import { marketingHead } from "@/marketing/seo";

export const Route = createFileRoute("/")({
  ssr: true,
  beforeLoad: () => {
    const user = getSession();
    if (user) {
      throw redirect({ to: defaultRouteForRole(user.role, user) });
    }
  },
  head: () =>
    marketingHead({
      title:
        "Zone Connection | CRM, IA no WhatsApp e Sites para Imobiliárias",
      description:
        "Ecossistema Zone Connection: CRM imobiliário, IA para WhatsApp e sites/landing pages — gestão, atendimento e captação no mesmo lugar.",
      path: "/",
    }),
  component: Home,
});
