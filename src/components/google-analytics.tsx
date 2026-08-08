import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { getCookieConsent, pageview } from "@/lib/analytics";

/**
 * Dispara page_view no GA4 a cada navegação SPA, somente com consentimento.
 * O script gtag.js é carregado sob demanda (cookie banner).
 */
export function GoogleAnalytics() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.searchStr });

  useEffect(() => {
    if (getCookieConsent() !== "accepted") return;
    pageview(`${pathname}${search}`);
  }, [pathname, search]);

  return null;
}
