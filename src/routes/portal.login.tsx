import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { Building2, Loader2, Lock, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signInPortal } from "@/lib/portal-auth";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/login")({
  ssr: false,
  component: PortalLoginPage,
});

function PortalLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const me = await signInPortal(
        email,
        password,
        tenantSlug.trim() || undefined,
      );
      toast.success(`Olá, ${me.nome.split(" ")[0]}`);
      navigate({ to: "/portal" });
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Não foi possível entrar",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside
        className="relative hidden overflow-hidden px-10 py-10 text-white lg:flex lg:w-[42%] lg:flex-col"
        style={{
          background:
            "radial-gradient(circle at 28% 38%, #0b7088 0%, #053647 48%, #021923 100%)",
        }}
      >
        <div className="relative z-10 flex flex-1 flex-col justify-center">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
            <Building2 className="h-4 w-4" />
            Portal do Proprietário
          </p>
          <h1 className="mt-6 max-w-md text-3xl font-semibold leading-tight">
            Acompanhe seus imóveis com a mesma clareza da imobiliária.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            Visitas, propostas, documentação e chaves — sem acessar o CRM interno.
          </p>
        </div>
      </aside>
      <main className="flex flex-1 items-center justify-center bg-background px-4 py-12">
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="w-full max-w-md space-y-5 rounded-2xl border border-primary/15 bg-card p-8 shadow-sm"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Acompanhamento
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Entrar no portal
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Use o e-mail cadastrado pela imobiliária.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                className="pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Imobiliária (opcional)</Label>
            <Input
              id="slug"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              placeholder="identificador"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Acesso interno?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Entrar no CRM
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
