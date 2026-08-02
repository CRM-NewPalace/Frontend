import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { HiBars3, HiXMark } from "react-icons/hi2";
import { getWhatsAppUrl } from "@/lib/env";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

const linkClass =
  "text-sm font-medium text-brand-dark transition-colors hover:text-brand-accent";

function NavLink({
  label,
  to,
  href,
  external,
  className,
  onClick,
}: {
  label: string;
  to?: string;
  href?: string;
  external?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  if (to) {
    return (
      <Link to={to} onClick={onClick} className={cn(linkClass, className)}>
        {label}
      </Link>
    );
  }

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onClick={onClick}
      className={cn(linkClass, className)}
    >
      {label}
    </a>
  );
}

export function MarketingNav() {
  const [isOpen, setIsOpen] = useState(false);
  const navLinks = [
    { label: "Fale Conosco", href: getWhatsAppUrl(), external: true },
    { label: "Login", to: "/login" },
  ] as const;

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) setIsOpen(false);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-sm">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 lg:px-12"
        aria-label="Navegação principal"
      >
        <Link
          to="/"
          search={{ site: "1" }}
          onClick={() => setIsOpen(false)}
          className="shrink-0"
        >
          <span className="block sm:hidden">
            <Logo size="sm" />
          </span>
          <span className="hidden sm:block">
            <Logo size="md" />
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-3 md:flex">
          <NavLink {...navLinks[0]} />
          <span className="text-text-muted" aria-hidden>
            |
          </span>
          <NavLink {...navLinks[1]} />
        </div>

        {/* Hamburger */}
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-brand-dark transition-colors hover:bg-brand-dark/5 md:hidden"
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
          aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? (
            <HiXMark className="h-6 w-6" />
          ) : (
            <HiBars3 className="h-6 w-6" />
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-t border-border md:hidden"
          >
            <div className="flex flex-col gap-3 px-6 py-4">
              <NavLink {...navLinks[0]} onClick={() => setIsOpen(false)} />
              <NavLink {...navLinks[1]} onClick={() => setIsOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
