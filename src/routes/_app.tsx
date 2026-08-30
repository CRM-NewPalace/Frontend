import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ensureSession, getSession, type AuthUser } from "@/lib/auth";
import { canAccessRoute, defaultRouteForRole } from "@/lib/permissions";
import { LeadsProvider } from "@/lib/leads-store";
import { CatalogProvider } from "@/lib/catalog-store";
import { TenantThemeProvider } from "@/lib/tenant-theme";

function guardUser(user: AuthUser, pathname: string) {
  if (
    !canAccessRoute(
      user.role,
      pathname,
      user.tenant?.modules ?? null,
      user.tenant?.plano ?? null,
      user.permissions ?? null,
    )
  ) {
    throw redirect({ to: defaultRouteForRole(user.role, user) });
  }
  return { user };
}

export const Route = createFileRoute("/_app")({
  ssr: false,
  pendingMs: 0,
  pendingMinMs: 0,
  // Sessão em cache → beforeLoad síncrono (troca de módulo imediata).
  // /auth/me só bloqueia se o cache local sumiu.
  beforeLoad: ({ location }) => {
    const cached = getSession();
    if (cached) {
      void ensureSession();
      return guardUser(cached, location.pathname);
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
