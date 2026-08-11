import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  getCookieConsent,
  loadGoogleAnalytics,
  setCookieConsent,
  type CookieConsent,
} from "@/lib/analytics";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getCookieConsent();
    if (consent === "accepted") {
      loadGoogleAnalytics();
      return;
    }
    if (!consent) setVisible(true);
  }, []);

  function choose(value: CookieConsent) {
    setCookieConsent(value);
    setVisible(false);
    if (value === "accepted") {
      loadGoogleAnalytics();
    }
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Preferências de cookies"
      className="fixed inset-x-0 bottom-0 z-100 border-t border-border bg-white shadow-[0_-4px_24px_rgba(5,54,71,0.08)]"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-12 sm:py-5">
        <p className="flex-1 text-sm leading-relaxed text-text-muted">
          Usamos cookies do Google Analytics para entender o uso do site.{" "}
          <Link
            to="/privacidade"
            className="font-medium text-brand-dark underline-offset-2 hover:text-brand-accent hover:underline"
          >
            Privacidade
          </Link>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => choose("rejected")}
            className="cursor-pointer rounded-full px-4 py-2 text-sm font-medium text-brand-dark/80 transition-colors hover:bg-surface-muted hover:text-brand-dark"
          >
            Recusar
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="cursor-pointer rounded-full bg-brand-cta px-4 py-2 text-sm font-medium text-white transition-[filter] hover:brightness-110"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
