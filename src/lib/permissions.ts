import type { Role } from "@/lib/mock-auth";

/**
 * Rotas por perfil:
 * - admin: tudo, inclusive financeiro
 * - gerente: operação completa da equipe (leads, funil, agenda, clientes, corretores…), sem financeiro nem usuários
 * - corretor: essencial + imóveis do catálogo New Palace (só os próprios leads/agenda/clientes)
 */
const ROLE_ROUTES: Record<Role, readonly string[]> = {
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
    "/taxa-conversao",
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
    "/metas",
    "/triagem",
    "/documentacao",
    "/resultado",
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
    "/imoveis",
    "/clientes",
    "/metas",
    "/triagem",
    "/documentacao",
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

/** Apenas admin vê indicadores financeiros (receita, comissão, valores em R$). */
export function canViewFinancial(role: Role): boolean {
  return role === "admin";
}

/**
 * Admin e gerente acompanham leads, funil, agenda, clientes e processos de todos os corretores.
 * Corretor fica restrito aos próprios registros.
 */
export function canViewTeamData(role: Role): boolean {
  return role === "admin" || role === "gerente";
}
