import { apiFetch } from "@/lib/api";

export type GoogleCalendarStatus = {
  configured: boolean;
  connected: boolean;
  googleEmail: string | null;
};

export function fetchGoogleCalendarStatus() {
  return apiFetch<GoogleCalendarStatus>("/integrations/google/status");
}

export function googleCalendarConnectHref() {
  const origin = encodeURIComponent(window.location.origin);
  return `/api/integrations/google/connect?returnOrigin=${origin}`;
}

export function disconnectGoogleCalendar() {
  return apiFetch<{ ok: boolean }>("/integrations/google/disconnect", {
    method: "POST",
  });
}
