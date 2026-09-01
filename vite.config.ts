// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig as defineLovableConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv, type ConfigEnv, type Plugin, type PluginOption, type UserConfig } from "vite";

/** Staging hospedado — padrão para a equipe (não precisa subir o Nest local). */
const STAGING_API =
  "http://api-staging-zoneconnection.179.198.111.97.sslip.io";

/** Host da API sem sufixo /api — o browser já chama /api/... e o proxy mantém esse path. */
function apiProxyTarget(mode: string) {
  const fileEnv = loadEnv(mode, process.cwd(), "");
  const raw =
    process.env.API_PROXY_TARGET ||
    fileEnv.API_PROXY_TARGET ||
    STAGING_API;
  return raw.replace(/\/api\/?$/, "");
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
    plugins: withoutTsconfigPathsPlugin(config.plugins),
  };
}
