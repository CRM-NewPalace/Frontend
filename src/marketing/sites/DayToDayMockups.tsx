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
  topBarClassName = "bg-surface-muted",
}: {
  children: ReactNode;
  large?: boolean;
  topBarClassName?: string;
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
      <div
        className={`flex items-center justify-center px-3 py-1.5 ${topBarClassName}`}
      >
        <span className="h-1 w-10 rounded-full bg-black/15" />
      </div>
      {children}
    </div>
  );
}

type MockupProps = { large?: boolean };

export function InstagramBioMockup({ large = false }: MockupProps) {
  return (
    <PhoneShell large={large} topBarClassName="bg-[#fafafa]">
      <div className="space-y-3 bg-white px-3 pb-4 pt-3 sm:px-4 sm:pb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full p-0.5 sm:h-14 sm:w-14"
            style={{
              background:
                "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
            }}
          >
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white p-0.5">
              <div
                className="flex h-full w-full items-center justify-center rounded-full text-white"
                style={{
                  background:
                    "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
                }}
              >
                <FaInstagram className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[#262626] sm:text-sm">
              ana.corretora
            </p>
            <div className="mt-1 flex gap-2 text-[10px] text-[#8e8e8e] sm:text-xs">
              <span>
                <strong className="text-[#262626]">128</strong> posts
              </span>
              <span>
                <strong className="text-[#262626]">2,4 mil</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-[#262626] sm:text-sm">
            Ana Souza · Creci 12345
          </p>
          <p className="text-[10px] leading-snug text-[#8e8e8e] sm:text-xs">
            Corretora de imóveis · Zona Sul
          </p>
          <p className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#00376b] sm:text-xs">
            <HiLink className="h-3 w-3" />
            anasouza.zone.app
          </p>
        </div>

        <div className="rounded-lg border border-[#dbdbdb] bg-[#fafafa] px-2.5 py-2 sm:px-3 sm:py-2.5">
          <div className="mb-1 flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background:
                  "linear-gradient(45deg, #f09433 0%, #dc2743 50%, #bc1888 100%)",
              }}
            />
            <p className="text-[10px] font-semibold text-[#262626] sm:text-xs">
              Link na bio
            </p>
          </div>
          <p className="truncate text-[10px] font-medium text-[#0095f6] sm:text-xs">
            https://anasouza.zone.app
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-md bg-[#efefef] py-1.5 text-center text-[10px] font-semibold text-[#262626]">
            Seguir
          </div>
          <div className="rounded-md bg-[#0095f6] py-1.5 text-center text-[10px] font-semibold text-white">
            Contato
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

export function WhatsAppShareMockup({ large = false }: MockupProps) {
  return (
    <PhoneShell large={large} topBarClassName="bg-[#075e54]">
      <div
        className="px-2.5 pb-4 pt-2 sm:px-3 sm:pb-5"
        style={{
          background:
            "linear-gradient(180deg, #ece5dd 0%, #d9fdd3 45%, #ece5dd 100%)",
        }}
      >
        <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-[#128c7e] px-2 py-1.5 text-white shadow-sm sm:px-2.5 sm:py-2">
          <FaWhatsapp className="h-3.5 w-3.5 text-[#25d366] sm:h-4 sm:w-4" />
          <p className="text-[10px] font-semibold sm:text-xs">
            Status · Plantão
          </p>
        </div>

        <div className="rounded-xl rounded-tl-sm bg-white p-2.5 shadow-sm sm:p-3">
          <div className="mb-2 flex h-16 items-center justify-center rounded-lg bg-[#dcf8c6] sm:h-24">
            <HiPhoto className="h-6 w-6 text-[#128c7e] sm:h-8 sm:w-8" />
          </div>
          <p className="text-[10px] font-semibold text-[#111b21] sm:text-xs">
            Apt. 3 quartos · Boa Viagem
          </p>
          <p className="mt-0.5 text-[10px] text-[#667781] sm:text-xs">
            Veja detalhes e fale comigo:
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-[#027eb5] sm:text-xs">
            <HiLink className="h-3 w-3" />
            anasouza.zone.app/apto-bv
          </p>
        </div>

        <div className="mt-2 ml-auto w-fit rounded-full bg-[#25d366] px-2.5 py-1 text-[10px] font-semibold text-white">
          Encaminhar
        </div>
      </div>
    </PhoneShell>
  );
}

export function AdsPortalMockup({ large = false }: MockupProps) {
  return (
    <PhoneShell large={large} topBarClassName="bg-[#e8f0fe]">
      <div className="space-y-2.5 bg-[#f8f9fa] px-2.5 pb-4 pt-3 sm:px-3 sm:pb-5">
        <div className="rounded-xl border border-[#dadce0] bg-white p-2.5 shadow-sm sm:p-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[#5f6368] sm:text-[10px]">
              Anúncio patrocinado
            </p>
            <span className="rounded bg-[#fbbc04]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#b06000]">
              Ad
            </span>
          </div>
          <div className="mt-2 flex h-14 items-center justify-center rounded-lg bg-linear-to-br from-[#e8f0fe] to-[#d2e3fc] sm:h-24">
            <HiPhoto className="h-6 w-6 text-[#1a73e8] sm:h-8 sm:w-8" />
          </div>
          <p className="mt-2 text-[10px] font-semibold text-[#202124] sm:text-xs">
            Cobertura com vista mar
          </p>
          <p className="text-[10px] text-[#5f6368] sm:text-xs">
            A partir de R$ 890 mil
          </p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#1a73e8] px-2.5 py-1 text-[10px] font-semibold text-white sm:px-3 sm:text-xs">
            Ver página
            <HiArrowTopRightOnSquare className="h-3 w-3" />
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-[#1a73e8]/40 bg-[#e8f0fe] px-2 py-1.5 text-center sm:py-2">
          <p className="text-[10px] text-[#5f6368] sm:text-xs">
            Destino do clique
          </p>
          <p className="text-[10px] font-semibold text-[#1a73e8] sm:text-xs">
            landing do corretor
          </p>
        </div>
      </div>
    </PhoneShell>
  );
}

export function DigitalCardMockup({ large = false }: MockupProps) {
  return (
    <PhoneShell large={large} topBarClassName="bg-[#e0f2fe]">
      <div className="space-y-3 bg-[#f0f9ff] px-3 pb-4 pt-3 sm:px-4 sm:pb-5">
        <div
          className="rounded-2xl p-3 text-white sm:p-4"
          style={{
            background: "linear-gradient(145deg, #0e6f8a 0%, #079ed4 100%)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-semibold ring-2 ring-white/30 sm:h-12 sm:w-12 sm:text-base">
              AS
            </div>
            <div>
              <p className="text-[11px] font-semibold sm:text-sm">Ana Souza</p>
              <p className="text-[10px] text-white/80 sm:text-xs">
                Corretora de imóveis
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-1.5 text-[10px] text-white/90 sm:text-xs">
            <p className="inline-flex items-center gap-1.5">
              <HiPhone className="h-3 w-3 text-[#7dd3fc]" />
              (81) 99221-5812
            </p>
            <p className="inline-flex items-center gap-1.5">
              <HiShare className="h-3 w-3 text-[#7dd3fc]" />
              anasouza.zone.app
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#bae6fd] bg-white px-2.5 py-2 text-center shadow-sm sm:py-2.5">
          <p className="text-[10px] text-[#0369a1] sm:text-xs">
            Cartão digital enviado
          </p>
          <p className="text-[10px] font-semibold text-[#0c4a6e] sm:text-xs">
            Link da landing incluso
          </p>
        </div>
      </div>
    </PhoneShell>
  );
}
