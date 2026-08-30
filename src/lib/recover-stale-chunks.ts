const RELOAD_KEY = "crm_stale_chunk_reload_at";
const RELOAD_COOLDOWN_MS = 15_000;

function reloadOnce() {
  if (typeof window === "undefined") return;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // sessionStorage bloqueado — recarrega mesmo assim
  }
  window.location.reload();
}

function isStaleAssetUrl(url: string) {
  return /\/assets\/.+\.(js|css)(\?|$)/i.test(url);
}

/**
 * Após um deploy, o HTML antigo ainda pede chunks com hash velho.
 * O Vercel devolve 404 em HTML (MIME text/html) e a tela fica branca.
 */
export function recoverStaleChunks() {
  if (typeof window === "undefined") return;

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    reloadOnce();
  });

  window.addEventListener(
    "error",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLScriptElement)) return;
      const src = target.src || "";
      if (isStaleAssetUrl(src)) reloadOnce();
    },
    true,
  );

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      typeof reason === "string"
        ? reason
        : reason instanceof Error
          ? reason.message
          : "";
    if (
      /Failed to fetch dynamically imported module|error loading dynamically imported module|MIME/i.test(
        message,
      )
    ) {
      reloadOnce();
    }
  });
}
