import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Pré-carrega a rota ao passar o mouse / focus no link.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
    // Evita “piscar” loading em beforeLoads curtos.
    defaultPendingMs: 500,
    defaultPendingMinMs: 0,
  });

  return router;
};
