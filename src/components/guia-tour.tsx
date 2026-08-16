import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouterState } from "@tanstack/react-router";
import { GraduationCap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  peekGuiaTourId,
  peekGuiaTourLive,
  resolveGuiaTour,
  stopGuiaTour,
  type GuiaTourStep,
} from "@/lib/guia-tour";
import { cn } from "@/lib/utils";

type Spotlight = { top: number; left: number; width: number; height: number };

function readSpotlight(selector?: string, scroll = false): Spotlight | null {
  if (!selector || typeof document === "undefined") return null;
  const el = document.querySelector(selector);
  if (!(el instanceof HTMLElement)) return null;
  if (scroll) {
    el.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  }
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 && rect.height < 2) return null;
  const pad = 8;
  return {
    top: Math.max(8, rect.top - pad),
    left: Math.max(8, rect.left - pad),
    width: Math.min(window.innerWidth - 16, rect.width + pad * 2),
    height: Math.min(window.innerHeight - 16, rect.height + pad * 2),
  };
}

function cardStyleFor(spot: Spotlight | null) {
  if (!spot || typeof window === "undefined") return undefined;
  const cardW = 352;
  const cardH = 230;
  const gap = 12;
  const left = Math.min(
    window.innerWidth - cardW - 16,
    Math.max(16, spot.left),
  );
  const below = spot.top + spot.height + gap;
  const top =
    below + cardH < window.innerHeight - 16
      ? below
      : Math.max(16, spot.top - cardH - gap);
  return { top, left, width: cardW };
}

export function GuiaTourHost() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [, setTick] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [spot, setSpot] = useState<Spotlight | null>(null);
  const [ready, setReady] = useState(false);

  const tour = resolveGuiaTour(pathname, peekGuiaTourId());
  const steps = tour?.steps ?? [];
  const step: GuiaTourStep | undefined = steps[stepIndex];
  const active = Boolean(tour && step && ready);

  const bump = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    const onStart = () => {
      setStepIndex(0);
      bump();
    };
    const onStop = () => {
      setStepIndex(0);
      setSpot(null);
      bump();
    };
    window.addEventListener("guia-tour-start", onStart);
    window.addEventListener("guia-tour-stop", onStop);
    return () => {
      window.removeEventListener("guia-tour-start", onStart);
      window.removeEventListener("guia-tour-stop", onStop);
    };
  }, [bump]);

  useEffect(() => {
    setStepIndex(0);
    setReady(false);
    const id = window.setTimeout(() => {
      bump();
      setReady(true);
    }, 380);
    return () => window.clearTimeout(id);
  }, [pathname, bump]);

  useEffect(() => {
    if (!peekGuiaTourLive()) return;
    if (pathname === "/guia-sistema" || pathname.startsWith("/guia-sistema/")) {
      return;
    }
    const id = window.setTimeout(() => {
      if (!resolveGuiaTour(pathname, peekGuiaTourId())) stopGuiaTour();
    }, 700);
    return () => window.clearTimeout(id);
  }, [pathname]);

  useEffect(() => {
    if (!active) return;
    setSpot(readSpotlight(step?.selector, true));
    const onWin = () => setSpot(readSpotlight(step?.selector, false));
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    const id = window.setInterval(
      () => setSpot(readSpotlight(step?.selector, false)),
      600,
    );
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
      window.clearInterval(id);
    };
  }, [active, step?.selector, stepIndex]);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") stopGuiaTour();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  if (!active || !step || !tour || typeof document === "undefined") return null;

  const last = stepIndex >= steps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <div
        className={cn(
          "absolute inset-0",
          spot ? "bg-transparent" : "bg-black/55",
        )}
      />
      {spot ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-brand-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.58)]"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
          }}
        />
      ) : null}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guia-tour-title"
        className={cn(
          "absolute w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 shadow-xl",
          spot ? "" : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        )}
        style={spot ? cardStyleFor(spot) : undefined}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-accent">
              Tutorial · {tour.topic.title} · {stepIndex + 1}/{steps.length}
            </p>
            <h3
              id="guia-tour-title"
              className="text-base font-semibold tracking-tight"
            >
              {step.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => stopGuiaTour()}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Fechar tutorial"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {step.body}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => stopGuiaTour()}
          >
            Pular
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            >
              Voltar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (last) {
                  stopGuiaTour();
                  return;
                }
                setStepIndex((i) => i + 1);
              }}
            >
              {last ? "Concluir" : "Próximo"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function GuiaTourStartButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" size="sm" variant="outline" onClick={onClick}>
      <GraduationCap className="h-3.5 w-3.5" />
      Ensinar a usar
    </Button>
  );
}
