import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import {
  ensureSession,
  getSession,
  isSessionReady,
  type AuthUser,
} from "@/lib/auth";
import { canAccessRoute, defaultRouteForRole } from "@/lib/permissions";
import { LeadsProvider } from "@/lib/leads-store";
import { CatalogProvider } from "@/lib/catalog-store";
import { TenantThemeProvider } from "@/lib/tenant-theme";

function guardUser(user: AuthUser, pathname: string) {
  if (!canAccessRoute(user.role, pathname, user.tenant?.modules ?? null)) {
    throw redirect({ to: defaultRouteForRole(user.role, user) });
  }
  return { user };
}

export const Route = createFileRoute("/_app")({
  ssr: false,
  // Sessão já validada nesta página → beforeLoad síncrono (troca de seção instantânea).
  // Só espera /auth/me no primeiro load ou se o cache sumiu.
  beforeLoad: ({ location }) => {
    if (isSessionReady()) {
      const user = getSession()!;
      void ensureSession();
      return guardUser(user, location.pathname);
    }

    return ensureSession().then((user) => {
      if (!user) throw redirect({ to: "/login" });
      return guardUser(user, location.pathname);
    });
  },
  component: AppLayout,
});

function AppLayout() {
  const { user } = Route.useRouteContext();
  return (
    <TenantThemeProvider user={user}>
      <CatalogProvider>
        <LeadsProvider>
          <AppShell>
            <Outlet />
          </AppShell>
        </LeadsProvider>
      </CatalogProvider>
    </TenantThemeProvider>
  );
}
