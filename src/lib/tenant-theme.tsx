import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { AuthUser, TenantBranding } from "@/lib/auth";

/** Logo padrão Zone Connection (fundo transparente). */
export const DEFAULT_TENANT_LOGO = "/brand/zone-connection-logo.png";

type TenantThemeContextValue = {
  tenant: TenantBranding | null;
  brandName: string;
  logoUrl: string;
  homePath: string;
  modules: Record<string, boolean>;
  isModuleEnabled: (key: string) => boolean;
};

const TenantThemeContext = createContext<TenantThemeContextValue | null>(null);

/** Remove overrides visuais antigos (cor/sidebar/densidade por tenant). */
function clearTenantThemeOverrides() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const key of [
    "--primary",
    "--ring",
    "--sidebar-primary",
    "--sidebar-ring",
    "--chart-1",
    "--success",
  ] as const) {
    root.style.removeProperty(key);
  }
  root.classList.remove(
    "tenant-sidebar-dark",
    "tenant-sidebar-compact",
    "tenant-density-compact",
  );
}

function normalizeModules(
  value: TenantBranding["modules"],
): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, boolean> = {};
  for (const [key, enabled] of Object.entries(value)) {
    if (typeof enabled === "boolean") out[key] = enabled;
  }
  return out;
}

function resolveLogoUrl(tenant: TenantBranding | null): string {
  const custom = tenant?.logoUrl?.trim();
  return custom || DEFAULT_TENANT_LOGO;
}

export function TenantThemeProvider({
  user,
  children,
}: {
  user: AuthUser | null;
  children: ReactNode;
}) {
  const tenant = user?.role === "super_admin" ? null : (user?.tenant ?? null);

  const value = useMemo<TenantThemeContextValue>(() => {
    const modules = normalizeModules(tenant?.modules ?? null);
    return {
      tenant,
      brandName: tenant?.name ?? "Zone Connection",
      logoUrl: resolveLogoUrl(tenant),
      homePath: "/dashboard",
      modules,
      isModuleEnabled: (key: string) => modules[key] !== false,
    };
  }, [tenant]);

  useEffect(() => {
    clearTenantThemeOverrides();
  }, [tenant]);

  return (
    <TenantThemeContext.Provider value={value}>
      {children}
    </TenantThemeContext.Provider>
  );
}

export function useTenantTheme() {
  const ctx = useContext(TenantThemeContext);
  if (!ctx) {
    return {
      tenant: null,
      brandName: "Zone Connection",
      logoUrl: DEFAULT_TENANT_LOGO,
      homePath: "/dashboard",
      modules: {} as Record<string, boolean>,
      isModuleEnabled: () => true,
    } satisfies TenantThemeContextValue;
  }
  return ctx;
}
