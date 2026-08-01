import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ensureSession } from "@/lib/auth";
import { canAccessRoute, defaultRouteForRole } from "@/lib/permissions";
import { LeadsProvider } from "@/lib/leads-store";
import { CatalogProvider } from "@/lib/catalog-store";
import { TenantThemeProvider } from "@/lib/tenant-theme";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const user = await ensureSession();
    if (!user) throw redirect({ to: "/login" });
    if (
      !canAccessRoute(
        user.role,
        location.pathname,
        user.tenant?.modules ?? null,
      )
    ) {
      throw redirect({ to: defaultRouteForRole(user.role, user) });
    }
    return { user };
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
