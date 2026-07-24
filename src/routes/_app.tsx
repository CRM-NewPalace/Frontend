import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/mock-auth";
import { canAccessRoute, defaultRouteForRole } from "@/lib/permissions";
import { LeadsProvider } from "@/lib/leads-store";
import { AgendaProvider } from "@/lib/agenda-store";
import { CorretoresProvider } from "@/lib/corretores-store";
import { PropostasProvider } from "@/lib/propostas-store";
import { TriagemProvider } from "@/lib/triagem-store";
import { FinanceiroContasProvider } from "@/lib/financeiro-contas-store";
import { FinanceiroPessoasProvider } from "@/lib/financeiro-pessoas-store";
import { MovimentosFinanceirosProvider } from "@/lib/movimentos-financeiros-store";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: ({ location }) => {
    const user = getSession();
    if (!user) throw redirect({ to: "/login" });
    if (!canAccessRoute(user.role, location.pathname)) {
      throw redirect({ to: defaultRouteForRole(user.role) });
    }
  },
  component: () => (
    <LeadsProvider>
      <AgendaProvider>
        <CorretoresProvider>
          <PropostasProvider>
            <TriagemProvider>
              <FinanceiroContasProvider>
                <FinanceiroPessoasProvider>
                  <MovimentosFinanceirosProvider>
                    <AppShell>
                      <Outlet />
                    </AppShell>
                  </MovimentosFinanceirosProvider>
                </FinanceiroPessoasProvider>
              </FinanceiroContasProvider>
            </TriagemProvider>
          </PropostasProvider>
        </CorretoresProvider>
      </AgendaProvider>
    </LeadsProvider>
  ),
});
