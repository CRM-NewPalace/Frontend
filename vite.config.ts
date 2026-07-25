// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    server: {
      // Proxy evita CORS e o atraso ~3s do Windows (localhost → IPv6 timeout → IPv4).
      // O browser fala com a mesma origem; o Vite encaminha para o Nest.
      // API_PROXY_TARGET aponta para a API hospedada (ex.: https://x.onrender.com).
      proxy: {
        "/api": {
          target: process.env.API_PROXY_TARGET ?? "http://127.0.0.1:3333",
          changeOrigin: true,
        },
      },
    },
  },
});
