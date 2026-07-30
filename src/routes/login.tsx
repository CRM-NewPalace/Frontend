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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  // SSR ativo: evita mismatch Suspense (servidor) vs página (cliente) no React 19.
  head: () => ({
    meta: [
      { title: "Entrar — New Palace" },
      {
        name: "description",
        content:
          "Acesse o CRM New Palace para gerenciar leads, funil, imóveis e corretores.",
      },
      { property: "og:title", content: "Entrar — New Palace" },
      {
        property: "og:description",
        content: "Acesse o CRM da Imobiliária New Palace.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap",
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
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível entrar",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen grid lg:grid-cols-2 bg-[#faf8f2]"
      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
    >
      {/* Painel dourado New Palace */}
      <aside className="hidden lg:flex relative flex-col justify-between overflow-hidden text-white p-10 xl:p-14 bg-[linear-gradient(155deg,#6B5018_0%,#C9A227_42%,#8B6914_100%)]">
        {/* Atmosfera */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-16 w-[28rem] h-[28rem] rounded-full bg-white/10 blur-3xl animate-[login-float_8s_ease-in-out_infinite]" />
          <div className="absolute bottom-10 -right-20 w-[22rem] h-[22rem] rounded-full bg-amber-950/35 blur-3xl animate-[login-float_10s_ease-in-out_infinite_reverse]" />
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage:
                "radial-gradient(ellipse at 30% 20%, black 20%, transparent 70%)",
            }}
          />
          {/* Skyline sutil */}
          <svg
            className="absolute bottom-0 left-0 right-0 h-40 opacity-20"
            viewBox="0 0 800 160"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              fill="currentColor"
              d="M0 160V98h40V60h28v38h36V40h44v58h32V72h50v88H0zm280 0V70h36V48h24v22h40V88h28v72H280zm170 0V55h48v25h36V40h52v35h40v85H450zm220 0V82h34V50h40v32h46V66h38v94H670z"
            />
          </svg>
        </div>

        <div className="relative z-10 animate-[login-fade_0.7s_ease-out]">
          <img
            src="/logo.png"
            alt="Imobiliária New Palace"
            className="h-16 w-auto max-w-[220px] rounded-lg object-contain drop-shadow-md"
          />
        </div>

        <div className="relative z-10 max-w-lg space-y-8 animate-[login-fade_0.9s_ease-out]">
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">
              New Palace · Operação comercial
            </p>
            <h1
              className="text-4xl xl:text-5xl font-semibold leading-[1.12] tracking-tight"
              style={{ fontFamily: '"Fraunces", Georgia, serif' }}
            >
              O ritmo da imobiliária, num só painel.
            </h1>
            <p className="text-base text-white/85 leading-relaxed max-w-md">
              Leads, funil, visitas e financeiro conectados — para a equipe
              vender com clareza e a gestão acompanhar de perto.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              { icon: Users, label: "Leads em tempo real" },
              { icon: Kanban, label: "Funil visual" },
              { icon: Building2, label: "Imóveis New Palace" },
            ].map((item) => (
              <div
                key={item.label}
                className="inline-flex items-center gap-2 rounded-full bg-white/12 backdrop-blur-sm px-3.5 py-2 text-sm text-white/95 ring-1 ring-white/15"
              >
                <item.icon className="w-3.5 h-3.5 opacity-90" />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-end justify-between gap-4 animate-[login-fade_1.1s_ease-out]">
          <p className="text-xs text-white/60">© 2026 New Palace</p>
          <div className="hidden xl:flex items-center gap-2 text-xs text-white/70">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-200 animate-pulse" />
            Ambiente de demonstração
          </div>
        </div>
      </aside>

      {/* Formulário branco */}
      <main className="relative flex items-center justify-center p-6 sm:p-10 xl:p-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(160,120,30,0.08) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />

        <form
          onSubmit={onSubmit}
          className="relative w-full max-w-[400px] space-y-8 animate-[login-fade_0.6s_ease-out]"
        >
          <div className="lg:hidden flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="New Palace"
              className="h-9 w-auto max-w-[140px] rounded-md object-contain"
            />
            <div>
              <div className="font-semibold text-foreground leading-tight">
                New Palace
              </div>
              <div className="text-[11px] text-muted-foreground">
                Gestão Imobiliária
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h2
              className="text-3xl font-semibold tracking-tight text-foreground"
              style={{ fontFamily: '"Fraunces", Georgia, serif' }}
            >
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
                className="h-11 bg-white border-border/80 shadow-sm focus-visible:ring-primary/30"
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
                  className="text-xs font-medium text-primary hover:underline"
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
                  className="h-11 pr-11 bg-white border-border/80 shadow-sm focus-visible:ring-primary/30"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0.5 top-0.5 h-10 w-10 text-muted-foreground hover:text-foreground"
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
            className="w-full h-11 text-sm font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-shadow"
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
                      "group w-full rounded-xl border bg-white px-3.5 py-3 text-left transition-all",
                      "hover:border-primary/40 hover:bg-primary/3 hover:shadow-sm",
                      email === d.email &&
                        "border-primary/50 bg-primary/4 ring-1 ring-primary/20",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {d.role}
                      </span>
                      <span className="text-[11px] text-muted-foreground group-hover:text-primary transition-colors">
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
