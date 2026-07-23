import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Home, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { signIn } from "@/lib/mock-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Imob CRM" },
      { name: "description", content: "Acesse o Imob CRM para gerenciar leads, funil, imóveis e corretores." },
      { property: "og:title", content: "Entrar — Imob CRM" },
      { property: "og:description", content: "Acesse o Imob CRM da sua imobiliária." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@imob.com");
  const [password, setPassword] = useState("admin");
  const [loading, setLoading] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const user = signIn(email, password);
      setLoading(false);
      if (!user) {
        toast.error("Credenciais inválidas");
        return;
      }
      toast.success(`Bem-vindo(a), ${user.name.split(" ")[0]}!`);
      navigate({ to: "/dashboard" });
    }, 400);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_left,white,transparent_50%)]" />
        <div className="relative flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold">Imob CRM</div>
            <div className="text-xs opacity-80">Gestão Imobiliária</div>
          </div>
        </div>
        <div className="relative space-y-6">
          <h2 className="text-4xl font-semibold leading-tight max-w-md">
            Gerencie leads, funil e vendas em um só lugar.
          </h2>
          <p className="opacity-90 max-w-md">
            Uma plataforma moderna para imobiliárias que querem escalar atendimento,
            acompanhar corretores e fechar mais negócios.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-6 max-w-md">
            {[
              { k: "+42%", v: "conversão" },
              { k: "2.8x", v: "produtividade" },
              { k: "-30%", v: "tempo de venda" },
            ].map((s) => (
              <div key={s.k} className="rounded-xl bg-white/10 backdrop-blur p-4">
                <div className="text-2xl font-semibold">{s.k}</div>
                <div className="text-xs opacity-80">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs opacity-70">© 2026 Imob CRM</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Home className="w-5 h-5" />
            </div>
            <span className="font-semibold">Imob CRM</span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Entrar na sua conta</h1>
            <p className="text-sm text-muted-foreground mt-1">Acesse o painel da sua imobiliária.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button type="button" className="text-xs text-primary hover:underline">Esqueci minha senha</button>
              </div>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="remember" defaultChecked />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">Lembrar acesso</Label>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Entrar
          </Button>

          <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1.5">
            <div className="font-medium text-foreground">Contas de demonstração</div>
            {[
              ["admin@imob.com", "admin", "Administrador"],
              ["gerente@imob.com", "gerente", "Gerente"],
              ["corretor@imob.com", "corretor", "Corretor"],
            ].map(([e, p, r]) => (
              <button
                key={e}
                type="button"
                onClick={() => { setEmail(e); setPassword(p); }}
                className="w-full text-left hover:text-primary transition-colors"
              >
                <span className="text-muted-foreground">{r}:</span> {e} / {p}
              </button>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}
