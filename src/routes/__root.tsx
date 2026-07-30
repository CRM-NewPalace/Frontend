import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { initTheme } from "../lib/theme";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado. Tente novamente ou volte para o início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => {
    const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
    let apiOrigin = "";
    try {
      if (apiUrl && /^https?:\/\//i.test(apiUrl)) {
        apiOrigin = new URL(apiUrl).origin;
      }
    } catch {
      // ignore invalid VITE_API_URL
    }

    const connectSrc = [
      "'self'",
      "http://127.0.0.1:3333",
      "http://localhost:3333",
      "https://backend-wbxw.onrender.com",
      ...(apiOrigin ? [apiOrigin] : []),
      "ws://localhost:8080",
      "ws://127.0.0.1:8080",
      "wss:",
    ].join(" ");

    return {
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico?v=10", sizes: "any" },
      { rel: "icon", href: "/favicon-32.png?v=10", type: "image/png", sizes: "32x32" },
      { rel: "apple-touch-icon", href: "/favicon-48.png?v=10", sizes: "48x48" },
    ],
    // CSP do frontend: bloqueia scripts/iframes de terceiros (mitigação XSS).
    // 'unsafe-inline' no script-src só cobre o bootstrap de tema acima — sem eval.
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "New Palace — Gestão Imobiliária" },
      {
        name: "description",
        content:
          "CRM da Imobiliária New Palace: gestão de leads, funil de vendas, corretores, imóveis e propostas.",
      },
      { name: "author", content: "New Palace" },
      { property: "og:title", content: "New Palace — Gestão Imobiliária" },
      {
        property: "og:description",
        content:
          "Plataforma completa para imobiliárias gerenciarem leads, funil e vendas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        // frame-ancestors NÃO funciona em <meta> — só em header HTTP (ver server.ts).
        httpEquiv: "Content-Security-Policy",
        content: [
          "default-src 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "form-action 'self'",
          "img-src 'self' data: blob:",
          "font-src 'self' https://fonts.gstatic.com data:",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "script-src 'self' 'unsafe-inline'",
          `connect-src ${connectSrc}`,
        ].join("; "),
      },
    ],
  };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: o script inline de tema abaixo pode adicionar
    // class="dark" e style.colorScheme antes do React hidratar — mismatch esperado.
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
        <link rel="icon" href="/favicon.ico?v=10" sizes="any" />
        <link rel="icon" type="image/png" href="/favicon-32.png?v=10" sizes="32x32" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("crm_theme");if(t==="dark"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark"}else{document.documentElement.style.colorScheme="light"}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    initTheme();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
