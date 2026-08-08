/** Google Analytics 4 — Measurement ID. */
export const GA_MEASUREMENT_ID =
  (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim() ||
  "G-9HHXQ8CC3V";

export const COOKIE_CONSENT_KEY = "zc_cookie_consent";

export type CookieConsent = "accepted" | "rejected";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (value === "accepted" || value === "rejected") return value;
  } catch {
    // ignore
  }
  return null;
}

export function setCookieConsent(value: CookieConsent) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, value);
  } catch {
    // ignore
  }
}

let gtagLoaded = false;

/** Carrega gtag.js apenas após consentimento. */
export function loadGoogleAnalytics() {
  if (typeof window === "undefined" || gtagLoaded) return;
  gtagLoaded = true;

  window.dataLayer = window.dataLayer || [];
  // gtag espera `arguments` (objeto Arguments), não um array rest.
  window.gtag = function gtag(..._args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

export function pageview(path: string) {
  if (typeof window === "undefined" || !window.gtag) return;
  if (getCookieConsent() !== "accepted") return;
  window.gtag("config", GA_MEASUREMENT_ID, {
    page_path: path,
  });
}
