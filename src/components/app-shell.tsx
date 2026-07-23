import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Kanban, Calendar, Building2, UserCircle2,
  UsersRound, FileText, DollarSign, BarChart3, Settings, User as UserIcon,
  LogOut, Search, Bell, ChevronsLeft, Home,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { getSession, signOut, type MockUser } from "@/lib/mock-auth";
import { canAccessRoute } from "@/lib/permissions";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/funil", label: "Funil", icon: Kanban },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/imoveis", label: "Imóveis", icon: Building2 },
  { to: "/clientes", label: "Clientes", icon: UserCircle2 },
  { to: "/corretores", label: "Corretores", icon: UsersRound },
  { to: "/usuarios", label: "Usuários", icon: UsersRound },
  { to: "/propostas", label: "Propostas", icon: FileText },
  { to: "/financeiro", label: "Financeiro", icon: DollarSign },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
  { to: "/perfil", label: "Perfil", icon: UserIcon },
] as const;

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  corretor: "Corretor",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<MockUser | null>(null);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => { setUser(getSession()); }, []);

  const navItems = useMemo(() => {
    if (!user) return [];
    return NAV.filter((item) => canAccessRoute(user.role, item.to));
  }, [user]);

  function handleSignOut() {
    signOut();
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
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
            <Home className="w-4 h-4" />
          </div>
          {!collapsed && (
            <div className="flex-1">
              <div className="text-sm font-semibold leading-tight">Imob CRM</div>
              <div className="text-[10px] text-muted-foreground">Gestão Imobiliária</div>
            </div>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {navItems.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="border-t p-3 flex items-center gap-2 text-xs text-muted-foreground hover:bg-sidebar-accent"
        >
          <ChevronsLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          {!collapsed && "Recolher"}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card/70 backdrop-blur sticky top-0 z-30 flex items-center gap-3 px-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar leads, imóveis, corretores..." className="pl-9 h-9 bg-background" />
          </div>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-4 h-4" />
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-primary">3</Badge>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-accent">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="text-left leading-tight hidden sm:block">
                  <div className="text-xs font-medium">{user?.name ?? "Usuário"}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {user ? ROLE_LABEL[user.role] ?? user.role : ""}
                  </div>
                </div>
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
        <main className="flex-1 p-6 max-w-full">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
