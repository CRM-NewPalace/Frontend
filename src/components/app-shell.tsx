import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Kanban, Calendar, Building2, UserCircle2,
  UsersRound, FileText, DollarSign, BarChart3, Settings, User as UserIcon,
  LogOut, Search, Bell, ChevronsLeft, ChevronDown, ChevronRight,
  Target, ClipboardList, Briefcase, Shield, CircleUser, ArrowLeftRight,
  Banknote, ScrollText, ArrowUpRight, ArrowDownRight, FolderKanban,
  FolderOpen, SearchCheck, Percent, Goal, UserX, Network, type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { getSession, signOut, type AuthUser } from "@/lib/auth";
import { canAccessRoute } from "@/lib/permissions";
import { setTheme } from "@/lib/theme";
import { ApiError } from "@/lib/api";
import {
  fetchNotificacoes,
  markAllNotificacoesLidas,
  markNotificacaoLida,
  type Notificacao,
} from "@/lib/notificacoes-api";
import { fetchSolicitacoesAgendaCount } from "@/lib/agenda-api";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type NavLeaf = { to: string; label: string; icon: LucideIcon };
type NavGroup = { id: string; label: string; icon: LucideIcon; children: NavLeaf[] };
type NavItem = NavLeaf | NavGroup;

function isNavGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

function itemMatchesPath(item: NavItem, pathname: string) {
  if (isNavGroup(item)) {
    return item.children.some((c) => pathname === c.to || pathname.startsWith(`${c.to}/`));
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

const FINANCEIRO_MODULES: NavLeaf[] = [
  { to: "/financeiro/visao-geral", label: "Visão geral", icon: LayoutDashboard },
  { to: "/financeiro/clientes-fornecedores", label: "Clientes e fornecedores", icon: Users },
  { to: "/financeiro/movimentacao", label: "Movimentação financeira", icon: ArrowLeftRight },
  { to: "/financeiro/fluxo-caixa", label: "Fluxo de caixa", icon: Banknote },
  { to: "/financeiro/contas-a-receber", label: "Contas a receber", icon: ArrowUpRight },
  { to: "/financeiro/contas-a-pagar", label: "Contas a pagar", icon: ArrowDownRight },
  { to: "/financeiro/centro-despesas", label: "Centro de despesas", icon: FolderKanban },
  { to: "/financeiro/comissao", label: "Comissão", icon: Percent },
  { to: "/financeiro/demonstrativo", label: "Demonstrativo de resultado", icon: ScrollText },
];

const NAV_SECTIONS: {
  id: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  gerenteOnly?: boolean;
  items: NavItem[];
}[] = [
  {
    id: "operacao",
    label: "Operação",
    icon: Briefcase,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/leads", label: "Leads", icon: Users },
      { to: "/funil", label: "Funil", icon: Kanban },
      { to: "/triagem", label: "Triagem", icon: ClipboardList },
      { to: "/documentacao", label: "Documentação", icon: FolderOpen },
      { to: "/resultado", label: "Análise", icon: SearchCheck },
      { to: "/agenda", label: "Agenda", icon: Calendar },
      { to: "/imoveis", label: "Imóveis", icon: Building2 },
      { to: "/clientes", label: "Clientes", icon: UserCircle2 },
      { to: "/corretores", label: "Corretores", icon: UsersRound },
      { to: "/metas", label: "Metas", icon: Target },
      { to: "/propostas", label: "Propostas", icon: FileText },
    ],
  },
  {
    id: "administracao",
    label: "Administração",
    icon: Shield,
    items: [
      { to: "/usuarios", label: "Usuários", icon: UsersRound },
      { to: "/equipes", label: "Equipes", icon: Network },
      { to: "/leads-perdidos", label: "Leads Perdidos", icon: UserX },
      { to: "/taxa-conversao", label: "Taxa de conversão", icon: Goal },
      { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
      { to: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    icon: DollarSign,
    adminOnly: true,
    items: FINANCEIRO_MODULES,
  },
  {
    id: "conta",
    label: "Conta",
    icon: CircleUser,
    items: [
      { to: "/perfil", label: "Perfil", icon: UserIcon },
    ],
  },
];

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  corretor: "Corretor",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    operacao: true,
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [agendaSolicitacoesCount, setAgendaSolicitacoesCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => { setUser(getSession()); }, []);

  const loadNotificacoes = useCallback(async () => {
    try {
      setNotificacoes(await fetchNotificacoes());
    } catch {
      // silencioso: sino não deve quebrar o shell
    }
  }, []);

  const loadAgendaBadge = useCallback(async () => {
    try {
      const { count } = await fetchSolicitacoesAgendaCount();
      setAgendaSolicitacoesCount(count);
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void loadNotificacoes();
    void loadAgendaBadge();
    const id = window.setInterval(() => {
      void loadNotificacoes();
      void loadAgendaBadge();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [user, loadNotificacoes, loadAgendaBadge]);

  const unreadCount = useMemo(
    () => notificacoes.filter((n) => !n.lida).length,
    [notificacoes],
  );

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
        err instanceof ApiError ? err.message : "Não foi possível marcar como lida.",
      );
    }
    setNotifOpen(false);
    if (n.tipo === "agenda_solicitacao" || n.tipo === "agenda_resposta") {
      void navigate({ to: "/agenda" });
      return;
    }
    void navigate({ to: "/funil" });
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificacoesLidas();
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível marcar todas.",
      );
    }
  }

  const navSections = useMemo(() => {
    if (!user) return [];
    return NAV_SECTIONS
      .filter((section) => {
        if (section.adminOnly) return user.role === "admin";
        if (section.gerenteOnly) return user.role === "gerente";
        return true;
      })
      .map((section) => ({
        ...section,
        items: section.items
          .map((item) => {
            if (isNavGroup(item)) {
              const children = item.children.filter((c) => canAccessRoute(user.role, c.to));
              return children.length ? { ...item, children } : null;
            }
            return canAccessRoute(user.role, item.to) ? item : null;
          })
          .filter((item): item is NavItem => item !== null),
      }))
      .filter((section) => section.items.length > 0);
  }, [user]);

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
    setTheme("light");
    toast.success("Você saiu da conta");
    navigate({ to: "/login", replace: true });
  }

  const initials = user?.name.split(" ").map((n) => n[0]).slice(0, 2).join("") ?? "U";
  const canSettings = user ? canAccessRoute(user.role, "/configuracoes") : false;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={`${collapsed ? "w-16" : "w-60"} shrink-0 border-r bg-sidebar text-sidebar-foreground transition-all duration-200 sticky top-0 h-screen flex flex-col`}
      >
        <div className="flex items-center gap-2 px-4 h-14 border-b">
          <img
            src="/favicon-32.png"
            alt="Imob CRM"
            className="w-8 h-8 rounded-lg object-cover shrink-0"
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold leading-tight">Imob CRM</div>
              <div className="text-[10px] text-muted-foreground">Gestão Imobiliária</div>
            </div>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {navSections.map((section) => {
            const SectionIcon = section.icon;
            const isOpen = !!openSections[section.id];
            const sectionActive = section.items.some((item) => itemMatchesPath(item, pathname));

            return (
              <div key={section.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  title={collapsed ? section.label : undefined}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    sectionActive
                      ? "text-sidebar-accent-foreground bg-sidebar-accent/50"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                  )}
                >
                  <SectionIcon className="w-4 h-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{section.label}</span>
                      {isOpen
                        ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />}
                    </>
                  )}
                </button>

                {isOpen && !collapsed && (
                  <div className="space-y-0.5 ml-2 border-l border-sidebar-border pl-1">
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
                                "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                                groupActive
                                  ? "bg-sidebar-accent/70 text-sidebar-accent-foreground font-medium"
                                  : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80",
                              )}
                            >
                              <GroupIcon className="w-4 h-4 shrink-0" />
                              <span className="flex-1 text-left truncate">{item.label}</span>
                              {groupOpen
                                ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />}
                            </button>
                            {groupOpen && (
                              <div className="space-y-0.5 ml-2 border-l border-sidebar-border pl-1">
                                {item.children.map((child) => {
                                  const active =
                                    pathname === child.to || pathname.startsWith(`${child.to}/`);
                                  const ChildIcon = child.icon;
                                  return (
                                    <Link
                                      key={child.to}
                                      to={child.to}
                                      className={cn(
                                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                                        active
                                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                          : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80",
                                      )}
                                    >
                                      <ChildIcon className="w-4 h-4 shrink-0" />
                                      <span className="truncate">{child.label}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
                      const Icon = item.icon;
                      const showAgendaBadge =
                        item.to === "/agenda" && agendaSolicitacoesCount > 0;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                            active
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80",
                          )}
                        >
                          <span className="relative shrink-0">
                            <Icon className="w-4 h-4" />
                            {showAgendaBadge && collapsed ? (
                              <span className="absolute -top-1.5 -right-1.5 size-2 rounded-full bg-primary" />
                            ) : null}
                          </span>
                          {!collapsed && (
                            <>
                              <span className="truncate flex-1">{item.label}</span>
                              {showAgendaBadge ? (
                                <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-primary">
                                  {agendaSolicitacoesCount > 9
                                    ? "9+"
                                    : agendaSolicitacoesCount}
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
        <div className="border-t">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full p-3 flex items-center gap-2 text-xs text-destructive hover:bg-destructive/10"
            title="Sair"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sair da conta</span>}
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="w-full border-t p-3 flex items-center gap-2 text-xs text-muted-foreground hover:bg-sidebar-accent"
          >
            <ChevronsLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
            {!collapsed && "Recolher"}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card/70 backdrop-blur sticky top-0 z-30 flex items-center gap-2 sm:gap-3 px-3 sm:px-6 min-w-0">
          <div className="relative flex-1 max-w-md min-w-0">
            <Search className="absolute left-2.5 sm:left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-8 sm:pl-9 h-9 bg-background text-sm" />
          </div>
          <DropdownMenu open={notifOpen} onOpenChange={(o) => {
            setNotifOpen(o);
            if (o) void loadNotificacoes();
          }}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-primary">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <DropdownMenuLabel className="p-0">Notificações</DropdownMenuLabel>
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
                      <div className="text-xs font-medium leading-snug">{n.titulo}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {n.corpo}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-accent"
                aria-label="Menu da conta"
              >
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="text-left leading-tight hidden sm:block">
                  <div className="text-xs font-medium">{user?.name ?? "Usuário"}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {user ? ROLE_LABEL[user.role] ?? user.role : ""}
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
                <DropdownMenuItem onClick={() => navigate({ to: "/configuracoes" })}>
                  <Settings className="w-4 h-4 mr-2" /> Configurações
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-3 sm:p-4 md:p-6 max-w-full min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
