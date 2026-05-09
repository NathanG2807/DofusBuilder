"use client";

import { computeWeaponEffectDamage } from "@/lib/combatDamageCalc";
import { useDisplayStats } from "@/hooks/useDisplayStats";
import { useWeaponCombat } from "@/components/items/weaponCombatContext";
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

function formatCalcRange(c: { min: number; max: number }): string {
  return c.min === c.max ? String(c.min) : `${c.min}–${c.max}`;
}

function scale(c: { min: number; max: number; element: number; colorClass: string }, hits: number) {
  if (hits <= 1) return c;
  return { ...c, min: c.min * hits, max: c.max * hits };
}

/**
 * Affiche une ligne d'effet d'item : icône élémentaire (si connue) + valeur max + nom.
 * Les effets actifs (is_active: true = dégâts réels de l'arme) sont affichés
 * en gras avec la couleur de leur élément, et scalés par weaponHits du contexte.
 */
export function EffectLine({ eff, className = "" }: Props) {
  const isActive = (eff.type as { is_active?: boolean } | null)?.is_active === true;
  const label = isActive ? effectRangeLabel(eff) : effectMaxLabel(eff);
  const icon = effectIcon(eff);
  const color = isActive && icon ? (ICON_TO_COLOR[icon] ?? null) : null;
  const stats = useDisplayStats();
  const weaponCombat = useWeaponCombat();
  const innateCrit = weaponCombat?.weaponCritBonusFlat ?? 0;
  const hits = weaponCombat?.weaponHits ?? 1;

  const calcRaw = isActive
    ? computeWeaponEffectDamage(eff as Record<string, unknown>, stats, {
        isCrit: false,
        weaponCritBonusFlat: 0,
      })
    : null;
  const calcCritRaw =
    isActive && calcRaw
      ? computeWeaponEffectDamage(eff as Record<string, unknown>, stats, {
          isCrit: true,
          weaponCritBonusFlat: innateCrit,
        })
      : null;

  const calc = calcRaw ? scale(calcRaw, hits) : null;
  const calcCrit = calcCritRaw ? scale(calcCritRaw, hits) : null;

  if (!label) return null;

  return (
    <li className={`flex items-center gap-1.5 leading-snug ${className}`}>
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/assets/elements/${icon}.png`}
          alt=""
          width={14}
          height={14}
          className="h-[14px] w-[14px] shrink-0 object-contain"
        />
      ) : (
        <span className="h-[14px] w-[14px] shrink-0" />
      )}
      <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
        <span
          style={color ? { color, fontWeight: 700 } : undefined}
          className={`min-w-0 ${isActive ? "italic" : ""} ${isActive && !color ? "font-bold text-[#e0d0b0]" : ""}`}
        >
          {label}
        </span>
        {calc ? (
          <span className="flex max-w-[min(100%,11rem)] shrink-0 flex-col items-end gap-0.5 text-[10px] leading-tight sm:max-w-none sm:flex-row sm:items-baseline sm:gap-1.5 sm:text-[11px]">
            <span
              className={`font-semibold tabular-nums ${calc.colorClass}`}
              title="Dégâts réels hors coup critique (build courant)"
            >
              ({formatCalcRange(calc)})
            </span>
            {calcCrit ? (
              <span
                className="whitespace-nowrap font-semibold tabular-nums text-[#f0c060]"
                title="Dégâts réels avec dommages critiques (build courant)"
              >
                CC ({formatCalcRange(calcCrit)})
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
    </li>
  );
}
