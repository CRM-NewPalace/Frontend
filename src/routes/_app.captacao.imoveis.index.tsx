import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/captacao/imoveis/")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/imoveis",
      search: search.proprietarioId
        ? { proprietarioId: search.proprietarioId }
        : {},
    });
  },
});
