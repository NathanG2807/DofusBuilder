/** Positions & couleurs calées sur homepage-bg.png (1536×1024). */
const BG_ASPECT = 1536 / 1024;

const RUNES = [
  {
    id: "top",
    x: 48.9,
    y: 25.4,
    color: "#6ee8d8",
    pulseDelay: 0,
    sparkles: [
      { dx: 0, dy: 0, size: 4, delay: 0, duration: 1.4 },
      { dx: -12, dy: -10, size: 2.5, delay: 0.5, duration: 1.2 },
      { dx: 14, dy: -5, size: 2.5, delay: 1.0, duration: 1.1 },
      { dx: -5, dy: 12, size: 2, delay: 1.5, duration: 1.3 },
      { dx: 10, dy: 9, size: 2, delay: 0.8, duration: 1.6 },
    ],
  },
  {
    id: "upper-left",
    x: 37.6,
    y: 33.3,
    color: "#5fe0cf",
    pulseDelay: 0.45,
    sparkles: [
      { dx: 0, dy: 0, size: 3.5, delay: 0.2, duration: 1.3 },
      { dx: -10, dy: 8, size: 2, delay: 0.7, duration: 1.1 },
      { dx: 9, dy: -9, size: 2.5, delay: 1.2, duration: 1.4 },
      { dx: -6, dy: -7, size: 2, delay: 1.8, duration: 1.2 },
    ],
  },
  {
    id: "upper-right",
    x: 59.5,
    y: 33.3,
    color: "#62e4d2",
    pulseDelay: 0.9,
    sparkles: [
      { dx: 0, dy: 0, size: 3.5, delay: 0.4, duration: 1.35 },
      { dx: 11, dy: 6, size: 2, delay: 0.9, duration: 1.15 },
      { dx: -8, dy: -10, size: 2.5, delay: 1.4, duration: 1.25 },
      { dx: 7, dy: -6, size: 2, delay: 2.0, duration: 1.1 },
    ],
  },
  {
    id: "lower-left",
    x: 35.3,
    y: 49.1,
    color: "#68e6d4",
    pulseDelay: 1.35,
    sparkles: [
      { dx: 0, dy: 0, size: 3.5, delay: 0.6, duration: 1.4 },
      { dx: -9, dy: -8, size: 2, delay: 0.1, duration: 1.2 },
      { dx: 10, dy: 9, size: 2.5, delay: 1.1, duration: 1.3 },
      { dx: -11, dy: 5, size: 2, delay: 1.7, duration: 1.15 },
    ],
  },
  {
    id: "lower-right",
    x: 62.1,
    y: 49.4,
    color: "#5ee2d0",
    pulseDelay: 1.8,
    sparkles: [
      { dx: 0, dy: 0, size: 3.5, delay: 0.3, duration: 1.35 },
      { dx: 8, dy: -9, size: 2, delay: 0.85, duration: 1.2 },
      { dx: -11, dy: 6, size: 2.5, delay: 1.35, duration: 1.25 },
      { dx: 6, dy: 10, size: 2, delay: 1.9, duration: 1.1 },
    ],
  },
] as const;

function RuneSparkleCluster({
  x,
  y,
  color,
  pulseDelay,
  sparkles,
}: (typeof RUNES)[number]) {
  return (
    <div
      className="absolute"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
    >
      {/* Halo externe — pulsation lente, décalée par rune */}
      <div
        className="zaap-rune-pulse-outer pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl"
        style={{
          background: `radial-gradient(circle, ${color}cc 0%, ${color}44 35%, transparent 70%)`,
          animationDelay: `${pulseDelay}s`,
        }}
      />

      {/* Coeur lumineux — pulsation forte */}
      <div
        className="zaap-rune-pulse-core pointer-events-none absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md"
        style={{
          background: `radial-gradient(circle, ${color} 0%, ${color}aa 40%, transparent 75%)`,
          animationDelay: `${pulseDelay}s`,
        }}
      />

      {/* Point central */}
      <div
        className="zaap-rune-pulse-dot pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 6px ${color}, 0 0 14px ${color}, 0 0 24px ${color}aa`,
          animationDelay: `${pulseDelay}s`,
        }}
      />

      {sparkles.map((sparkle, i) => (
        <span
          key={i}
          className="zaap-rune-twinkle pointer-events-none absolute rounded-full"
          style={{
            left: `calc(50% + ${sparkle.dx}px)`,
            top: `calc(50% + ${sparkle.dy}px)`,
            width: sparkle.size,
            height: sparkle.size,
            marginLeft: -sparkle.size / 2,
            marginTop: -sparkle.size / 2,
            backgroundColor: color,
            boxShadow: `0 0 ${sparkle.size * 2}px ${color}, 0 0 ${sparkle.size * 5}px ${color}, 0 0 ${sparkle.size * 8}px ${color}66`,
            animationDuration: `${sparkle.duration}s`,
            animationDelay: `${sparkle.delay + pulseDelay * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Scintillements alignés sur les runes du zaap (object-cover). */
export function ZaapRuneSparkles() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden mix-blend-screen"
      aria-hidden
    >
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ aspectRatio: BG_ASPECT, minWidth: "100%", minHeight: "100%" }}
      >
        {/* Respiration globale du portail */}
        <div
          className="zaap-portal-breathe pointer-events-none absolute rounded-full blur-3xl"
          style={{
            left: "49%",
            top: "37%",
            width: "28%",
            height: "32%",
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(circle, rgba(94, 224, 208, 0.35) 0%, rgba(80, 178, 163, 0.12) 45%, transparent 72%)",
          }}
        />

        {RUNES.map((rune) => (
          <RuneSparkleCluster key={rune.id} {...rune} />
        ))}
      </div>
    </div>
  );
}
