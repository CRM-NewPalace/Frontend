// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import http from "node:http";
import https from "node:https";
import { defineConfig as defineLovableConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv, type ConfigEnv, type Plugin, type PluginOption, type UserConfig } from "vite";

/** Staging hospedado — padrão para a equipe (não precisa subir o Nest local). */
const STAGING_API =
  "http://api-staging-zoneconnection.179.198.111.97.sslip.io";

function usesLocalNest() {
  const flag = process.env.USE_LOCAL_NEST?.trim().toLowerCase();
  return flag === "1" || flag === "true";
}

/** Origem do Nest. Local só com USE_LOCAL_NEST=true — senão :3333 morto vira 502. */
function apiProxyTarget(mode: string) {
  if (!usesLocalNest()) return STAGING_API;
  const fileEnv = loadEnv(mode, process.cwd(), "");
  const raw =
    process.env.API_PROXY_TARGET ||
    fileEnv.API_PROXY_TARGET ||
    "http://127.0.0.1:3333";
  return raw.replace(/\/api\/?$/, "");
}

const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function flattenSetCookie(value: string | string[] | number | undefined) {
  if (value == null) return [];
  return (Array.isArray(value) ? value : [String(value)]).filter(Boolean);
}

function relaxCookieForLocalHttp(cookie: string) {
  return cookie
    .replace(/;\s*Secure/gi, "")
    .replace(/;\s*Partitioned/gi, "")
    .replace(/;\s*SameSite=None/gi, "; SameSite=Lax");
}

/** Proxy IPv4 na frente do TanStack/Lovable — o proxy nativo do Vite falhava em ~5ms. */
function hostedApiProxyPlugin(mode: string): Plugin {
  const origin = apiProxyTarget(mode);
  return {
    name: "crm-hosted-api-proxy",
    enforce: "pre",
    configureServer(server) {
      const target = new URL(origin);
      const transport = target.protocol === "https:" ? https : http;
      const port =
        Number(target.port) || (target.protocol === "https:" ? 443 : 80);
      server.config.logger.info(`[vite] /api → ${origin} (IPv4)`);
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/api")) {
          next();
          return;
        }
        const headers: http.OutgoingHttpHeaders = {};
        for (const [key, value] of Object.entries(req.headers)) {
          if (value === undefined) continue;
          if (HOP_BY_HOP.has(key.toLowerCase())) continue;
          headers[key] = value;
        }
        headers.host = target.host;
        const up = transport.request(
          {
            hostname: target.hostname,
            port,
            path: url,
            method: req.method,
            headers,
            family: 4,
          },
          (upRes) => {
            res.statusCode = upRes.statusCode ?? 502;
            for (const [key, value] of Object.entries(upRes.headers)) {
              if (value === undefined) continue;
              const lower = key.toLowerCase();
              if (HOP_BY_HOP.has(lower) || lower === "set-cookie") continue;
              res.setHeader(key, value);
            }
            // Staging manda Secure (FRONTEND_URL https). Em http://127.0.0.1 o
            // Firefox descarta o cookie → login “funciona” e a app não carrega.
            const cookies = flattenSetCookie(upRes.headers["set-cookie"]);
            if (cookies.length > 0) {
              res.setHeader("set-cookie", cookies.map(relaxCookieForLocalHttp));
            }
            upRes.pipe(res);
          },
        );
        up.on("error", (err) => {
          server.config.logger.error(
            `[vite] /api → ${origin} falhou: ${err.message}`,
          );
          if (!res.headersSent) {
            res.statusCode = 502;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ message: `API indisponível (${origin}).` }));
          } else {
            res.destroy(err);
          }
        });
        req.pipe(up);
      });
    },
  };
}

function flattenPlugins(plugins: PluginOption[] | undefined): PluginOption[] {
  const out: PluginOption[] = [];
  for (const plugin of plugins ?? []) {
    if (plugin == null || plugin === false) continue;
    if (Array.isArray(plugin)) {
      out.push(...flattenPlugins(plugin));
      continue;
    }
    out.push(plugin);
  }
  return out;
}

/** Vite 8 resolve paths natively; Lovable ainda injeta vite-tsconfig-paths (aviso no terminal). */
function withoutTsconfigPathsPlugin(
  plugins: PluginOption[] | undefined,
): PluginOption[] {
  return flattenPlugins(plugins).filter((plugin) => {
    if (!plugin || typeof plugin !== "object" || !("name" in plugin)) {
      return true;
    }
    return (plugin as Plugin).name !== "vite-tsconfig-paths";
  });
}

const lovableConfig = defineLovableConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // Vite 8 default = lightningcss; ele não entende @utility/@theme do Tailwind v4
    // (ex.: tw-animate-css) e spamma "Unknown at rule" no terminal.
    css: {
      transformer: "postcss",
    },
    // CJS → ESM: sem prebundle o Vite serve o shim cru e quebra named export.
    optimizeDeps: {
      include: ["use-sync-external-store/shim/with-selector"],
    },
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      host: "127.0.0.1",
      port: 8080,
      open: true,
      // Proxy evita CORS. Timeout evita a aba ficar em “Esperando localhost…”
      // se o staging não responder. host 127.0.0.1 evita o atraso de IPv6 no Windows.
      proxy: {
        "/api": {
          target: STAGING_API,
          changeOrigin: true,
          timeout: 15_000,
          proxyTimeout: 15_000,
        },
      },
    },
  },
});

export default async function defineConfig(
  env: ConfigEnv,
): Promise<UserConfig> {
  const config = await lovableConfig(env);
  return {
    ...config,
    resolve: {
      ...config.resolve,
      tsconfigPaths: true,
    },
    server: {
      ...config.server,
      host: "127.0.0.1",
      port: 8080,
      proxy: {
        "/api": {
          target: apiProxyTarget(env.mode),
          changeOrigin: true,
          timeout: 15_000,
          proxyTimeout: 15_000,
        },
      },
    },
    plugins: [
      hostedApiProxyPlugin(env.mode),
      ...withoutTsconfigPathsPlugin(config.plugins),
    ],
  };
}
