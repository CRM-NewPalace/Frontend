const LINE = "#94a3b8";
const ACCENT = "#079ed4";
const MUTED = "#cbd5e1";

function GridPattern({ id }: { id: string }) {
  return (
    <pattern id={id} width="18" height="18" patternUnits="userSpaceOnUse">
      <path
        d="M 18 0 L 0 0 0 18"
        fill="none"
        stroke={MUTED}
        strokeWidth="0.6"
      />
    </pattern>
  );
}

function TopRightDecor() {
  return (
    <svg
      viewBox="0 0 520 420"
      className="h-full w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <GridPattern id="home-grid" />
      </defs>

      <rect
        x="220"
        y="0"
        width="300"
        height="220"
        fill="url(#home-grid)"
        opacity="0.45"
      />

      <circle
        cx="420"
        cy="40"
        r="120"
        stroke={LINE}
        strokeWidth="1"
        opacity="0.35"
      />
      <circle
        cx="420"
        cy="40"
        r="175"
        stroke={LINE}
        strokeWidth="1"
        opacity="0.28"
      />
      <circle
        cx="420"
        cy="40"
        r="230"
        stroke={ACCENT}
        strokeWidth="1"
        opacity="0.22"
      />
      <circle
        cx="420"
        cy="40"
        r="280"
        stroke={LINE}
        strokeWidth="0.8"
        opacity="0.18"
      />

      <rect
        x="300"
        y="70"
        width="130"
        height="88"
        rx="10"
        stroke={LINE}
        strokeWidth="1"
        opacity="0.35"
      />

      <path
        d="M250 150 H310 V210 H360"
        stroke={ACCENT}
        strokeWidth="1.2"
        opacity="0.55"
      />
      <circle
        cx="250"
        cy="150"
        r="3.5"
        stroke={ACCENT}
        strokeWidth="1.2"
        fill="white"
      />
      <circle
        cx="360"
        cy="210"
        r="3.5"
        stroke={ACCENT}
        strokeWidth="1.2"
        fill="white"
      />

      <path
        d="M390 155 h10 M395 150 v10"
        stroke={LINE}
        strokeWidth="1"
        opacity="0.5"
      />
      <path
        d="M280 95 h8 M284 91 v8"
        stroke={LINE}
        strokeWidth="1"
        opacity="0.4"
      />

      <circle cx="340" cy="120" r="3" fill={ACCENT} opacity="0.85" />
    </svg>
  );
}

function BottomLeftDecor() {
  return (
    <svg
      viewBox="0 0 480 380"
      className="h-full w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M-10 60 C80 40, 120 140, 200 120 C280 100, 300 40, 380 70 C430 90, 460 160, 520 150"
        stroke={LINE}
        strokeWidth="1.1"
        opacity="0.45"
      />
      <path
        d="M-20 140 C70 160, 130 80, 210 110 C290 140, 320 220, 400 190 C450 170, 480 210, 540 230"
        stroke={ACCENT}
        strokeWidth="1.1"
        opacity="0.35"
      />
      <path
        d="M-30 240 C90 200, 150 280, 240 250 C330 220, 360 300, 450 280 C500 270, 530 300, 560 320"
        stroke={LINE}
        strokeWidth="1"
        opacity="0.35"
      />

      <circle
        cx="120"
        cy="130"
        r="3.5"
        stroke={LINE}
        strokeWidth="1"
        fill="white"
      />
      <circle
        cx="260"
        cy="155"
        r="3.5"
        stroke={ACCENT}
        strokeWidth="1"
        fill="white"
      />
      <circle
        cx="180"
        cy="245"
        r="3"
        stroke={LINE}
        strokeWidth="1"
        fill="white"
      />

      <path
        d="M70 175 h9 M74.5 170.5 v9"
        stroke={LINE}
        strokeWidth="1.1"
        opacity="0.55"
      />
      <path
        d="M310 175 h9 M314.5 170.5 v9"
        stroke={ACCENT}
        strokeWidth="1.1"
        opacity="0.5"
      />
      <path
        d="M220 290 h8 M224 286 v8"
        stroke={LINE}
        strokeWidth="1"
        opacity="0.45"
      />

      <circle cx="200" cy="300" r="3" fill={ACCENT} opacity="0.8" />
    </svg>
  );
}

function BottomRightDecor() {
  return (
    <svg
      viewBox="0 0 220 280"
      className="h-full w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <circle
          key={i}
          cx="40"
          cy={40 + i * 28}
          r="5"
          stroke={LINE}
          strokeWidth="1.1"
          fill="white"
          opacity="0.7"
        />
      ))}

      {[0, 1, 2, 3, 4, 5].map((col) =>
        [0, 1].map((row) => (
          <circle
            key={`${col}-${row}`}
            cx={90 + col * 12}
            cy={168 + row * 12}
            r="1.6"
            fill={ACCENT}
            opacity="0.45"
          />
        )),
      )}

      <rect
        x="90"
        y="110"
        width="8"
        height="8"
        fill={ACCENT}
        opacity="0.7"
        rx="1"
      />
      <rect
        x="90"
        y="124"
        width="8"
        height="8"
        fill={ACCENT}
        opacity="0.55"
        rx="1"
      />

      <path
        d="M120 118 h10 M125 113 v10"
        stroke={ACCENT}
        strokeWidth="1.3"
        opacity="0.65"
      />
    </svg>
  );
}

function GlowDot({ className }: { className: string }) {
  return (
    <span
      className={`absolute h-1.5 w-1.5 rounded-full bg-brand-accent/70 ${className}`}
    />
  );
}

/**
 * Fundo técnico vetorial estático — sem parallax no scroll para manter a rolagem fluida.
 */
export function HomeBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#fbfcfd]"
      aria-hidden
    >
      <div className="absolute -top-8 -right-6 h-105 w-130 sm:h-120 sm:w-145 lg:h-140 lg:w-160">
        <TopRightDecor />
        <GlowDot className="top-[28%] right-[34%]" />
      </div>

      <div className="absolute -bottom-10 -left-8 h-80 w-105 sm:h-95 sm:w-125 lg:h-110 lg:w-140">
        <BottomLeftDecor />
        <GlowDot className="bottom-[22%] left-[38%]" />
      </div>

      <div className="absolute right-4 bottom-16 h-55 w-45 sm:right-10 sm:bottom-24 sm:h-65 sm:w-52.5 lg:right-16">
        <BottomRightDecor />
      </div>

      {/* Vinheta central leve para leitura do conteúdo */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,252,253,0.75)_0%,rgba(251,252,253,0.35)_42%,transparent_72%)]" />
    </div>
  );
}
