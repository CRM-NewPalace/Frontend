/**
 * Catálogo de módulos do tenant, alinhado ao menu (Operação / Administração / Financeiro).
 * false em Tenant.modules = oculto no menu e bloqueado na rota.
 */

export type TenantModuleKey =
  | "dashboard"
  | "leads"
  | "funil"
  | "triagem"
  | "agenda"
  | "imoveis"
  | "clientes"
  | "construtoras"
  | "leadsPerdidos"
  | "usuarios"
  | "equipes"
  | "corretores"
  | "documentacao"
  | "analise"
  | "metas"
  | "propostas"
  | "taxaConversao"
  | "configuracoes"
  | "financeiro";

export type TenantModuleDef = {
  key: TenantModuleKey;
  label: string;
  /** Não desliga no toggle em massa do Administrativo. */
  keepOnAdminBulkOff?: boolean;
};

export type TenantModuleGroupId =
  "operacional" | "administrativo" | "financeiro";

export type TenantModuleGroup = {
  id: TenantModuleGroupId;
  label: string;
  modules: TenantModuleDef[];
};

export const TENANT_MODULE_GROUPS: TenantModuleGroup[] = [
  {
    id: "operacional",
    label: "Operacional",
    modules: [
      { key: "dashboard", label: "Dashboard" },
      { key: "leads", label: "Leads" },
      { key: "funil", label: "Funil" },
      { key: "triagem", label: "Triagem" },
      { key: "agenda", label: "Agenda" },
      { key: "imoveis", label: "Imóveis" },
      { key: "clientes", label: "Clientes" },
      { key: "construtoras", label: "Construtoras" },
      { key: "leadsPerdidos", label: "Leads Perdidos" },
    ],
  },
  {
    id: "administrativo",
    label: "Administrativo",
    modules: [
      {
        key: "usuarios",
        label: "Usuários (criar usuário)",
        keepOnAdminBulkOff: true,
      },
      { key: "equipes", label: "Equipes" },
      { key: "corretores", label: "Corretores" },
      { key: "documentacao", label: "Documentação" },
      { key: "analise", label: "Análise" },
      { key: "metas", label: "Metas" },
      { key: "propostas", label: "Propostas" },
      { key: "taxaConversao", label: "Taxa de conversão" },
      {
        key: "configuracoes",
        label: "Configurações",
        keepOnAdminBulkOff: true,
      },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    modules: [{ key: "financeiro", label: "Financeiro" }],
  },
];

export const ALL_TENANT_MODULE_KEYS: TenantModuleKey[] =
  TENANT_MODULE_GROUPS.flatMap((g) => g.modules.map((m) => m.key));

/** Rota → chave de módulo (para permissões / menu). */
export const ROUTE_MODULE_KEY: Record<string, TenantModuleKey> = {
  "/dashboard": "dashboard",
  "/leads": "leads",
  "/funil": "funil",
  "/triagem": "triagem",
  "/agenda": "agenda",
  "/imoveis": "imoveis",
  "/clientes": "clientes",
  "/construtoras": "construtoras",
  "/leads-perdidos": "leadsPerdidos",
  "/usuarios": "usuarios",
  "/equipes": "equipes",
  "/corretores": "corretores",
  "/documentacao": "documentacao",
  "/vendas": "documentacao",
  "/resultado": "analise",
  "/metas": "metas",
  "/propostas": "propostas",
  "/taxa-conversao": "taxaConversao",
  "/configuracoes": "configuracoes",
  "/financeiro": "financeiro",
};

export function defaultModulesRecord(
  enabled = true,
): Record<TenantModuleKey, boolean> {
  return Object.fromEntries(
    ALL_TENANT_MODULE_KEYS.map((key) => [key, enabled]),
  ) as Record<TenantModuleKey, boolean>;
}

export function modulesFromTenantJson(
  modules: Record<string, boolean> | null | undefined,
): Record<TenantModuleKey, boolean> {
  const base = defaultModulesRecord(true);
  if (!modules) return base;
  for (const key of ALL_TENANT_MODULE_KEYS) {
    if (typeof modules[key] === "boolean") base[key] = modules[key]!;
  }
  // Compatibilidade com tenants antigos (só 6 chaves)
  return base;
}

export type TenantPlano = "bronze" | "prata" | "ouro";

export const PLANO_MAX_USUARIOS: Record<TenantPlano, number> = {
  bronze: 5,
  prata: 15,
  ouro: 30,
};

export const PLANO_LABELS: Record<TenantPlano, string> = {
  bronze: "Bronze — CRM",
  prata: "Prata — CRM + Administrativo ou Financeiro",
  ouro: "Ouro — Todos os módulos",
};

const ADMIN_TOGGLE_KEYS: TenantModuleKey[] = [
  "equipes",
  "corretores",
  "documentacao",
  "analise",
  "metas",
  "propostas",
  "taxaConversao",
];

export function isAdminGroupEnabled(
  modules: Record<TenantModuleKey, boolean>,
): boolean {
  return ADMIN_TOGGLE_KEYS.every((k) => modules[k] !== false);
}

/** @deprecated Use isAdminGroupEnabled */
export const adminGroupEnabled = isAdminGroupEnabled;

/** Analista: nunca no Bronze; Prata/Ouro só com administrativo ativo. */
export function isAnalistaAllowed(
  plano: TenantPlano | null | undefined,
  modules?: Record<string, boolean> | null,
): boolean {
  if (!plano || plano === "bronze") return false;
  const normalized = modulesFromTenantJson(modules);
  return isAdminGroupEnabled(normalized);
}

/**
 * Normaliza módulos pelas regras do plano (espelha o backend).
 * Prata: administrativo XOR financeiro (se ambos, prioriza administrativo).
 */
export function normalizeModulesForPlano(
  plano: TenantPlano,
  modules: Record<TenantModuleKey, boolean>,
): Record<TenantModuleKey, boolean> {
  const next = { ...modules };
  for (const key of TENANT_MODULE_GROUPS.find((g) => g.id === "operacional")!
    .modules.map((m) => m.key)) {
    if (typeof next[key] !== "boolean") next[key] = true;
  }
  next.usuarios = true;
  next.configuracoes = true;

  if (plano === "bronze") {
    for (const key of ADMIN_TOGGLE_KEYS) next[key] = false;
    next.financeiro = false;
  } else if (plano === "prata") {
    const adminOn = ADMIN_TOGGLE_KEYS.every((k) => next[k] !== false);
    const financeOn = next.financeiro === true;
    if (adminOn && financeOn) {
      next.financeiro = false;
    } else if (financeOn && !adminOn) {
      for (const key of ADMIN_TOGGLE_KEYS) next[key] = false;
      next.financeiro = true;
    } else if (adminOn) {
      next.financeiro = false;
    }
  }

  return next;
}

/** Preset de módulos por plano (espelha o backend). */
export function modulesPresetForPlano(
  plano: TenantPlano,
): Record<TenantModuleKey, boolean> {
  const next = defaultModulesRecord(false);
  for (const key of TENANT_MODULE_GROUPS.find((g) => g.id === "operacional")!
    .modules.map((m) => m.key)) {
    next[key] = true;
  }
  next.usuarios = true;
  next.configuracoes = true;
  if (plano === "prata" || plano === "ouro") {
    for (const mod of TENANT_MODULE_GROUPS.find((g) => g.id === "administrativo")!
      .modules) {
      next[mod.key] = true;
    }
  }
  if (plano === "ouro") {
    next.financeiro = true;
  }
  return normalizeModulesForPlano(plano, next);
}

/** Desliga todos do Administrativo, mantendo "criar usuário" / config. */
export function setAdminGroupEnabled(
  modules: Record<TenantModuleKey, boolean>,
  enabled: boolean,
): Record<TenantModuleKey, boolean> {
  const next = { ...modules };
  const admin = TENANT_MODULE_GROUPS.find((g) => g.id === "administrativo");
  if (!admin) return next;
  for (const mod of admin.modules) {
    if (mod.keepOnAdminBulkOff) {
      if (enabled) next[mod.key] = true;
      continue;
    }
    next[mod.key] = enabled;
  }
  return next;
}
