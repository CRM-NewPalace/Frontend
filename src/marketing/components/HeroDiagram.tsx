import { motion, useReducedMotion } from "framer-motion";

const CENTER = 250;
const MODULE_RADIUS = 172;
const HUB_RADIUS = 62;
const INNER_RING = 108;
const OUTER_RING = 142;

const MODULES = [
  { label: "CRM", angle: 0, hasLine: false },
  { label: "Financeiro", angle: 60, hasLine: true },
  { label: "Imóveis", angle: 120, hasLine: true },
  { label: "Contatos", angle: 180, hasLine: false },
  { label: "Vendas", angle: 240, hasLine: true },
  { label: "Automação", angle: 300, hasLine: true },
] as const;

function polarToCartesian(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.sin(rad),
    y: CENTER - radius * Math.cos(rad),
  };
}

function ConnectionLine({
  angle,
  index,
  reducedMotion,
}: {
  angle: number;
  index: number;
  reducedMotion: boolean;
}) {
  const inner = polarToCartesian(angle, HUB_RADIUS + 6);
  const outer = polarToCartesian(angle, MODULE_RADIUS - 34);
  const lineDelay = 0.4 + index * 0.15;

  return (
    <g>
      <motion.line
        x1={inner.x}
        y1={inner.y}
        x2={outer.x}
        y2={outer.y}
        stroke="#079ed4"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeDasharray="4 6"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.55 }}
        transition={{
          pathLength: {
            duration: reducedMotion ? 0 : 1.1,
            delay: lineDelay,
            ease: "easeOut",
          },
          opacity: { duration: 0.3, delay: lineDelay },
        }}
      />

      {!reducedMotion && (
        <>
          <motion.line
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke="#053647"
            strokeWidth={2}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: [0, 1, 1, 0] }}
            transition={{
              duration: 2.8,
              delay: lineDelay + 1,
              repeat: Infinity,
              repeatDelay: 0.6,
              ease: "easeInOut",
              times: [0, 0.45, 0.55, 1],
            }}
          />
          <motion.circle
            r={3.5}
            fill="#079ed4"
            initial={{ cx: inner.x, cy: inner.y, opacity: 0 }}
            animate={{
              cx: [inner.x, outer.x],
              cy: [inner.y, outer.y],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 2.8,
              delay: lineDelay + 1 + index * 0.25,
              repeat: Infinity,
              repeatDelay: 0.6,
              ease: "easeInOut",
            }}
          />
        </>
      )}
    </g>
  );
}

export function HeroDiagram() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md lg:max-w-xl">
      <svg viewBox="0 0 500 500" className="h-full w-full" aria-hidden>
        <defs>
          <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#eef8fc" />
            <stop offset="100%" stopColor="#dceef6" />
          </radialGradient>
          <filter id="hub-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="6"
              floodColor="#079ed4"
              floodOpacity="0.12"
            />
          </filter>
        </defs>

        {/* Anéis orbitais */}
        <g transform={`translate(${CENTER} ${CENTER})`}>
          <motion.g
            animate={reducedMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          >
            <circle
              cx={0}
              cy={0}
              r={INNER_RING}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth={1}
              opacity={0.6}
            />
          </motion.g>

          <motion.g
            animate={reducedMotion ? undefined : { rotate: -360 }}
            transition={{ duration: 65, repeat: Infinity, ease: "linear" }}
          >
            <circle
              cx={0}
              cy={0}
              r={OUTER_RING}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth={1}
              strokeDasharray="5 9"
              opacity={0.45}
            />
            <circle cx={0} cy={-OUTER_RING} r={4} fill="#079ed4" />
            <circle
              cx={-OUTER_RING * 0.866}
              cy={OUTER_RING * 0.5}
              r={3}
              fill="#053647"
            />
            <circle
              cx={OUTER_RING * 0.866}
              cy={OUTER_RING * 0.5}
              r={3.5}
              fill="#94a3b8"
            />
          </motion.g>
        </g>

        {/* Linhas animadas */}
        {MODULES.filter((m) => m.hasLine).map(({ angle, label }, index) => (
          <ConnectionLine
            key={label}
            angle={angle}
            index={index}
            reducedMotion={!!reducedMotion}
          />
        ))}

        {/* Hub central */}
        <motion.circle
          cx={CENTER}
          cy={CENTER}
          r={HUB_RADIUS}
          fill="url(#hub-glow)"
          stroke="#e2e8f0"
          strokeWidth={1}
          filter="url(#hub-shadow)"
          animate={
            reducedMotion
              ? undefined
              : { scale: [1, 1.03, 1], opacity: [0.95, 1, 0.95] }
          }
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
        />

        <motion.circle
          cx={CENTER}
          cy={CENTER}
          r={HUB_RADIUS + 14}
          fill="none"
          stroke="#079ed4"
          strokeWidth={1}
          opacity={0.15}
          animate={
            reducedMotion
              ? undefined
              : { scale: [1, 1.08, 1], opacity: [0.1, 0.25, 0.1] }
          }
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
        />
      </svg>

      {/* Logo no centro */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="flex flex-col items-center leading-none">
          <span className="text-sm font-semibold text-brand-dark sm:text-base">
            Zone
          </span>
          <span className="-mt-0.5 text-xs font-semibold text-brand-accent sm:text-sm">
            Connection
          </span>
        </div>
      </motion.div>

      {/* Módulos */}
      {MODULES.map(({ label, angle }, index) => {
        const { x, y } = polarToCartesian(angle, MODULE_RADIUS);

        return (
          <motion.div
            key={label}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${(x / 500) * 100}%`, top: `${(y / 500) * 100}%` }}
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.3 + index * 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <motion.span
              className="block whitespace-nowrap rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-medium text-brand-dark shadow-sm sm:px-4 sm:py-2 sm:text-sm"
              animate={
                reducedMotion
                  ? undefined
                  : {
                      boxShadow: [
                        "0 1px 3px rgb(0 0 0 / 0.06)",
                        "0 4px 12px rgb(7 158 212 / 0.12)",
                        "0 1px 3px rgb(0 0 0 / 0.06)",
                      ],
                    }
              }
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: index * 0.4,
                ease: "easeInOut",
              }}
            >
              {label}
            </motion.span>
          </motion.div>
        );
      })}
    </div>
  );
}
