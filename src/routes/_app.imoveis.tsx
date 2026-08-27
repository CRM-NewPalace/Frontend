import { createFileRoute } from "@tanstack/react-router";
import { ImoveisPage } from "@/components/imoveis-page";

type Search = { proprietarioId?: string };

export const Route = createFileRoute("/_app/imoveis")({
  head: () => ({ meta: [{ title: "Imóveis — Zone Connection" }] }),
  validateSearch: (search: Record<string, unknown>): Search => ({
    proprietarioId:
      typeof search.proprietarioId === "string"
        ? search.proprietarioId
        : undefined,
  }),
  component: ImoveisRoute,
});

function ImoveisRoute() {
  const { proprietarioId } = Route.useSearch();
  return <ImoveisPage proprietarioId={proprietarioId} />;
}
