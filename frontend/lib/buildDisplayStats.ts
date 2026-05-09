/**
 * Stats « affichées » = même agrégat que le panneau Caractéristiques :
 * stuff (API aggregate) + défauts niveau + points investis + parchos + exo FM PA/PM,
 * avec initiative recalculée.
 */

import type { ExoType } from "@/store/build-store";

const BASE_PA = 6;
const BASE_PM = 3;
const BASE_PROSPECTING = 100;

export function applyCharacterInvestments(
  baseStats: Record<string, number>,
  charStats: Record<string, number>,
): Record<string, number> {
  const result = { ...baseStats };
  for (const [key, value] of Object.entries(charStats)) {
    if (value > 0) {
      result[key] = (result[key] ?? 0) + value;
    }
  }

  const totalElementalStats =
    (result.strength ?? 0) +
    (result.chance ?? 0) +
    (result.agility ?? 0) +
    (result.intelligence ?? 0);
  const stuffInitiativeBonus = baseStats.initiative ?? 0;
  result.initiative = stuffInitiativeBonus + totalElementalStats;

  return result;
}

/**
 * Stats complètes pour le personnage (dégâts calculés, conditions d’items, etc.).
 */
export function computeDisplayStats(
  rawStats: Record<string, number>,
  level: number,
  charStats: Record<string, number>,
  parchoStats: Record<string, number>,
  exoFm: Partial<Record<string, ExoType>>,
): Record<string, number> {
  const basePA = BASE_PA + (level >= 100 ? 1 : 0);
  const basePV = 50 + level * 5;
  const basePods = 1000 + level * 5;

  const baseStats: Record<string, number> = { ...rawStats };
  if (!baseStats.pa) baseStats.pa = basePA;
  if (!baseStats.pm) baseStats.pm = BASE_PM;
  if (!baseStats.vitality) baseStats.vitality = basePV;
  if (!baseStats.prospecting) baseStats.prospecting = BASE_PROSPECTING;
  if (!baseStats.pods) baseStats.pods = basePods;

  const exoPa = Object.values(exoFm).filter((v) => v === "pa").length;
  const exoPm = Object.values(exoFm).filter((v) => v === "pm").length;

  const base = applyCharacterInvestments(baseStats, charStats);
  const result: Record<string, number> = {
    ...base,
    pa: (base.pa ?? 0) + exoPa,
    pm: (base.pm ?? 0) + exoPm,
  };

  for (const [key, v] of Object.entries(parchoStats)) {
    if (v > 0) result[key] = (result[key] ?? 0) + v;
  }

  const stuffInitiativeBonus = baseStats.initiative ?? 0;
  result.initiative =
    stuffInitiativeBonus +
    (result.strength ?? 0) +
    (result.chance ?? 0) +
    (result.agility ?? 0) +
    (result.intelligence ?? 0);

  return result;
}
