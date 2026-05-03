"use client";

import { effectIcon, effectMaxLabel, effectRangeLabel } from "@/lib/effectFormat";

type RawEffect = Record<string, unknown>;

type Props = {
  eff: RawEffect;
  className?: string;
};

/** Couleur textuelle associée à l'icône élémentaire (effets actifs = dégâts d'arme). */
const ICON_TO_COLOR: Record<string, string> = {
  dtf: "#c8843a", // Terre
  dff: "#e05838", // Feu
  def: "#3a8fd9", // Eau
  daf: "#98c030", // Air
  dnf: "#c8c0a8", // Neutre
  ter: "#c8843a",
  feu: "#e05838",
  eau: "#3a8fd9",
  air: "#98c030",
};

/**
 * Affiche une ligne d'effet d'item : icône élémentaire (si connue) + valeur max + nom.
 * Les effets actifs (is_active: true = dégâts réels de l'arme) sont affichés
 * en gras avec la couleur de leur élément.
 */
export function EffectLine({ eff, className = "" }: Props) {
  const isActive = (eff.type as { is_active?: boolean } | null)?.is_active === true;
  const label = isActive ? effectRangeLabel(eff) : effectMaxLabel(eff);
  const icon = effectIcon(eff);
  const color = isActive && icon ? (ICON_TO_COLOR[icon] ?? null) : null;

  if (!label) return null;

  return (
    <li className={`flex items-center gap-1.5 leading-snug ${className}`}>
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/assets/elements/${icon}.png`}
          alt=""
          width={13}
          height={13}
          className="h-[13px] w-[13px] shrink-0 object-contain"
        />
      ) : (
        <span className="h-[13px] w-[13px] shrink-0" />
      )}
      <span
        style={color ? { color, fontWeight: 700 } : undefined}
        className={`${isActive ? "italic" : ""} ${isActive && !color ? "font-bold text-[#e0d0b0]" : ""}`}
      >
        {label}
      </span>
    </li>
  );
}
