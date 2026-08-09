import type { AuthUser, Role } from "@/lib/auth";
import { ROUTE_MODULE_KEY, type TenantPlano } from "@/lib/tenant-modules";

/**
 * Rotas por perfil:
 * - admin: operação + financeiro; carteira própria (/clientes) e vendas
 * - gerente: operação da equipe; carteira própria (/clientes) e vendas
 * - corretor: essencial (próprios leads/agenda/clientes)
 * - analista: funil de análise, documentação e resultado (visão global)
 */
const ROLE_ROUTES: Record<Role, readonly string[]> = {
  super_admin: [
    "/perfil",
    "/tenants",
    "/financeiro/visao-geral",
    "/financeiro/clientes-fornecedores",
    "/financeiro/contas-a-receber",
    "/financeiro/contas-a-pagar",
    "/financeiro/fluxo-caixa",
    "/financeiro/movimentacao",
    "/financeiro/categorias",
    "/financeiro/centro-despesas",
    "/financeiro/contratos",
    "/financeiro/comissao",
  ],
  admin: [
    "/dashboard",
    "/vendas",
    "/leads",
    "/funil",
    "/funil-clientes",
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
    "/contratos",
    "/financeiro",
    "/configuracoes",
    "/perfil",
  ],
  gerente: [
    "/dashboard",
    "/vendas",
    "/leads",
    "/funil",
    "/funil-clientes",
    "/agenda",
    "/imoveis",
    "/clientes",
    "/corretores",
    "/metas",
    "/triagem",
    "/documentacao",
    "/resultado",
    "/usuarios",
    "/construtoras",
    "/propostas",
    "/contratos",
    "/taxa-conversao",
    "/financeiro/comissao",
    "/configuracoes",
    "/perfil",
  ],
  corretor: [
    "/dashboard",
    "/leads",
    "/funil",
    "/funil-clientes",
    "/agenda",
    "/imoveis",
    "/clientes",
    "/clientes-perdidos",
    "/metas",
    "/triagem",
    "/documentacao",
    "/contratos",
    "/financeiro/comissao",
    "/perfil",
  ],
  analista: [
    "/funil",
    "/resultado",
    "/documentacao",
    "/contratos",
    "/imoveis",
    "/perfil",
  ],
};

/** No Bronze o gerente acessa só o CRM operacional. */
const GERENTE_BRONZE_ROUTES: readonly string[] = [
  "/dashboard",
  "/leads",
  "/funil",
  "/agenda",
  "/imoveis",
  "/triagem",
  "/construtoras",
  "/contratos",
  "/financeiro/comissao",
  "/perfil",
];

export function getAllowedRoutes(role: Role): readonly string[] {
  return ROLE_ROUTES[role];
}

export function canAccessRoute(
  role: Role,
  pathname: string,
  modules?: Record<string, boolean> | null,
  plano?: TenantPlano | null,
): boolean {
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";
  const roleRoutes =
    role === "gerente" && plano === "bronze"
      ? GERENTE_BRONZE_ROUTES
      : ROLE_ROUTES[role];
  const allowedByRole = roleRoutes.some(
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
  if (
    home &&
    canAccessRoute(
      role,
      home,
      user?.tenant?.modules ?? null,
      user?.tenant?.plano ?? null,
    )
  ) {
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
