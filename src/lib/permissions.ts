import type { AuthUser, Role } from "@/lib/auth";
import { ROUTE_MODULE_KEY } from "@/lib/tenant-modules";

/**
 * Rotas por perfil:
 * - admin: tudo, inclusive financeiro
 * - gerente: operação da equipe + administração limitada, sem financeiro
 * - corretor: essencial (próprios leads/agenda/clientes)
 * - analista: funil de análise, documentação e resultado (visão global)
 */
const ROLE_ROUTES: Record<Role, readonly string[]> = {
  super_admin: ["/perfil", "/tenants"],
  admin: [
    "/dashboard",
    "/leads",
    "/funil",
    "/agenda",
    "/imoveis",
    "/clientes",
    "/corretores",
    "/metas",
    "/triagem",
    "/documentacao",
    "/resultado",
    "/usuarios",
    "/equipes",
    "/construtoras",
    "/leads-perdidos",
    "/taxa-conversao",
    "/propostas",
    "/financeiro",
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
    "/metas",
    "/triagem",
    "/documentacao",
    "/resultado",
    "/usuarios",
    "/equipes",
    "/construtoras",
    "/propostas",
    "/taxa-conversao",
    "/configuracoes",
    "/perfil",
  ],
  corretor: [
    "/dashboard",
    "/leads",
    "/funil",
    "/agenda",
    "/imoveis",
    "/clientes",
    "/metas",
    "/triagem",
    "/documentacao",
    "/perfil",
  ],
  analista: ["/funil", "/resultado", "/documentacao", "/imoveis", "/perfil"],
};

export function getAllowedRoutes(role: Role): readonly string[] {
  return ROLE_ROUTES[role];
}

export function canAccessRoute(
  role: Role,
  pathname: string,
  modules?: Record<string, boolean> | null,
): boolean {
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";
  const allowedByRole = ROLE_ROUTES[role].some(
    (route) => path === route || path.startsWith(`${route}/`),
  );
  if (!allowedByRole) return false;

  if (modules) {
    const moduleKey = Object.entries(ROUTE_MODULE_KEY).find(
      ([route]) => path === route || path.startsWith(`${route}/`),
    )?.[1];
    if (moduleKey && modules[moduleKey] === false) return false;
  }

  return true;
}

export function defaultRouteForRole(
  role: Role,
  user?: Pick<AuthUser, "tenant"> | null,
): string {
  if (role === "super_admin") return "/tenants";
  if (role === "analista") return "/funil";

  const home = user?.tenant?.homePath?.trim();
  if (home && canAccessRoute(role, home, user?.tenant?.modules ?? null)) {
    return home;
  }
  return "/dashboard";
}

/** Apenas admin vê indicadores financeiros (receita, comissão, valores em R$). */
export function canViewFinancial(role: Role): boolean {
  return role === "admin";
}

/**
 * Admin vê todos; gerente vê a própria equipe (escopo aplicado na API).
 * Analista tem visão global de processos de análise.
 * Corretor fica restrito aos próprios registros.
 */
export function canViewTeamData(role: Role): boolean {
  return role === "admin" || role === "gerente" || role === "analista";
}
