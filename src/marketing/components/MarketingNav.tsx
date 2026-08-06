import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/env";
import { Logo } from "./Logo";

const navLinkClass =
  "inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium text-brand-dark/80 transition-colors hover:bg-surface-muted hover:text-brand-dark";

const ctaClass =
  "inline-flex items-center justify-center rounded-full bg-brand-dark px-4 py-2.5 text-sm font-medium whitespace-nowrap text-white transition-all hover:-translate-y-px hover:bg-brand-dark/90";

const loginClass =
  "inline-flex items-center justify-center rounded-full px-3.5 py-2.5 text-sm font-medium text-brand-dark/80 transition-colors hover:bg-surface-muted hover:text-brand-dark";

const CONTACT_WHATSAPP_MSG = "Olá! Gostaria de falar com a Zone Connection.";

export function MarketingNav() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) setIsOpen(false);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function closeMobile() {
    setIsOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-sm">
      <nav
        className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-3 lg:px-12"
        aria-label="Navegação principal"
      >
        <Link to="/" onClick={closeMobile} className="shrink-0">
          <span className="block sm:hidden">
            <Logo size="sm" />
          </span>
          <span className="hidden sm:block">
            <Logo size="md" />
          </span>
        </Link>

        <div className="hidden items-center justify-center gap-1 lg:flex">
          <Link to="/" className={navLinkClass}>
            Sobre
          </Link>
          <Link to="/produtos/crm-imobiliario" className={navLinkClass}>
            Produtos
          </Link>
          <Link to="/demonstracao" className={navLinkClass}>
            Ver demonstração
          </Link>
        </div>

        <div className="hidden items-center gap-1.5 lg:flex">
          <Link to="/login" className={loginClass}>
            Login
          </Link>
          <a
            href={getWhatsAppUrl(CONTACT_WHATSAPP_MSG)}
            target="_blank"
            rel="noopener noreferrer"
            className={ctaClass}
          >
            Fale conosco
          </a>
        </div>

        <button
          type="button"
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg text-brand-dark transition-colors hover:bg-surface-muted lg:hidden"
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
          aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="mobile-menu"
            className="overflow-hidden border-t border-border lg:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              <Link
                to="/"
                className="px-1 py-3 text-sm font-medium text-brand-dark/80 hover:text-brand-dark"
                onClick={closeMobile}
              >
                Sobre
              </Link>
              <Link
                to="/produtos/crm-imobiliario"
                className="px-1 py-3 text-sm font-medium text-brand-dark/80 hover:text-brand-dark"
                onClick={closeMobile}
              >
                Produtos
              </Link>
              <Link
                to="/demonstracao"
                className="px-1 py-3 text-sm font-medium text-brand-dark/80 hover:text-brand-dark"
                onClick={closeMobile}
              >
                Ver demonstração
              </Link>

              <div className="mt-3 flex flex-col gap-3 border-t border-border pt-4">
                <Link to="/login" className={loginClass} onClick={closeMobile}>
                  Login
                </Link>
                <a
                  href={getWhatsAppUrl(CONTACT_WHATSAPP_MSG)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={ctaClass}
                  onClick={closeMobile}
                >
                  Fale conosco
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
