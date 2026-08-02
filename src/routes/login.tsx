import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Building2,
  Kanban,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { signIn } from "@/lib/auth";
import { defaultRouteForRole } from "@/lib/permissions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  // SSR ativo: evita mismatch Suspense (servidor) vs página (cliente) no React 19.
  head: () => ({
    meta: [
      { title: "Entrar — Zone Connection" },
      {
        name: "description",
        content:
          "Acesse a Zone Connection para gerenciar leads, funil, imóveis e corretores.",
      },
      { property: "og:title", content: "Entrar — Zone Connection" },
      {
        property: "og:description",
        content: "Tudo em uma só conexão para a gestão da sua imobiliária.",
      },
    ],
  }),
  component: LoginPage,
});

// Atalhos de desenvolvimento. Nunca vão para o bundle de produção, para não
// divulgar credenciais válidas na tela de login.
const SHOW_DEMO_ACCOUNTS = import.meta.env.DEV;

const DEMO = [
  {
    email: "admin@imob.com",
    password: "admin",
    role: "Administrador",
    hint: "Acesso total",
  },
  {
    email: "gerente@imob.com",
    password: "gerente",
    role: "Gerente",
    hint: "Equipe e operação",
  },
  {
    email: "corretor@imob.com",
    password: "corretor",
    role: "Corretor",
    hint: "Carteira própria",
  },
] as const;

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(
    SHOW_DEMO_ACCOUNTS ? "admin@imob.com" : "",
  );
  const [password, setPassword] = useState(SHOW_DEMO_ACCOUNTS ? "admin" : "");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await signIn(email, password);
      toast.success(`Bem-vindo(a), ${user.name.split(" ")[0]}!`);
      navigate({ to: defaultRouteForRole(user.role, user) });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível entrar",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Painel navy Zone Connection */}
      <aside className="hidden lg:flex relative flex-col justify-between overflow-hidden text-white p-10 xl:p-14 bg-[linear-gradient(155deg,#032734_0%,#053647_45%,#0a5a75_100%)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-16 w-[28rem] h-[28rem] rounded-full bg-[#079ED4]/25 blur-3xl animate-[login-float_8s_ease-in-out_infinite]" />
          <div className="absolute bottom-10 -right-20 w-[22rem] h-[22rem] rounded-full bg-black/30 blur-3xl animate-[login-float_10s_ease-in-out_infinite_reverse]" />
          <div
            className="absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                "radial-gradient(circle at center, transparent 0%, transparent 35%, rgba(7,158,212,0.35) 36%, transparent 37%), radial-gradient(circle at center, transparent 0%, transparent 55%, rgba(7,158,212,0.2) 56%, transparent 57%)",
              backgroundPosition: "70% 45%, 70% 45%",
              backgroundSize: "420px 420px, 560px 560px",
              backgroundRepeat: "no-repeat",
            }}
          />
        </div>

        <div className="relative z-10 animate-[login-fade_0.7s_ease-out]">
          <img
            src="/brand/zone-connection-logo.png"
            alt="Zone Connection"
            className="h-24 w-auto max-w-[320px] rounded-none object-contain"
          />
          <p className="mt-4 text-base font-semibold tracking-tight">
            Zone{" "}
            <span className="text-[#079ED4]">Connection</span>
          </p>
        </div>

        <div className="relative z-10 max-w-lg space-y-8 animate-[login-fade_0.9s_ease-out]">
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#079ED4]">
              <span className="size-1.5 rounded-full bg-[#079ED4]" />
              Zone Connection · Imobiliárias
            </p>
            <h1 className="text-4xl xl:text-5xl font-semibold leading-[1.12] tracking-tight">
              Toda a gestão da sua imobiliária em{" "}
              <span className="text-[#079ED4]">um único lugar.</span>
            </h1>
            <p className="text-base text-white/80 leading-relaxed max-w-md">
              CRM, financeiro, imóveis, atendimento e funil comercial conectados
              — sem retrabalho, sem informação perdida.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              { icon: Users, label: "CRM integrado" },
              { icon: Kanban, label: "Funil comercial" },
              { icon: Building2, label: "Gestão de imóveis" },
            ].map((item) => (
              <div
                key={item.label}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-3.5 py-2 text-sm text-white/95 ring-1 ring-white/15"
              >
                <item.icon className="w-3.5 h-3.5 opacity-90" />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-end justify-between gap-4 animate-[login-fade_1.1s_ease-out]">
          <p className="text-xs text-white/55">© 2026 Zone Connection</p>
          <div className="hidden xl:flex items-center gap-2 text-xs text-white/70">
            <span className="w-1.5 h-1.5 rounded-full bg-[#079ED4] animate-pulse" />
            Tudo em uma só conexão
          </div>
        </div>
      </aside>

      <main className="relative flex items-center justify-center p-6 sm:p-10 xl:p-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(5,54,71,0.06) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />

        <form
          onSubmit={onSubmit}
          className="relative w-full max-w-[400px] space-y-8 animate-[login-fade_0.6s_ease-out]"
        >
          <div className="lg:hidden flex flex-col items-center text-center gap-3">
            <img
              src="/brand/zone-connection-logo.png"
              alt="Zone Connection"
              className="h-24 w-auto max-w-[280px] rounded-none object-contain"
            />
            <div>
              <div className="text-xl font-semibold text-foreground leading-tight">
                Zone{" "}
                <span className="text-brand-accent">Connection</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Plataforma imobiliária
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Bem-vindo de volta
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Entre com seu acesso para abrir o painel da imobiliária.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground/80">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-field h-11 rounded-full shadow-sm focus-visible:ring-brand-accent/40"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground/80">
                  Senha
                </Label>
                <button
                  type="button"
                  className="text-xs font-semibold text-brand-accent hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-field h-11 pr-11 rounded-full shadow-sm focus-visible:ring-brand-accent/40"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0.5 top-0.5 h-10 w-10 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <Checkbox id="remember" defaultChecked />
              <Label
                htmlFor="remember"
                className="text-sm font-normal cursor-pointer text-muted-foreground"
              >
                Lembrar acesso neste dispositivo
              </Label>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-shadow"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4 mr-2" />
            )}
            Entrar no painel
          </Button>

          {SHOW_DEMO_ACCOUNTS && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                Contas demo
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid gap-2">
                {DEMO.map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => {
                      setEmail(d.email);
                      setPassword(d.password);
                    }}
                    className={cn(
                      "group w-full rounded-2xl border bg-card px-3.5 py-3 text-left transition-all",
                      "hover:border-brand-accent/40 hover:bg-accent hover:shadow-sm",
                      email === d.email &&
                        "border-brand-accent/50 bg-accent ring-1 ring-brand-accent/20",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {d.role}
                      </span>
                      <span className="text-[11px] text-muted-foreground group-hover:text-brand-accent transition-colors">
                        usar →
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {d.hint} · {d.email}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </main>

      <style>{`
        @keyframes login-fade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes login-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-18px); }
        }
      `}</style>
    </div>
  );
}
