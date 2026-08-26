// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig as defineLovableConfig } from "@lovable.dev/vite-tanstack-config";
import type { ConfigEnv, Plugin, PluginOption, UserConfig } from "vite";

/** Host da API sem sufixo /api — o browser já chama /api/... e o proxy mantém esse path. */
function apiProxyTarget() {
  const raw =
    process.env.API_PROXY_TARGET ??
    "http://api-staging-zoneconnection.179.198.111.97.sslip.io";
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
      open: true,
      // Proxy evita CORS e o atraso ~3s do Windows (localhost → IPv6 timeout → IPv4).
      // O browser fala com a mesma origem; o Vite encaminha para o Nest.
      // API_PROXY_TARGET = origem do backend (sem /api no final).
      proxy: {
        "/api": {
          target: apiProxyTarget(),
          changeOrigin: true,
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
    plugins: withoutTsconfigPathsPlugin(config.plugins),
  };
}
