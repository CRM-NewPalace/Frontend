import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Kanban,
  Calendar,
  Building2,
  UserCircle2,
  UsersRound,
  FileSignature,
  DollarSign,
  Settings,
  User as UserIcon,
  LogOut,
  Search,
  Bell,
  ChevronsLeft,
  ChevronDown,
  ChevronRight,
  Target,
  ClipboardList,
  Briefcase,
  Shield,
  CircleUser,
  ArrowLeftRight,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  FolderKanban,
  FolderOpen,
  SearchCheck,
  Percent,
  Tags,
  Goal,
  UserX,
  Network,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { getSession, sendHeartbeat, signOut, type AuthUser } from "@/lib/auth";
import { canAccessRoute } from "@/lib/permissions";
import { useHideImoveisFromSidebar } from "@/lib/imoveis-nav-prefs";
import { useTenantTheme } from "@/lib/tenant-theme";
import { ApiError } from "@/lib/api";
import {
  fetchNotificacoes,
  markAllNotificacoesLidas,
  markNotificacaoLida,
  type Notificacao,
} from "@/lib/notificacoes-api";
import {
  fetchAgendaLembretes,
  type AgendaProximo,
  type AgendaUrgencia,
} from "@/lib/agenda-api";
import { AgendaLembretesDialog } from "@/components/agenda-lembretes-dialog";
import { Input } from "@/components/ui/input";
import { useHeaderSearchInput } from "@/lib/header-search";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AGENDA_BADGE_BY_URGENCIA: Record<
  Exclude<AgendaUrgencia, "nenhuma">,
  string
> = {
  dia: "bg-amber-400 text-amber-950 hover:bg-amber-400",
  duas_horas: "bg-orange-500 text-white hover:bg-orange-500",
  uma_hora: "bg-red-600 text-white hover:bg-red-600",
};

const AGENDA_DOT_BY_URGENCIA: Record<
  Exclude<AgendaUrgencia, "nenhuma">,
  string
> = {
  dia: "bg-amber-400",
  duas_horas: "bg-orange-500",
  uma_hora: "bg-red-600",
};

const SESSION_LEMBRETE_KEY = "agenda-lembretes-card-shown";
const SESSION_ANALISE_ALERT_KEY = "analise-resultado-alerted-ids";

type NavLeaf = { to: string; label: string; icon: LucideIcon };
type NavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  children: NavLeaf[];
};
type NavItem = NavLeaf | NavGroup;

function isNavGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

function itemMatchesPath(item: NavItem, pathname: string) {
  if (isNavGroup(item)) {
    return item.children.some(
      (c) => pathname === c.to || pathname.startsWith(`${c.to}/`),
    );
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

const FINANCEIRO_MODULES: NavLeaf[] = [
  {
    to: "/financeiro/visao-geral",
    label: "Visão geral",
    icon: LayoutDashboard,
  },
  {
    to: "/financeiro/clientes-fornecedores",
    label: "Clientes e fornecedores",
    icon: Users,
  },
  {
    to: "/financeiro/movimentacao",
    label: "Movimentação financeira",
    icon: ArrowLeftRight,
  },
  { to: "/financeiro/fluxo-caixa", label: "Fluxo de caixa", icon: Banknote },
  {
    to: "/financeiro/contas-a-receber",
    label: "Contas a receber",
    icon: ArrowUpRight,
  },
  {
    to: "/financeiro/contas-a-pagar",
    label: "Contas a pagar",
    icon: ArrowDownRight,
  },
  {
    to: "/financeiro/centro-recebimentos",
    label: "Centro de recebimentos",
    icon: Tags,
  },
  {
    to: "/financeiro/centro-despesas",
    label: "Centro de despesas",
    icon: FolderKanban,
  },
  { to: "/financeiro/comissao", label: "Comissão", icon: Percent },
];

/** Financeiro da plataforma (super_admin) — mesmo design das imobiliárias. */
const PLATFORM_FINANCEIRO_MODULES: NavLeaf[] = [
  {
    to: "/financeiro/visao-geral",
    label: "Visão geral",
    icon: LayoutDashboard,
  },
  {
    to: "/financeiro/clientes-fornecedores",
    label: "Fornecedores",
    icon: Users,
  },
  {
    to: "/financeiro/movimentacao",
    label: "Movimentação financeira",
    icon: ArrowLeftRight,
  },
  {
    to: "/financeiro/contas-a-receber",
    label: "Contas a receber",
    icon: ArrowUpRight,
  },
  {
    to: "/financeiro/contas-a-pagar",
    label: "Contas a pagar",
    icon: ArrowDownRight,
  },
  {
    to: "/financeiro/fluxo-caixa",
    label: "Fluxo de caixa",
    icon: Banknote,
  },
];

const NAV_SECTIONS: {
  id: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Admin da imobiliária ou super_admin da plataforma. */
  adminOrPlatform?: boolean;
  gerenteOnly?: boolean;
  items: NavItem[];
}[] = [
  {
    id: "operacao",
    label: "Operação",
    icon: Briefcase,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/vendas", label: "Vendas", icon: DollarSign },
      { to: "/leads", label: "Leads", icon: Users },
      { to: "/funil", label: "Funil", icon: Kanban },
      { to: "/triagem", label: "Triagem", icon: ClipboardList },
      { to: "/imoveis", label: "Imóveis", icon: Building2 },
      { to: "/clientes", label: "Clientes", icon: UserCircle2 },
      { to: "/funil-clientes", label: "Funil de Clientes", icon: Kanban },
      { to: "/clientes-perdidos", label: "Perda de cliente", icon: UserX },
      { to: "/usuarios", label: "Usuários", icon: UsersRound },
      { to: "/construtoras", label: "Construtoras", icon: Building2 },
      { to: "/leads-perdidos", label: "Leads Perdidos", icon: UserX },
    ],
  },
  {
    id: "administracao",
    label: "Administração",
    icon: Shield,
    items: [
      { to: "/tenants", label: "Clientes", icon: Building2 },
      { to: "/agenda", label: "Agenda", icon: Calendar },
      { to: "/equipes", label: "Equipes", icon: Network },
      { to: "/corretores", label: "Corretores", icon: UsersRound },
      { to: "/documentacao", label: "Documentação", icon: FolderOpen },
      { to: "/resultado", label: "Análise", icon: SearchCheck },
      { to: "/metas", label: "Metas", icon: Target },
      { to: "/propostas", label: "Propostas", icon: ClipboardList },
      { to: "/contratos", label: "Contratos", icon: FileSignature },
      { to: "/taxa-conversao", label: "Taxa de conversão", icon: Goal },
      { to: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    icon: DollarSign,
    adminOrPlatform: true,
    items: FINANCEIRO_MODULES,
  },
  {
    id: "conta",
    label: "Conta",
    icon: CircleUser,
    items: [{ to: "/perfil", label: "Perfil", icon: UserIcon }],
  },
];

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  gerente: "Gerente",
  corretor: "Corretor",
  analista: "Analista",
  treinee: "Treinee",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const { brandName, logoUrl, modules } = useTenantTheme();
  const hideImoveisFromSidebar = useHideImoveisFromSidebar();
  const plano = user?.tenant?.plano ?? null;
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    operacao: true,
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [agendaSolicitacoesCount, setAgendaSolicitacoesCount] = useState(0);
  const [agendaUrgencia, setAgendaUrgencia] =
    useState<AgendaUrgencia>("nenhuma");
  const [agendaProximosCount, setAgendaProximosCount] = useState(0);
  const [agendaProximos, setAgendaProximos] = useState<AgendaProximo[]>([]);
  const [lembretesOpen, setLembretesOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [analiseAlert, setAnaliseAlert] = useState<Notificacao | null>(null);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const headerSearch = useHeaderSearchInput();

  useEffect(() => {
    setUser(getSession());
  }, []);

  const loadNotificacoes = useCallback(async () => {
    try {
      setNotificacoes(await fetchNotificacoes());
    } catch {
      // silencioso: sino não deve quebrar o shell
    }
  }, []);

  // Gerente: aviso em tela (toast + modal) quando chega resultado de análise.
  useEffect(() => {
    if (user?.role !== "gerente") return;
    if (analiseAlert) return;

    const unread = notificacoes.filter(
      (n) => !n.lida && n.tipo === "analise_resultado",
    );
    if (unread.length === 0) return;

    let shown: string[] = [];
    try {
      shown = JSON.parse(
        sessionStorage.getItem(SESSION_ANALISE_ALERT_KEY) || "[]",
      ) as string[];
      if (!Array.isArray(shown)) shown = [];
    } catch {
      shown = [];
    }

    const next = unread.find((n) => !shown.includes(n.id));
    if (!next) return;

    const updated = [...shown, next.id].slice(-40);
    try {
      sessionStorage.setItem(
        SESSION_ANALISE_ALERT_KEY,
        JSON.stringify(updated),
      );
    } catch {
      // ignore
    }

    setAnaliseAlert(next);
    const aprovada = /aprovad/i.test(next.titulo);
    if (aprovada) {
      toast.success(next.titulo, {
        description: next.corpo,
        duration: 10_000,
      });
    } else {
      toast.message(next.titulo, {
        description: next.corpo,
        duration: 10_000,
      });
    }
  }, [notificacoes, user?.role, analiseAlert]);

  const loadAgendaBadge = useCallback(
    async (opts?: { showCard?: boolean }) => {
      try {
        const data = await fetchAgendaLembretes();
        setAgendaSolicitacoesCount(data.solicitacoesCount);
        setAgendaUrgencia(data.urgencia);
        setAgendaProximosCount(data.proximosCount);
        setAgendaProximos(data.proximos);

        if (opts?.showCard && data.proximos.length > 0) {
          const already =
            typeof sessionStorage !== "undefined" &&
            sessionStorage.getItem(SESSION_LEMBRETE_KEY) === "1";
          if (!already) {
            sessionStorage.setItem(SESSION_LEMBRETE_KEY, "1");
            setLembretesOpen(true);
          }
        }

        if (data.novasNotificacoes.length > 0) {
          void loadNotificacoes();
        }
      } catch {
        // silencioso
      }
    },
    [loadNotificacoes],
  );

  useEffect(() => {
    if (!user) return;
    // Super admin não usa notificações/agenda do CRM operacional.
    if (user.role === "super_admin") return;

    void loadNotificacoes();
    // Analista não tem módulo de agenda; só consulta notificações.
    if (user.role !== "analista") {
      void loadAgendaBadge({ showCard: true });
    }
    const pollMs = user.role === "gerente" ? 20_000 : 60_000;
    const id = window.setInterval(() => {
      void loadNotificacoes();
      if (user.role !== "analista") {
        void loadAgendaBadge();
      }
    }, pollMs);
    return () => window.clearInterval(id);
  }, [user, loadNotificacoes, loadAgendaBadge]);

  // Presença: heartbeat a cada 60s com a aba visível (tempo logado no dia).
  useEffect(() => {
    if (!user || user.role === "super_admin") return;

    const beat = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      void sendHeartbeat().catch(() => {
        // silencioso — falha de presença não deve afetar o uso
      });
    };

    beat();
    const id = window.setInterval(beat, 60_000);

    const onVisibility = () => {
      if (!document.hidden) beat();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user]);

  const unreadCount = useMemo(
    () => notificacoes.filter((n) => !n.lida).length,
    [notificacoes],
  );

  const isAdmin = user?.role === "admin";
  const isPlatformAdmin = user?.role === "super_admin";
  const agendaBadgeCount =
    agendaUrgencia !== "nenhuma"
      ? agendaProximosCount
      : agendaSolicitacoesCount;
  const showAgendaBadge = agendaBadgeCount > 0;
  // Admin: badge neutro (sem vermelho/laranja de urgência pessoal).
  const agendaBadgeClass = isAdmin
    ? agendaUrgencia !== "nenhuma"
      ? "bg-slate-500 text-white hover:bg-slate-500"
      : "bg-primary"
    : agendaUrgencia !== "nenhuma"
      ? AGENDA_BADGE_BY_URGENCIA[agendaUrgencia]
      : "bg-primary";
  const agendaDotClass = isAdmin
    ? agendaUrgencia !== "nenhuma"
      ? "bg-slate-500"
      : "bg-primary"
    : agendaUrgencia !== "nenhuma"
      ? AGENDA_DOT_BY_URGENCIA[agendaUrgencia]
      : "bg-primary";

  async function handleOpenNotif(n: Notificacao) {
    try {
      if (!n.lida) {
        const updated = await markNotificacaoLida(n.id);
        setNotificacoes((prev) =>
          prev.map((x) => (x.id === updated.id ? updated : x)),
        );
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível marcar como lida.",
      );
    }
    setNotifOpen(false);
    if (
      n.tipo === "agenda_solicitacao" ||
      n.tipo === "agenda_resposta" ||
      n.tipo === "agenda_atribuicao" ||
      n.tipo === "agenda_lembrete_1d" ||
      n.tipo === "agenda_lembrete_2h" ||
      n.tipo === "agenda_lembrete_1h"
    ) {
      void navigate({ to: "/agenda" });
      return;
    }
    if (n.tipo === "analise_resultado") {
      void navigate({
        to:
          user?.role === "gerente" || user?.role === "admin"
            ? "/documentacao"
            : "/resultado",
      });
      return;
    }
    void navigate({
      to: user?.role === "analista" ? "/documentacao" : "/funil",
    });
  }

  async function dismissAnaliseAlert(opts?: { openDoc?: boolean }) {
    const current = analiseAlert;
    setAnaliseAlert(null);
    if (!current) return;
    try {
      if (!current.lida) {
        const updated = await markNotificacaoLida(current.id);
        setNotificacoes((prev) =>
          prev.map((x) => (x.id === updated.id ? updated : x)),
        );
      }
    } catch {
      // ignore
    }
    if (opts?.openDoc) {
      if (
        user &&
        canAccessRoute(
          user.role,
          "/documentacao",
          user.tenant?.modules ?? null,
          user.tenant?.plano ?? null,
        )
      ) {
        void navigate({ to: "/documentacao" });
      }
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificacoesLidas();
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível marcar todas.",
      );
    }
  }

  const navSections = useMemo(() => {
    if (!user) return [];
    return NAV_SECTIONS.filter((section) => {
      if (section.adminOnly) return user.role === "admin";
      if (section.adminOrPlatform) {
        return (
          section.id === "financeiro" ||
          user.role === "admin" ||
          user.role === "super_admin"
        );
      }
      if (section.gerenteOnly) return user.role === "gerente";
      return true;
    })
      .map((section) => {
        const sectionItems =
          section.id === "financeiro" && user.role === "super_admin"
            ? PLATFORM_FINANCEIRO_MODULES
            : section.items;
        return {
          ...section,
          items: sectionItems
            .map((item) => {
              if (isNavGroup(item)) {
                const children = item.children.filter((c) =>
                  canAccessRoute(user.role, c.to, modules, plano),
                );
                return children.length ? { ...item, children } : null;
              }
              if (item.to === "/imoveis" && hideImoveisFromSidebar) {
                return null;
              }
              return canAccessRoute(user.role, item.to, modules, plano)
                ? item
                : null;
            })
            .filter((item): item is NavItem => item !== null),
        };
      })
      .filter((section) => section.items.length > 0);
  }, [user, modules, plano, hideImoveisFromSidebar]);

  useEffect(() => {
    const active = navSections.find((section) =>
      section.items.some((item) => itemMatchesPath(item, pathname)),
    );
    if (active) {
      setOpenSections((prev) => ({ ...prev, [active.id]: true }));
    }
    for (const section of navSections) {
      for (const item of section.items) {
        if (isNavGroup(item) && itemMatchesPath(item, pathname)) {
          setOpenGroups((prev) => ({ ...prev, [item.id]: true }));
        }
      }
    }
  }, [pathname, navSections]);

  // Fecha o menu mobile automaticamente quando a rota muda.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Trava o scroll do body enquanto o drawer mobile está aberto.
  useEffect(() => {
    if (mobileNavOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [mobileNavOpen]);

  function toggleSection(id: string) {
    if (collapsed) {
      setCollapsed(false);
      setOpenSections((prev) => ({ ...prev, [id]: true }));
      return;
    }
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleSignOut() {
    await signOut();
    sessionStorage.removeItem(SESSION_LEMBRETE_KEY);
    sessionStorage.removeItem(SESSION_ANALISE_ALERT_KEY);
    toast.success("Você saiu da conta");
    navigate({ to: "/login", replace: true });
  }

  const initials =
    user?.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("") ?? "U";
  const canSettings = user
    ? canAccessRoute(user.role, "/configuracoes", modules, plano)
    : false;

  // Renderiza as seções de navegação. Reaproveitado tanto pelo <aside> fixo
  // do desktop quanto pelo drawer mobile, para não duplicar a lógica.
  function renderNavSections(collapsedView: boolean, onNavigate?: () => void) {
    return (
      <nav className="sidebar-nav-scroll flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navSections.map((section) => {
          const SectionIcon = section.icon;
          const isOpen = !!openSections[section.id];
          const sectionActive = section.items.some((item) =>
            itemMatchesPath(item, pathname),
          );

          return (
            <div key={section.id} className="space-y-0.5">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                title={collapsedView ? section.label : undefined}
                className={cn(
                  "w-full flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                  sectionActive
                    ? "text-sidebar-foreground bg-sidebar-accent"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                )}
              >
                <SectionIcon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    sectionActive && "text-brand-accent",
                  )}
                />
                {!collapsedView && (
                  <>
                    <span className="flex-1 text-left truncate">
                      {section.label}
                    </span>
                    {isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 shrink-0 text-sidebar-foreground/50" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-sidebar-foreground/50" />
                    )}
                  </>
                )}
              </button>

              {isOpen && !collapsedView && (
                <div className="space-y-0.5 ml-4 border-l border-sidebar-border pl-2">
                  {section.items.map((item) => {
                    if (isNavGroup(item)) {
                      const groupOpen = !!openGroups[item.id];
                      const groupActive = itemMatchesPath(item, pathname);
                      const GroupIcon = item.icon;
                      return (
                        <div key={item.id} className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => toggleGroup(item.id)}
                            className={cn(
                              "w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors cursor-pointer",
                              groupActive
                                ? "bg-[#075a82] text-sidebar-foreground font-medium"
                                : "hover:bg-white/6 text-sidebar-foreground/75",
                            )}
                          >
                            <GroupIcon className="w-4 h-4 shrink-0" />
                            <span className="flex-1 text-left truncate">
                              {item.label}
                            </span>
                            {groupOpen ? (
                              <ChevronDown className="w-3.5 h-3.5 shrink-0 text-sidebar-foreground/50" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-sidebar-foreground/50" />
                            )}
                          </button>
                          {groupOpen && (
                            <div className="space-y-0.5 ml-2 border-l border-sidebar-border pl-1">
                              {item.children.map((child) => {
                                const active =
                                  pathname === child.to ||
                                  pathname.startsWith(`${child.to}/`);
                                const ChildIcon = child.icon;
                                return (
                                  <Link
                                    key={child.to}
                                    to={child.to}
                                    onClick={onNavigate}
                                    className={cn(
                                      "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                                      active
                                        ? "bg-[#075a82] text-sidebar-foreground font-medium"
                                        : "hover:bg-white/6 text-sidebar-foreground/75",
                                    )}
                                  >
                                    <ChildIcon className="w-4 h-4 shrink-0" />
                                    <span className="truncate">
                                      {child.label}
                                    </span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    const active =
                      pathname === item.to ||
                      pathname.startsWith(`${item.to}/`);
                    const Icon = item.icon;
                    const isAgenda = item.to === "/agenda";
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={onNavigate}
                        className={cn(
                          "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-[#075a82] text-sidebar-foreground font-medium"
                            : "hover:bg-white/6 text-sidebar-foreground/75",
                        )}
                      >
                        <span className="relative shrink-0">
                          <Icon className="w-4 h-4" />
                          {isAgenda && showAgendaBadge && collapsedView ? (
                            <span
                              className={cn(
                                "absolute -top-1.5 -right-1.5 size-2 rounded-full",
                                agendaDotClass,
                              )}
                            />
                          ) : null}
                        </span>
                        {!collapsedView && (
                          <>
                            <span className="truncate flex-1">
                              {item.label}
                            </span>
                            {isAgenda && showAgendaBadge ? (
                              <Badge
                                className={cn(
                                  "h-5 min-w-5 px-1.5 text-[10px]",
                                  agendaBadgeClass,
                                )}
                              >
                                {agendaBadgeCount > 9 ? "9+" : agendaBadgeCount}
                              </Badge>
                            ) : null}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar fixa — visível apenas em telas md e acima */}
      <aside
        className={cn(
          collapsed ? "w-16" : "w-60",
          "hidden md:flex shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200 sticky top-0 h-screen flex-col",
        )}
      >
        <div
          className={cn(
            "flex border-b border-sidebar-border",
            collapsed
              ? "flex-col items-center gap-1 px-1 py-2"
              : "items-center gap-2 px-3 h-14",
          )}
        >
          <img
            src={logoUrl}
            alt={brandName}
            className="w-8 h-8 rounded-none object-contain shrink-0"
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold leading-tight truncate">
                {brandName === "Zone Connection" ? (
                  <>
                    Zone <span className="text-brand-accent">Connection</span>
                  </>
                ) : (
                  brandName
                )}
              </div>
              <div className="text-[10px] text-sidebar-foreground/60 truncate">
                {user?.role === "super_admin" ? "Plataforma" : "CRM conectado"}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="shrink-0 rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground cursor-pointer"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir" : "Recolher"}
          >
            <ChevronsLeft
              className={cn(
                "w-4 h-4 transition-transform",
                collapsed && "rotate-180",
              )}
            />
          </button>
        </div>
        {renderNavSections(collapsed)}
        <div className="border-t border-sidebar-border">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full p-3 flex items-center gap-2 text-xs text-[#f87171] hover:bg-[#f87171]/15 hover:text-[#fca5a5] cursor-pointer"
            title="Sair"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sair da conta</span>}
          </button>
        </div>
      </aside>

      {/* Backdrop do menu mobile */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden",
          mobileNavOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer do menu mobile */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-transform duration-200 ease-out md:hidden",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
      >
        <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
          <img
            src={logoUrl}
            alt={brandName}
            className="w-8 h-8 rounded-none object-contain shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold leading-tight truncate">
              {brandName === "Zone Connection" ? (
                <>
                  Zone <span className="text-brand-accent">Connection</span>
                </>
              ) : (
                brandName
              )}
            </div>
            <div className="text-[10px] text-sidebar-foreground/60 truncate">
              {user?.role === "super_admin" ? "Plataforma" : "CRM conectado"}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        {renderNavSections(false, () => setMobileNavOpen(false))}
        <div className="border-t border-sidebar-border">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full p-3 flex items-center gap-2 text-xs text-[#f87171] hover:bg-[#f87171]/15 hover:text-[#fca5a5] cursor-pointer"
            title="Sair"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sair da conta</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card/90 backdrop-blur sticky top-0 z-30 flex items-center gap-2 sm:gap-3 px-3 sm:px-6 min-w-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 md:hidden"
              aria-label="Abrir menu"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="relative flex-1 max-w-md min-w-0">
              <Search className="absolute left-2.5 sm:left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                value={headerSearch.value}
                onChange={(e) => headerSearch.setValue(e.target.value)}
                placeholder={headerSearch.placeholder}
                className="pl-8 sm:pl-9 h-9 rounded-md bg-background text-sm"
              />
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            {!isPlatformAdmin && (
              <Popover
                open={notifOpen}
                onOpenChange={(o) => {
                  setNotifOpen(o);
                  if (o) void loadNotificacoes();
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label="Notificações"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-primary">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                {/* Âncora no canto direito do header para o painel abrir alinhado à página */}
                <PopoverAnchor asChild>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-full h-0 w-0 sm:right-6"
                  />
                </PopoverAnchor>
                <PopoverContent
                  align="end"
                  side="bottom"
                  sideOffset={8}
                  className="w-80 p-0"
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <p className="text-sm font-semibold">Notificações</p>
                    {unreadCount > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => void handleMarkAllRead()}
                      >
                        Marcar todas
                      </Button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notificacoes.length === 0 ? (
                      <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                        Nenhuma notificação
                      </div>
                    ) : (
                      notificacoes.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          className={cn(
                            "w-full text-left px-3 py-2.5 border-b last:border-0 hover:bg-accent/60 transition-colors",
                            !n.lida && "bg-primary/5",
                          )}
                          onClick={() => void handleOpenNotif(n)}
                        >
                          <div className="text-xs font-medium leading-snug">
                            {n.titulo}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                            {n.corpo}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full px-2.5 py-1.5 hover:bg-accent"
                  aria-label="Menu da conta"
                >
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="avatar-fallback-brand text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left leading-tight hidden sm:block">
                    <div className="text-xs font-medium">
                      {user?.name ?? "Usuário"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {user ? (ROLE_LABEL[user.role] ?? user.role) : ""}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/perfil" })}>
                  <UserIcon className="w-4 h-4 mr-2" /> Perfil
                </DropdownMenuItem>
                {canSettings && (
                  <DropdownMenuItem
                    onClick={() => navigate({ to: "/configuracoes" })}
                  >
                    <Settings className="w-4 h-4 mr-2" /> Configurações
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-3 sm:p-4 md:p-6 max-w-full min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>

      <AgendaLembretesDialog
        open={lembretesOpen}
        onOpenChange={setLembretesOpen}
        proximos={agendaProximos}
        urgencia={agendaUrgencia}
        informativo={user?.role === "admin"}
        onGoAgenda={() => {
          setLembretesOpen(false);
          void navigate({ to: "/agenda" });
        }}
      />

      <AlertDialog
        open={Boolean(analiseAlert)}
        onOpenChange={(open) => {
          if (!open) void dismissAnaliseAlert();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {analiseAlert?.titulo ?? "Resultado da análise"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {analiseAlert?.corpo ??
                "Um processo da sua equipe teve o resultado da análise atualizado."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => void dismissAnaliseAlert()}>
              Fechar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void dismissAnaliseAlert({ openDoc: true })}
            >
              Ver documentação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const { brandName } = useTenantTheme();
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
      <div className="min-w-0">
        <p className="mb-1.5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-accent">
          <span className="size-1.5 rounded-full bg-brand-accent" />
          {brandName}
        </p>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
