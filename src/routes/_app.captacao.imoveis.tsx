import { createFileRoute, Outlet } from "@tanstack/react-router";

type Search = { proprietarioId?: string };

export const Route = createFileRoute("/_app/captacao/imoveis")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    proprietarioId:
      typeof search.proprietarioId === "string"
        ? search.proprietarioId
        : undefined,
  }),
  component: () => <Outlet />,
});
