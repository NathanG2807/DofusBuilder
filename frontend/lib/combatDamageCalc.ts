/**
 * Calcul de dégâts au survol des armes — même formule que les sorts (SpellsPanel) :
 * base × (1 + (Puissance + Caractéristique)/100) + dommages fixes + CC si demandé.
 */

import { effectTypeToStatKey } from "@/lib/effectFormat";

const MAX_WEAPON_DICE = 9000;

const DAMAGE_ELEMENT_INFO: Record<
  number,
  {
    caracKey: "strength" | "intelligence" | "chance" | "agility";
    damageKey:
      | "damage_neutral"
      | "damage_earth"
      | "damage_fire"
      | "damage_water"
      | "damage_air";
    colorClass: string;
  }
> = {
  0: { caracKey: "strength", damageKey: "damage_neutral", colorClass: "text-[#a8a8a8]" },
  1: { caracKey: "strength", damageKey: "damage_earth", colorClass: "text-[#7faf3a]" },
  2: { caracKey: "intelligence", damageKey: "damage_fire", colorClass: "text-[#e26e3c]" },
  3: { caracKey: "chance", damageKey: "damage_water", colorClass: "text-[#4ba4dd]" },
  4: { caracKey: "agility", damageKey: "damage_air", colorClass: "text-[#b8d040]" },
};

function statKeyToDamageElement(statKey: string | null): number | null {
  if (!statKey) return null;
  const map: Record<string, number> = {
    damage_neutral: 0,
    damage_earth: 1,
    damage_fire: 2,
    damage_water: 3,
    damage_air: 4,
    damage: 0,
    damage_push: 0,
    distance_damage: 0,
  };
  return map[statKey] ?? null;
}

function parseWeaponDice(eff: Record<string, unknown>): { min: number; max: number } | null {
  const ignoreMin = Boolean(eff.ignore_int_min);
  const ignoreMax = Boolean(eff.ignore_int_max);
  if (ignoreMin && ignoreMax) return null;

  const parse = (v: unknown) =>
    typeof v === "number" ? v : typeof v === "string" ? parseInt(String(v), 10) : 0;
  const min = parse(eff.int_minimum);
  const max = parse(eff.int_maximum);

  if (ignoreMax || min === max) {
    if (min <= 0 || min >= MAX_WEAPON_DICE) return null;
    return { min, max: min };
  }
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  if (lo <= 0 || lo >= MAX_WEAPON_DICE || hi >= MAX_WEAPON_DICE) return null;
  return { min: lo, max: hi };
}

/**
 * Dégâts réels pour une ligne d’effet d’item `is_active` (jet d’arme / vol au hit).
 * Retourne `null` si la ligne n’est pas un dommage ou vol élémentaire scalé.
 */
export function computeWeaponEffectDamage(
  eff: Record<string, unknown>,
  stats: Record<string, number>,
  opts: { isCrit: boolean; weaponCritBonusFlat?: number } = { isCrit: false },
): { min: number; max: number; element: number; colorClass: string } | null {
  const type = eff.type as { is_active?: boolean; id?: number; name?: string } | null;
  if (!type?.is_active) return null;

  const statKey = effectTypeToStatKey(type);
  const element = statKeyToDamageElement(statKey);
  if (element === null) return null;

  const dice = parseWeaponDice(eff);
  if (!dice) return null;

  const info = DAMAGE_ELEMENT_INFO[element];
  if (!info) return null;

  const power = stats.power ?? 0;
  const carac = stats[info.caracKey] ?? 0;
  const dmgElem = stats[info.damageKey] ?? 0;
  const dmgFixes = dmgElem + (stats.damage ?? 0);
  const critFlat = opts.isCrit
    ? (stats.critical_damage ?? 0) + (opts.weaponCritBonusFlat ?? 0)
    : 0;
  const factor = 1 + (power + carac) / 100;

  const min = Math.floor(dice.min * factor + dmgFixes + critFlat);
  const max = Math.floor(dice.max * factor + dmgFixes + critFlat);

  return { min, max, element, colorClass: info.colorClass };
}
