import { apiFetch } from "@/lib/api";

export type MetaOAuthStatus = {
  configured: boolean;
  connected: boolean;
  pageName: string | null;
  pageId: string | null;
  adAccountName: string | null;
};

export type MetaOAuthAssets = {
  pages: Array<{ id: string; name: string }>;
  adAccounts: Array<{ id: string; name: string }>;
};

export function fetchMetaOAuthStatus() {
  return apiFetch<MetaOAuthStatus>("/integrations/meta/status");
}

export function fetchMetaOAuthAssets() {
  return apiFetch<MetaOAuthAssets>("/integrations/meta/assets");
}

export function completeMetaOAuth(input: {
  pageId: string;
  adAccountId?: string;
}) {
  return apiFetch<MetaOAuthStatus>("/integrations/meta/complete", {
    method: "POST",
    body: input,
  });
}

export function disconnectMetaOAuth() {
  return apiFetch<{ ok: boolean }>("/integrations/meta/disconnect", {
    method: "POST",
  });
}

export function metaOAuthConnectHref() {
  const origin = encodeURIComponent(window.location.origin);
  return `/api/integrations/meta/connect?returnOrigin=${origin}`;
}
