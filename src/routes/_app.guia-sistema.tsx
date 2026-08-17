import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GuiaSistemaPage } from "@/components/guia-sistema";

type GuiaSearch = {
  modulo?: string;
};

export const Route = createFileRoute("/_app/guia-sistema")({
  head: () => ({ meta: [{ title: "Guia do sistema — Zone Connection" }] }),
  validateSearch: (search: Record<string, unknown>): GuiaSearch => ({
    modulo: typeof search.modulo === "string" ? search.modulo : undefined,
  }),
  component: GuiaSistemaRoute,
});

function GuiaSistemaRoute() {
  const { modulo } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <GuiaSistemaPage
      modulo={modulo}
      onSelectModulo={(id) => {
        void navigate({
          to: "/guia-sistema",
          search: id === "jornada" ? {} : { modulo: id },
          replace: true,
        });
      }}
    />
  );
}
