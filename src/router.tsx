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
    // Desligado: com "intent", preload em voo pode crashar com
    // TypeError "_nonReactive" quando o match é evicted (TanStack #7759).
    defaultPreload: false,
    // Evita “piscar” loading em beforeLoads curtos.
    defaultPendingMs: 500,
    defaultPendingMinMs: 0,
  });

  return router;
};
