import type { Role } from "@/lib/auth";

/**
 * Rotas por perfil:
 * - admin: tudo, inclusive financeiro
 * - gerente: operação da equipe + administração limitada, sem financeiro
 * - corretor: essencial (próprios leads/agenda/clientes)
 * - analista: funil de análise, documentação e resultado (visão global)
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
    "/equipes",
    "/construtoras",
    "/leads-perdidos",
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
    "/usuarios",
    "/equipes",
    "/construtoras",
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
  analista: [
    "/funil",
    "/resultado",
    "/documentacao",
    "/imoveis",
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

export function defaultRouteForRole(role: Role): string {
  if (role === "analista") return "/funil";
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
