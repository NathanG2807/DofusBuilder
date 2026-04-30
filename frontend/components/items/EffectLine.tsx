"use client";

import { effectIcon, effectMaxLabel } from "@/lib/effectFormat";

type RawEffect = Record<string, unknown>;

type Props = {
  eff: RawEffect;
  className?: string;
};

/**
 * Affiche une ligne d'effet d'item : icône élémentaire (si connue) + valeur max + nom.
 */
export function EffectLine({ eff, className = "" }: Props) {
  const label = effectMaxLabel(eff);
  const icon = effectIcon(eff);
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
      <span>{label}</span>
    </li>
  );
}
