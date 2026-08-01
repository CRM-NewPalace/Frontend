import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { AuthUser, TenantBranding } from "@/lib/auth";

type TenantThemeContextValue = {
  tenant: TenantBranding | null;
  brandName: string;
  logoUrl: string | null;
  homePath: string;
  modules: Record<string, boolean>;
  isModuleEnabled: (key: string) => boolean;
};

const TenantThemeContext = createContext<TenantThemeContextValue | null>(null);

const PRIMARY_VARS = [
  "--primary",
  "--ring",
  "--sidebar-primary",
  "--sidebar-ring",
  "--chart-1",
  "--success",
] as const;

function clearTenantTheme() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const key of PRIMARY_VARS) {
    root.style.removeProperty(key);
  }
  root.classList.remove(
    "tenant-sidebar-dark",
    "tenant-sidebar-compact",
    "tenant-density-compact",
  );
}

function applyTenantTheme(tenant: TenantBranding | null) {
  if (typeof document === "undefined") return;
  clearTenantTheme();
  if (!tenant) return;

  const root = document.documentElement;
  if (tenant.primaryColor) {
    for (const key of PRIMARY_VARS) {
      root.style.setProperty(key, tenant.primaryColor);
    }
  }

  if (tenant.sidebarStyle === "dark") {
    root.classList.add("tenant-sidebar-dark");
  } else if (tenant.sidebarStyle === "compact") {
    root.classList.add("tenant-sidebar-compact");
  }

  if (tenant.density === "compact") {
    root.classList.add("tenant-density-compact");
  }
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
      brandName: tenant?.name ?? "NP Connect",
      logoUrl: tenant?.logoUrl ?? null,
      homePath: tenant?.homePath || "/dashboard",
      modules,
      isModuleEnabled: (key: string) => modules[key] !== false,
    };
  }, [tenant]);

  useEffect(() => {
    applyTenantTheme(tenant);
    return () => clearTenantTheme();
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
      brandName: "NP Connect",
      logoUrl: null,
      homePath: "/dashboard",
      modules: {} as Record<string, boolean>,
      isModuleEnabled: () => true,
    } satisfies TenantThemeContextValue;
  }
  return ctx;
}
