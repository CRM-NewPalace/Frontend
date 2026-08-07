import { Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { getWhatsAppUrl } from "@/lib/env";
import { HOME_ANCHORS } from "@/marketing/home/routes";
import { Logo } from "./Logo";

const INSTAGRAM_URL = "https://www.instagram.com/zone.connection/";

const socialIconClass =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-brand-dark/80 transition-colors hover:border-brand-dark/20 hover:bg-surface-muted hover:text-brand-dark";

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-0 border-t border-border bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 lg:px-12 lg:py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-4">
            <Logo size="sm" />
            <p className="max-w-xs text-sm text-text-muted">
              Tecnologia para o mercado imobiliário — um ecossistema de soluções
              conectadas.
            </p>
            <div className="flex items-center gap-2">
              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className={socialIconClass}
                aria-label="WhatsApp"
              >
                <FaWhatsapp className="h-5 w-5" />
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={socialIconClass}
                aria-label="Instagram"
              >
                <Instagram size={18} strokeWidth={1.75} />
              </a>
            </div>
          </div>

          <nav
            className="flex flex-wrap gap-x-6 gap-y-2"
            aria-label="Links do rodapé"
          >
            <Link
              to="/"
              className="text-sm text-text-muted transition-colors hover:text-brand-dark"
            >
              Sobre
            </Link>
            <Link
              to="/produtos/crm-imobiliario"
              className="text-sm text-text-muted transition-colors hover:text-brand-dark"
            >
              Produtos
            </Link>
            <a
              href={HOME_ANCHORS.solutions}
              className="text-sm text-text-muted transition-colors hover:text-brand-dark"
            >
              Soluções
            </a>
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-text-muted transition-colors hover:text-brand-dark"
            >
              Contato
            </a>
            <Link
              to="/login"
              className="text-sm text-text-muted transition-colors hover:text-brand-dark"
            >
              Entrar
            </Link>
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
