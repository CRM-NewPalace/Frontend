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
    // Sem preload no hover: o intent disparava dezenas de rotas pesadas
    // (funil, leads, dashboard) e quebrava com match undefined no router.
    // A troca de módulo fica no clique, com o chunk em cache depois da 1ª visita.
    defaultPreload: false,
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  });

  return router;
};
