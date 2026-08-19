/** Nome canônico da marca em titles e schema. */
export const SITE_NAME = "Zone Connection";

/** Imagem padrão para Open Graph / Twitter ao compartilhar o link. */
export const DEFAULT_OG_IMAGE = "/logoZoneConnection.png";
export const DEFAULT_OG_IMAGE_WIDTH = "1029";
export const DEFAULT_OG_IMAGE_HEIGHT = "711";

/**
 * URL pública do site. Defina `VITE_SITE_URL` em produção
 * (ex.: https://zoneconnection.com.br).
 */
export function getSiteUrl(): string {
  const fromEnv = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://zoneconnection.com.br";
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = getSiteUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

type MarketingHeadOptions = {
  title: string;
  description: string;
  path: string;
  image?: string;
  /** Demo ou páginas utilitárias podem optar por noindex. */
  noIndex?: boolean;
};

/**
 * Head SEO completo para páginas de marketing (meta + canonical + OG/Twitter).
 */
export function marketingHead({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  noIndex = false,
}: MarketingHeadOptions) {
  const url = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);

  return {
    meta: [
      { title },
      { name: "description", content: description },
      {
        name: "robots",
        content: noIndex ? "noindex, follow" : "index, follow",
      },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { property: "og:image", content: imageUrl },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: DEFAULT_OG_IMAGE_WIDTH },
      { property: "og:image:height", content: DEFAULT_OG_IMAGE_HEIGHT },
      { property: "og:image:alt", content: SITE_NAME },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:site_name", content: SITE_NAME },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: imageUrl },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: getSiteUrl(),
    logo: absoluteUrl("/brand/zone-connection-logo.png"),
    sameAs: ["https://www.instagram.com/zone.connection/"],
    description:
      "Ecossistema de tecnologia para imobiliárias: CRM, IA para WhatsApp e sites/landing pages.",
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: getSiteUrl(),
    inLanguage: "pt-BR",
    publisher: { "@type": "Organization", name: SITE_NAME },
  };
}

export function softwareApplicationJsonLd(input: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: input.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: input.description,
    url: absoluteUrl(input.path),
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: getSiteUrl(),
    },
  };
}

export function serviceJsonLd(input: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: getSiteUrl(),
    },
    areaServed: "BR",
  };
}
