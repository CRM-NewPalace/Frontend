import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { GA_MEASUREMENT_ID, pageview } from "@/lib/analytics";

/**
 * Dispara page_view no GA4 a cada navegação SPA (TanStack Router).
 * O script gtag.js é carregado no shell HTML (__root).
 */
export function GoogleAnalytics() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.searchStr });

  useEffect(() => {
    pageview(`${pathname}${search}`);
  }, [pathname, search]);

  return null;
}

export function GoogleAnalyticsScripts() {
  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');
`.trim(),
        }}
      />
    </>
  );
}
