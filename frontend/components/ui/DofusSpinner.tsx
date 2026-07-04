"use client";

export interface DofusSpinnerProps {
  /** Taille du Dofus en px (défaut : 72) */
  size?: number;
  /** Texte sous le spinner (optionnel) */
  label?: string;
  className?: string;
}

const DURATION = 3.6; // secondes

/** Injecte les keyframes dynamiquement selon la taille. */
function buildKeyframes(size: number) {
  const cw   = Math.round(size * 4.4);           // largeur du container
  const cx   = Math.round((cw - size) / 2);      // centre X du container
  const sx   = -Math.round(size * 1.1);          // départ (hors gauche)
  const ex   = Math.round(cw + size * 0.25);     // sortie (hors droite)

  return `
/* ── Translation horizontale + opacité ── */
@keyframes dofusSlideX-${size} {
  0%   { transform: translateX(${sx}px);       opacity: 0; }
  4%   { transform: translateX(${sx+18}px);    opacity: 1; }
  33%  { transform: translateX(${cx-12}px);    animation-timing-function: ease-out; }
  38%  { transform: translateX(${cx+22}px); }
  42%  { transform: translateX(${cx-10}px); }
  46%  { transform: translateX(${cx+6}px);  }
  50%  { transform: translateX(${cx-2}px);  }
  53%  { transform: translateX(${cx+1}px);  }
  56%  { transform: translateX(${cx}px);    }
  70%  { transform: translateX(${cx}px);    animation-timing-function: ease-in; }
  82%  { transform: translateX(${cx+50}px); opacity: 1; }
  94%  { transform: translateX(${ex-18}px); opacity: 0.3; }
  99%  { transform: translateX(${ex}px);    opacity: 0; }
  100% { transform: translateX(${sx}px);    opacity: 0; }
}

/* ── Rotation (dissociée de la translation) ── */
@keyframes dofusRotate-${size} {
  0%   { transform: rotate(0deg);   }
  4%   { transform: rotate(30deg);  }
  33%  { transform: rotate(318deg); animation-timing-function: ease-out; }
  38%  { transform: rotate(382deg); }
  42%  { transform: rotate(348deg); }
  46%  { transform: rotate(366deg); }
  50%  { transform: rotate(357deg); }
  53%  { transform: rotate(362deg); }
  56%  { transform: rotate(360deg); }
  70%  { transform: rotate(360deg); animation-timing-function: ease-in; }
  82%  { transform: rotate(452deg); }
  94%  { transform: rotate(640deg); }
  99%  { transform: rotate(710deg); }
  100% { transform: rotate(720deg); }
}

/* ── Ombre (scale + opacité synchronisés avec le mouvement) ── */
@keyframes dofusShadow-${size} {
  0%,100%{ transform: translateX(-50%) scaleX(0.65); opacity: 0; }
  4%     { transform: translateX(-50%) scaleX(0.72); opacity: 0.1; }
  33%    { transform: translateX(-50%) scaleX(0.88); opacity: 0.2; }
  38%    { transform: translateX(-50%) scaleX(1.08); opacity: 0.28; }
  56%    { transform: translateX(-50%) scaleX(1.08); opacity: 0.28; }
  70%    { transform: translateX(-50%) scaleX(1.08); opacity: 0.28; }
  82%    { transform: translateX(-50%) scaleX(0.84); opacity: 0.16; }
  94%    { transform: translateX(-50%) scaleX(0.6);  opacity: 0.06; }
  99%    { transform: translateX(-50%) scaleX(0.6);  opacity: 0; }
}

@keyframes dofusLabel { 0%,100%{opacity:.35} 50%{opacity:1} }
  `;
}

const injectedSizes = new Set<number>();

function injectStyles(size: number) {
  if (injectedSizes.has(size) || typeof document === "undefined") return;
  injectedSizes.add(size);
  const style = document.createElement("style");
  style.textContent = buildKeyframes(size);
  document.head.appendChild(style);
}

export function DofusSpinner({ size = 72, label, className = "" }: DofusSpinnerProps) {
  injectStyles(size);

  const containerWidth = Math.round(size * 4.4);
  const containerHeight = Math.round(size * 1.18);

  return (
    <div
      className={className}
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 10 }}
    >
      {/* Zone de déplacement — overflow hidden pour couper les bords */}
      <div style={{ width: containerWidth, height: containerHeight, overflow: "hidden", position: "relative" }}>

        {/* Couche 1 : translation X + opacité */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: size,
          animation: `dofusSlideX-${size} ${DURATION}s ease-in-out infinite`,
        }}>
          {/* Couche 2 : rotation */}
          <div style={{ animation: `dofusRotate-${size} ${DURATION}s ease-in-out infinite` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/dofus-green.png"
              alt="Chargement…"
              width={size}
              height={size}
              draggable={false}
              style={{ display: "block", userSelect: "none" }}
            />
          </div>

          {/* Ombre au sol (ne pivote pas) */}
          <div style={{
            position: "absolute",
            bottom: -Math.round(size * 0.06),
            left: "50%",
            width: Math.round(size * 0.65),
            height: Math.round(size * 0.1),
            borderRadius: "50%",
            background: "rgba(0,0,0,0.36)",
            animation: `dofusShadow-${size} ${DURATION}s ease-in-out infinite`,
          }} />
        </div>
      </div>

      {/* Label optionnel */}
      {label && (
        <span style={{
          fontSize: Math.max(10, size * 0.17),
          color: "#555",
          animation: "dofusLabel 1.4s ease-in-out infinite",
          whiteSpace: "nowrap",
        }}>
          {label}
        </span>
      )}
    </div>
  );
}
