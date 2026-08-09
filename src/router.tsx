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
    // Preload no hover/touch — troca de módulo fica quase instantânea.
    // (#7759 corrigido nas versões atuais do router-core.)
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
    // Não segura a tela anterior esperando pendingMs (padrão do TanStack = 1000ms).
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  });

  return router;
};
