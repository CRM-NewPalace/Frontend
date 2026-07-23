import type { Role } from "@/lib/mock-auth";

/** Rotas liberadas por perfil. Admin vê tudo; gerente não vê financeiro; corretor só o essencial. */
const ROLE_ROUTES: Record<Role, readonly string[]> = {
  admin: [
    "/dashboard",
    "/leads",
    "/funil",
    "/agenda",
    "/imoveis",
    "/clientes",
    "/corretores",
    "/usuarios",
    "/propostas",
    "/financeiro",
    "/relatorios",
    "/configuracoes",
    "/perfil",
  ],
  gerente: [
    "/dashboard",
    "/leads",
    "/funil",
    "/agenda",
    "/imoveis",
    "/clientes",
    "/corretores",
    "/usuarios",
    "/propostas",
    "/relatorios",
    "/configuracoes",
    "/perfil",
  ],
  corretor: [
    "/dashboard",
    "/leads",
    "/funil",
    "/agenda",
    "/clientes",
    "/perfil",
  ],
};

export function getAllowedRoutes(role: Role): readonly string[] {
  return ROLE_ROUTES[role];
}

export function canAccessRoute(role: Role, pathname: string): boolean {
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";
  return ROLE_ROUTES[role].some(
    (route) => path === route || path.startsWith(`${route}/`),
  );
}

export function defaultRouteForRole(_role: Role): string {
  return "/dashboard";
}
