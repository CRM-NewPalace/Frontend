import type { ReactNode } from "react";
import {
  HiArrowTopRightOnSquare,
  HiLink,
  HiPhone,
  HiPhoto,
  HiShare,
} from "react-icons/hi2";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";

function PhoneShell({
  children,
  large = false,
}: {
  children: ReactNode;
  large?: boolean;
}) {
  return (
    <div
      className={
        large
          ? "mx-auto w-full max-w-72 overflow-hidden rounded-[1.75rem] border border-border bg-white shadow-md sm:max-w-80"
          : "mx-auto w-full max-w-50 overflow-hidden rounded-[1.35rem] border border-border bg-white shadow-sm"
      }
      aria-hidden
    >
      <div className="flex items-center justify-center bg-surface-muted px-3 py-1.5">
        <span className="h-1 w-10 rounded-full bg-brand-dark/15" />
      </div>
      {children}
    </div>
  );
}

type MockupProps = { large?: boolean };

export function InstagramBioMockup({ large = false }: MockupProps) {
  return (
    <PhoneShell large={large}>
      <div className="space-y-3 px-3 pb-4 pt-3 sm:px-4 sm:pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-br from-brand-accent/30 to-brand-dark/20 ring-2 ring-brand-accent/30 sm:h-14 sm:w-14">
            <FaInstagram className="h-5 w-5 text-brand-dark sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-brand-dark sm:text-sm">
              ana.corretora
            </p>
            <div className="mt-1 flex gap-2 text-[10px] text-text-muted sm:text-xs">
              <span>
                <strong className="text-brand-dark">128</strong> posts
              </span>
              <span>
                <strong className="text-brand-dark">2,4 mil</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-brand-dark sm:text-sm">
            Ana Souza · Creci 12345
          </p>
          <p className="text-[10px] leading-snug text-text-muted sm:text-xs">
            Corretora de imóveis · Zona Sul
          </p>
          <p className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-accent sm:text-xs">
            <HiLink className="h-3 w-3" />
            anasouza.zone.app
          </p>
        </div>

        <div className="rounded-lg border border-dashed border-brand-accent/50 bg-brand-accent/5 px-2.5 py-2 sm:px-3 sm:py-2.5">
          <p className="text-[10px] font-medium text-brand-dark sm:text-xs">
            Link na bio
          </p>
          <p className="truncate text-[10px] text-brand-accent sm:text-xs">
            https://anasouza.zone.app
          </p>
        </div>
      </div>
    </PhoneShell>
  );
}

export function WhatsAppShareMockup({ large = false }: MockupProps) {
  return (
    <PhoneShell large={large}>
      <div className="bg-surface-muted px-2.5 pb-4 pt-2 sm:px-3 sm:pb-5">
        <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-brand-dark px-2 py-1.5 text-white sm:px-2.5 sm:py-2">
          <FaWhatsapp className="h-3.5 w-3.5 text-[#25D366] sm:h-4 sm:w-4" />
          <p className="text-[10px] font-semibold sm:text-xs">
            Status · Plantão
          </p>
        </div>

        <div className="rounded-xl rounded-tl-sm bg-white p-2.5 shadow-sm sm:p-3">
          <div className="mb-2 flex h-16 items-center justify-center rounded-lg bg-brand-accent/10 sm:h-24">
            <HiPhoto className="h-6 w-6 text-brand-accent sm:h-8 sm:w-8" />
          </div>
          <p className="text-[10px] font-semibold text-brand-dark sm:text-xs">
            Apt. 3 quartos · Boa Viagem
          </p>
          <p className="mt-0.5 text-[10px] text-text-muted sm:text-xs">
            Veja detalhes e fale comigo:
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-accent sm:text-xs">
            <HiLink className="h-3 w-3" />
            anasouza.zone.app/apto-bv
          </p>
        </div>
      </div>
    </PhoneShell>
  );
}

export function AdsPortalMockup({ large = false }: MockupProps) {
  return (
    <PhoneShell large={large}>
      <div className="space-y-2.5 px-2.5 pb-4 pt-3 sm:px-3 sm:pb-5">
        <div className="rounded-xl border border-border bg-surface-muted/70 p-2.5 sm:p-3">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-text-muted sm:text-[10px]">
            Anúncio patrocinado
          </p>
          <div className="mt-2 flex h-14 items-center justify-center rounded-lg bg-brand-accent/10 sm:h-24">
            <HiPhoto className="h-6 w-6 text-brand-accent sm:h-8 sm:w-8" />
          </div>
          <p className="mt-2 text-[10px] font-semibold text-brand-dark sm:text-xs">
            Cobertura com vista mar
          </p>
          <p className="text-[10px] text-text-muted sm:text-xs">
            A partir de R$ 890 mil
          </p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-dark px-2.5 py-1 text-[10px] font-semibold text-white sm:px-3 sm:text-xs">
            Ver página
            <HiArrowTopRightOnSquare className="h-3 w-3" />
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-brand-dark/20 px-2 py-1.5 text-center sm:py-2">
          <p className="text-[10px] text-text-muted sm:text-xs">
            Destino do clique
          </p>
          <p className="text-[10px] font-semibold text-brand-accent sm:text-xs">
            landing do corretor
          </p>
        </div>
      </div>
    </PhoneShell>
  );
}

export function DigitalCardMockup({ large = false }: MockupProps) {
  return (
    <PhoneShell large={large}>
      <div className="space-y-3 px-3 pb-4 pt-3 sm:px-4 sm:pb-5">
        <div className="rounded-2xl bg-brand-dark p-3 text-white sm:p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-semibold sm:h-12 sm:w-12 sm:text-base">
              AS
            </div>
            <div>
              <p className="text-[11px] font-semibold sm:text-sm">Ana Souza</p>
              <p className="text-[10px] text-white/70 sm:text-xs">
                Corretora de imóveis
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-1.5 text-[10px] text-white/85 sm:text-xs">
            <p className="inline-flex items-center gap-1.5">
              <HiPhone className="h-3 w-3 text-brand-accent" />
              (81) 99221-5812
            </p>
            <p className="inline-flex items-center gap-1.5">
              <HiShare className="h-3 w-3 text-brand-accent" />
              anasouza.zone.app
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-muted/60 px-2.5 py-2 text-center sm:py-2.5">
          <p className="text-[10px] text-text-muted sm:text-xs">
            Cartão digital enviado
          </p>
          <p className="text-[10px] font-semibold text-brand-dark sm:text-xs">
            Link da landing incluso
          </p>
        </div>
      </div>
    </PhoneShell>
  );
}
