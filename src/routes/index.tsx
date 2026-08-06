import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth";
import { defaultRouteForRole } from "@/lib/permissions";
import Home from "@/marketing/pages/Home";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    const user = getSession();
    if (user) {
      throw redirect({ to: defaultRouteForRole(user.role, user) });
    }
  },
  head: () => ({
    meta: [
      { title: "Zone Connection | Tecnologia para o Mercado Imobiliário" },
      {
        name: "description",
        content:
          "A Zone Connection é uma empresa de tecnologia que desenvolve um ecossistema de soluções para o mercado imobiliário — conectando pessoas, processos e inovação.",
      },
      {
        property: "og:title",
        content: "Zone Connection | Tecnologia para o Mercado Imobiliário",
      },
      {
        property: "og:description",
        content:
          "A Zone Connection é uma empresa de tecnologia que desenvolve um ecossistema de soluções para o mercado imobiliário — conectando pessoas, processos e inovação.",
      },
    ],
  }),
  component: Home,
});
