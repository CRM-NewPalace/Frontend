import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

const FOOTER_LINKS = [
  { label: "Módulos", kind: "anchor", href: "#modulos" },
  { label: "Planos", kind: "anchor", href: "#planos" },
  { label: "Contato", kind: "anchor", href: "#contato" },
  { label: "Entrar", kind: "route", to: "/login" },
] as const;

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 lg:px-12 lg:py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-3">
            <Logo size="sm" />
            <p className="max-w-xs text-sm text-text-muted">
              Tudo em uma só conexão para a gestão da sua imobiliária.
            </p>
          </div>

          <nav
            className="flex flex-wrap gap-x-6 gap-y-2"
            aria-label="Links do rodapé"
          >
            {FOOTER_LINKS.map((link) =>
              link.kind === "route" ? (
                <Link
                  key={link.label}
                  to={link.to}
                  className="text-sm text-text-muted transition-colors hover:text-brand-dark"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-text-muted transition-colors hover:text-brand-dark"
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>
        </div>

        <div className="border-t border-border pt-6">
          <p className="text-xs text-text-muted sm:text-sm">
            © {year} Zone Connection. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
