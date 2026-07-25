import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ensureSession } from "@/lib/auth";
import { canAccessRoute, defaultRouteForRole } from "@/lib/permissions";
import { LeadsProvider } from "@/lib/leads-store";
import { CatalogProvider } from "@/lib/catalog-store";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const user = await ensureSession();
    if (!user) throw redirect({ to: "/login" });
    if (!canAccessRoute(user.role, location.pathname)) {
      throw redirect({ to: defaultRouteForRole(user.role) });
    }
  },
  component: () => (
    <CatalogProvider>
      <LeadsProvider>
        <AppShell>
          <Outlet />
        </AppShell>
      </LeadsProvider>
    </CatalogProvider>
  ),
});
