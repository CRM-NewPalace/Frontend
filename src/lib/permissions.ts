import type { AuthUser, Role } from "@/lib/auth";
import { ROUTE_MODULE_KEY, isFinanceiroPathAllowed, type TenantPlano } from "@/lib/tenant-modules";

/**
 * Rotas por perfil:
 * - admin: operação + financeiro; carteira própria (/clientes) e vendas
 * - gerente: operação da equipe; carteira própria (/clientes) e vendas
 * - corretor: essencial (próprios leads/agenda/clientes) + cadastro de construtoras (sem vendas)
 * - analista: documentação, resultado e catálogos (origens/tags/motivos)
 * - treinee: mesmo acesso operacional do corretor + cadastro de construtoras/empreendimentos/origens/tags/CCAs; documentação só vinculada
 */
const ROLE_ROUTES: Record<Role, readonly string[]> = {
  super_admin: [
    "/perfil",
    "/tenants",
    "/guia",
    "/agenda",
    "/financeiro/visao-geral",
    "/financeiro/clientes-fornecedores",
    "/financeiro/contas-a-receber",
    "/financeiro/contas-a-pagar",
    "/financeiro/despesas",
    "/financeiro/fluxo-caixa",
    "/financeiro/movimentacao",
  ],
  admin: [
    "/dashboard",
    "/vendas",
    "/leads",
    "/funil",
    "/funil-clientes",
    "/agenda",
    "/imoveis",
    "/treinamento",
    "/guia-sistema",
    "/clientes",
    "/corretores",
    "/atrasos",
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
    "/treinamento",
    "/guia-sistema",
    "/clientes",
    "/corretores",
    "/atrasos",
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
    "/treinamento",
    "/guia-sistema",
    "/clientes",
    "/clientes-perdidos",
    "/metas",
    "/triagem",
    "/documentacao",
    "/contratos",
    "/construtoras",
    "/financeiro/comissao",
    "/perfil",
  ],
  analista: [
    "/resultado",
    "/documentacao",
    "/contratos",
    "/imoveis",
    "/treinamento",
    "/guia-sistema",
    "/construtoras",
    "/usuarios",
    "/configuracoes",
    "/perfil",
  ],
  treinee: [
    "/dashboard",
    "/leads",
    "/funil",
    "/funil-clientes",
    "/agenda",
    "/imoveis",
    "/treinamento",
    "/guia-sistema",
    "/clientes",
    "/clientes-perdidos",
    "/metas",
    "/triagem",
    "/documentacao",
    "/contratos",
    "/financeiro/comissao",
    "/construtoras",
    "/configuracoes",
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
  "/treinamento",
  "/guia-sistema",
  "/triagem",
  "/construtoras",
  "/documentacao",
  "/contratos",
    "/financeiro/comissao",
    "/configuracoes",
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

  if (!isFinanceiroPathAllowed(path, plano ?? null)) return false;

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
  if (role === "analista") return "/documentacao";

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

/** Ranking, VGV e vendas por construtora: só gestão. */
export function canViewRankingVendas(role: Role | null | undefined): boolean {
  return role === "admin" || role === "gerente";
}

/**
 * Admin vê todos; gerente vê a própria equipe (escopo aplicado na API).
 * Analista tem visão global de processos de análise.
 * Corretor e treinee ficam restritos aos próprios registros.
 */
export function canViewTeamData(role: Role): boolean {
  return role === "admin" || role === "gerente" || role === "analista";
}

/** Mesmo escopo operacional do corretor (própria carteira). */
export function isCorretorLike(role: string | null | undefined): boolean {
  return role === "corretor" || role === "treinee";
}

/** Quem pode registrar relatos e editar o próprio texto na triagem. */
export function canWriteTriagem(role: string | null | undefined): boolean {
  return (
    role === "corretor" ||
    role === "treinee" ||
    role === "gerente" ||
    role === "admin"
  );
}

/**
 * Quem vê o lead no funil / monitoramento de atraso:
 * - admin: todos do tenant
 * - gerente: carteira própria + corretores da equipe + pool da equipe
 * - corretor/treinee: somente os próprios
 */
export function isLeadInAtrasoScope(
  user: Pick<AuthUser, "id" | "name" | "role">,
  lead: {
    corretorId?: string | null;
    equipeId?: string | null;
    corretor?: string | null;
  },
  team?: { memberIds: Set<string>; equipeIds: Set<string> },
): boolean {
  if (
    user.role === "admin" ||
    user.role === "super_admin" ||
    user.role === "analista"
  ) {
    return true;
  }
  if (isCorretorLike(user.role)) {
    return lead.corretorId === user.id || lead.corretor === user.name;
  }
  if (user.role === "gerente") {
    if (lead.corretorId === user.id) return true;
    if (lead.corretorId && team?.memberIds.has(lead.corretorId)) return true;
    if (
      !lead.corretorId &&
      lead.equipeId &&
      team?.equipeIds.has(lead.equipeId)
    ) {
      return true;
    }
    return false;
  }
  return false;
}
