import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Bell,
  Building2,
  Newspaper,
  ChevronDown,
  FileText,
  Handshake,
  Headset,
  Home,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  ScrollText,
  X,
} from "lucide-react";
import {
  changePortalPassword,
  countNovidadesNaoLidas,
  fetchPortalNovidades,
  marcarPortalNovidadesLidas,
  type PortalNovidade,
  type PortalProprietario,
} from "@/lib/portal-api";
import { signOutPortal } from "@/lib/portal-auth";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const NAV = [
  { to: "/portal", label: "Início", icon: LayoutDashboard, exact: true },
  { to: "/portal/novidades", label: "Novidades", icon: Newspaper },
  { to: "/portal/imoveis", label: "Meus Imóveis", icon: Home },
  { to: "/portal/propostas", label: "Propostas", icon: ScrollText },
  { to: "/portal/visitas", label: "Visitas", icon: Building2 },
  { to: "/portal/negociacoes", label: "Negociações", icon: Handshake },
  { to: "/portal/documentos", label: "Documentos", icon: FileText },
  { to: "/portal/mensagens", label: "Mensagens", icon: MessageCircle },
] as const;

function initials(nome: string) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "P";
  const b = parts.length > 1 ? parts[parts.length - 1]![0] : "";
  return (a + b).toUpperCase();
}

function firstName(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

function isActive(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === "/portal" || pathname === "/portal/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function PortalShell({
  proprietario,
  children,
}: {
  proprietario: PortalProprietario;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const [senhaOpen, setSenhaOpen] = useState(false);
  const [contaOpen, setContaOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [novidades, setNovidades] = useState<PortalNovidade[]>([]);
  const naoLidas = countNovidadesNaoLidas(novidades);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [senhaBusy, setSenhaBusy] = useState(false);

  useEffect(() => {
    void fetchPortalNovidades()
      .then(setNovidades)
      .catch(() => setNovidades([]));
  }, []);

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setSenhaBusy(true);
    try {
      await changePortalPassword(senhaAtual, senhaNova);
      toast.success("Senha atualizada.");
      setSenhaAtual("");
      setSenhaNova("");
      setSenhaOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível trocar a senha.");
    } finally {
      setSenhaBusy(false);
    }
  }

  const nav = (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item.to, "exact" in item && item.exact);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setMenuOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-white/15 font-medium text-white"
                : "text-white/70 hover:bg-white/8 hover:text-white",
            )}
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1">{item.label}</span>
            {item.to === "/portal/novidades" && naoLidas > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-400 px-1.5 text-[10px] font-semibold text-[#0f4c5c]">
                {naoLidas > 9 ? "9+" : naoLidas}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f4f6f7] text-slate-800">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col bg-[#0f4c5c] px-4 py-5 text-white lg:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <KeyRound className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">Portal do</p>
            <p className="text-sm font-semibold leading-tight">Proprietário</p>
          </div>
        </div>
        {nav}
        <div className="mt-auto space-y-4">
          <div className="rounded-2xl bg-[#0c3d4a] p-4">
            <p className="text-sm font-semibold">Dúvidas ou suporte?</p>
            <p className="mt-1 text-xs leading-relaxed text-white/65">
              Fale com nossa equipe sempre que precisar.
            </p>
            <Link
              to="/portal/mensagens"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#148ea3] py-2 text-sm font-medium hover:bg-[#17a0b8]"
            >
              <Headset className="h-4 w-4" />
              Abrir atendimento
            </Link>
          </div>
          <div className="flex items-center gap-3 px-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
              {initials(proprietario.nome)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{proprietario.nome}</p>
              <p className="text-xs text-white/55">Proprietário</p>
            </div>
          </div>
        </div>
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Fechar menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[260px] flex-col bg-[#0f4c5c] px-4 py-5 text-white">
            <div className="mb-6 flex items-center justify-between px-2">
              <p className="text-sm font-semibold">Portal do Proprietário</p>
              <button type="button" onClick={() => setMenuOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-500 lg:hidden"
                onClick={() => setMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold text-[#12343d] sm:text-2xl">
                  Olá, {firstName(proprietario.nome)} 👋
                </h1>
                <p className="hidden text-sm text-slate-500 sm:block">
                  Acompanhe o desempenho dos seus imóveis e negociações.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
                  onClick={() => {
                    setNotifOpen((open) => !open);
                    setContaOpen(false);
                  }}
                >
                  <Bell className="h-5 w-5" />
                  {naoLidas > 0 ? (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-semibold text-white">
                      {naoLidas > 9 ? "9+" : naoLidas}
                    </span>
                  ) : null}
                </button>
                {notifOpen ? (
                  <div className="absolute right-0 top-11 z-30 w-80 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">Novidades</p>
                      <Link
                        to="/portal/novidades"
                        className="text-xs text-[#0d7a8c]"
                        onClick={() => setNotifOpen(false)}
                      >
                        Ver todas
                      </Link>
                    </div>
                    {naoLidas > 0 ? (
                      <button
                        type="button"
                        className="mb-2 w-full rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-[#0f4c5c] hover:bg-slate-50"
                        onClick={() => {
                          void marcarPortalNovidadesLidas()
                            .then(setNovidades)
                            .catch((err) => {
                              toast.error(
                                err instanceof ApiError
                                  ? err.message
                                  : "Não foi possível marcar como lidas.",
                              );
                            });
                        }}
                      >
                        Marcar como lidas
                      </button>
                    ) : null}
                    {novidades.slice(0, 5).map((item) => (
                      <Link
                        key={item.id}
                        to="/portal/imoveis/$id"
                        params={{ id: item.imovelId }}
                        className="block rounded-lg px-2 py-2 hover:bg-slate-50"
                        onClick={() => setNotifOpen(false)}
                      >
                        <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          {item.lida !== true ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          ) : null}
                          {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                        <p className={cn("text-sm", item.lida !== true ? "font-medium text-slate-800" : "text-slate-700")}>
                          {item.texto}
                        </p>
                      </Link>
                    ))}
                    {novidades.length === 0 ? (
                      <p className="px-2 py-4 text-sm text-slate-500">Nada novo por agora.</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="relative">
                <button
                  type="button"
                  className="hidden items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 text-sm sm:flex"
                  onClick={() => {
                    setContaOpen((open) => !open);
                    setNotifOpen(false);
                  }}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0f4c5c] text-xs font-semibold text-white">
                    {initials(proprietario.nome)}
                  </span>
                  <span className="max-w-32 truncate">{proprietario.nome}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
                {contaOpen ? (
                  <div className="absolute right-0 top-12 z-30 w-48 rounded-xl border border-slate-100 bg-white py-1 shadow-xl">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
                      onClick={() => {
                        setContaOpen(false);
                        setSenhaOpen(true);
                      }}
                    >
                      <KeyRound className="h-4 w-4" />
                      Trocar senha
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
                      onClick={() => {
                        void signOutPortal().then(() =>
                          navigate({ to: "/portal/login", search: { email: undefined } }),
                        );
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>

      <Dialog open={senhaOpen} onOpenChange={setSenhaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Trocar senha</DialogTitle>
            <DialogDescription>
              Altere a senha de acesso ao portal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void onChangePassword(e)} className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="senha-atual">Senha atual</Label>
              <Input
                id="senha-atual"
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha-nova">Nova senha</Label>
              <Input
                id="senha-nova"
                type="password"
                value={senhaNova}
                onChange={(e) => setSenhaNova(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={senhaBusy} className="bg-[#0f4c5c] hover:bg-[#0c3d4a]">
              {senhaBusy ? "Salvando…" : "Atualizar senha"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
