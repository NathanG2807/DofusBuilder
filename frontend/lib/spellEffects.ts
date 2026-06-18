/**
 * Utilitaires partagés pour l'affichage des effets de sorts Dofus.
 * Utilisé par SpellsPanel (sorts de personnage) et BestiaryPanel (sorts de monstres).
 */

/* ── Types ────────────────────────────────────────────────────────────────── */
export interface SpellEffect {
  effectId: number;
  effectElement: number;
  value: number;
  diceNum: number;
  diceSide: number;
  duration: number;
  visibleInTooltip: boolean;
}

export interface SpellLevelData {
  id: number;
  grade: number;
  apCost: number;
  minRange: number;
  range: number;
  criticalHitProbability: number;
  maxCastPerTurn: number;
  minPlayerLevel: number;
  rangeCanBeBoosted: boolean;
  castInLine: boolean;
  castInDiagonal: boolean;
  castTestLos: boolean;
  effects: SpellEffect[];
  criticalEffect: SpellEffect[];
}

export interface EffectInfo {
  label: string;
  isPercent: boolean;
  isElemental: boolean;
  hideValue: boolean;
}

/* ── Constantes ────────────────────────────────────────────────────────────── */
export const ELEMENT_ICONS: Record<number, { icon: string; label: string }> = {
  1: { icon: "ter", label: "Terre" },
  2: { icon: "feu", label: "Feu"   },
  3: { icon: "eau", label: "Eau"   },
  4: { icon: "air", label: "Air"   },
};

/** Effets toujours masqués (mécaniques internes). */
export const ALWAYS_HIDDEN_EFFECT_IDS = new Set<number>([293]);

/** Valeur au-dessus de laquelle c'est un ID interne, pas une valeur de gameplay. */
export const MAX_DISPLAY_VALUE = 9000;

/* ── Cache module-level ────────────────────────────────────────────────────── */
export const gEffectCache   = new Map<number, EffectInfo>();
export const gEffectPending = new Map<number, Promise<void>>();

/* ── Seed cache ────────────────────────────────────────────────────────────── */
(function seedCache() {
  const SEED: Array<[number, string, boolean, boolean, boolean]> = [
    [  4, "Téléportation",               false, false, true  ],
    [  5, "Repousse",                    false, false, false ],
    [  6, "Attire",                      false, false, false ],
    [  8, "Échange de positions",        false, false, true  ],
    [ 50, "Porte la cible",              false, false, true  ],
    [ 51, "Lance une entité",            false, false, true  ],
    [ 77, "Vol de PM",                   false, false, false ],
    [ 78, "Rembourse PM",                false, false, false ],
    [ 84, "Vol de PA",                   false, false, false ],
    [ 81, "Soins",                       false, false, false ],
    [ 82, "Vol de vie Neutre",           false, false, false ],
    [ 85, "Dommages (% PV lanceur)",     true,  true,  false ],
    [ 86, "Dommages (% PV lanceur)",     true,  true,  false ],
    [ 87, "Dommages (% PV lanceur)",     true,  true,  false ],
    [ 91, "Vol de vie",                  false, true,  false ],
    [ 92, "Vol de vie",                  false, true,  false ],
    [ 93, "Vol de vie",                  false, true,  false ],
    [ 94, "Vol de vie",                  false, true,  false ],
    [ 95, "Vol de vie Neutre",           false, false, false ],
    [ 96, "Dommages",                    false, true,  false ],
    [ 97, "Dommages",                    false, true,  false ],
    [ 98, "Dommages",                    false, true,  false ],
    [ 99, "Dommages",                    false, true,  false ],
    [100, "Dommages Neutre",             false, false, false ],
    [101, "Soins",                       false, false, false ],
    [105, "Malus de PV",                 false, false, false ],
    [108, "Soins",                       false, false, false ],
    [110, "PA octroyés",                 false, false, false ],
    [111, "PA retirés (non esquivables)",false, false, false ],
    [112, "PA retirés",                  false, false, false ],
    [116, "PM octroyés",                 false, false, false ],
    [117, "PM retirés (non esquivables)",false, false, false ],
    [118, "PM retirés",                  false, false, false ],
    [120, "Portée ajoutée",              false, false, false ],
    [121, "Portée retirée",              false, false, false ],
    [123, "Téléportation",              false, false, true  ],
    [125, "Invocation",                  false, false, true  ],
    [126, "Force ajoutée",              false, false, false ],
    [127, "Force retirée",              false, false, false ],
    [131, "Vitalité ajoutée",           false, false, false ],
    [132, "Vitalité retirée",           false, false, false ],
    [136, "Agilité ajoutée",            false, false, false ],
    [137, "Agilité retirée",            false, false, false ],
    [138, "Intelligence ajoutée",       false, false, false ],
    [139, "Intelligence retirée",       false, false, false ],
    [141, "Chance ajoutée",             false, false, false ],
    [142, "Chance retirée",             false, false, false ],
    [143, "Sagesse ajoutée",            false, false, false ],
    [144, "Sagesse retirée",            false, false, false ],
    [145, "Érosion",                    true,  false, false ],
    [147, "Dommages ajoutés",           false, false, false ],
    [150, "Initiative ajoutée",         false, false, false ],
    [152, "Puissance ajoutée",          false, false, false ],
    [153, "Puissance retirée",          false, false, false ],
    [154, "Critique ajouté",            false, false, false ],
    [158, "Invocation",                  false, false, true  ],
    [163, "Invisibilité",               false, false, true  ],
    [168, "Esquive PA ajoutée",         false, false, false ],
    [169, "Esquive PA retirée",         false, false, false ],
    [171, "Tacle ajouté",               false, false, false ],
    [172, "Tacle retiré",               false, false, false ],
    [186, "Puissance retirée",          false, false, false ],
    [187, "Do. Poussée retirés",        false, false, false ],
    [188, "Do. Critiques ajoutés",      false, false, false ],
    [189, "Do. Critiques retirés",      false, false, false ],
    [215, "Glyphe",                      false, false, true  ],
    [281, "Bouclier",                    false, false, false ],
    [293, "Soins (% PV cible)",         false, false, true  ],
    [406, "État appliqué",              false, false, true  ],
    [951, "État spécial",               false, false, true  ],
    [1160,"État",                        false, false, true  ],
  ];
  for (const [id, label, isPercent, isElemental, hideValue] of SEED) {
    gEffectCache.set(id, { label, isPercent, isElemental, hideValue });
  }
})();

/* ── Helpers ───────────────────────────────────────────────────────────────── */
export function parseApiEffectLabel(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/#\d+/g, "")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/^[\s%:+\-]+/, "")
    .replace(/[\s%:]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function loadEffectInfo(effectId: number): Promise<void> {
  if (gEffectCache.has(effectId)) return Promise.resolve();
  if (gEffectPending.has(effectId)) return gEffectPending.get(effectId)!;

  const promise = fetch(`https://api.dofusdb.fr/effects/${effectId}?lang=fr`)
    .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
    .then((d) => {
      const isPercent: boolean   = d.isInPercent ?? false;
      const hideValue: boolean   = d.hideValueInTooltip ?? false;
      const elementId: number    = d.elementId ?? -1;
      const isElemental: boolean = elementId >= 1 && elementId <= 4;
      const raw: string          = d.description?.fr ?? "";
      const label = parseApiEffectLabel(raw) || `Effet #${effectId}`;
      gEffectCache.set(effectId, { label, isPercent, isElemental, hideValue });
    })
    .catch(() => {
      gEffectCache.set(effectId, { label: `Effet #${effectId}`, isPercent: false, isElemental: false, hideValue: false });
    })
    .finally(() => { gEffectPending.delete(effectId); });

  gEffectPending.set(effectId, promise);
  return promise;
}

export function getEffectLabel(eff: SpellEffect): string {
  return gEffectCache.get(eff.effectId)?.label ?? `Effet #${eff.effectId}`;
}

export function formatEffectValue(eff: SpellEffect): string {
  const info = gEffectCache.get(eff.effectId);
  if (info?.hideValue) return "";
  const { diceNum, diceSide, value } = eff;
  const MAX = MAX_DISPLAY_VALUE;
  let raw = "";
  if (diceNum > 0 && diceSide > 0 && diceNum !== diceSide && diceNum < MAX && diceSide < MAX)
    raw = `${diceNum} à ${diceSide}`;
  else if (diceNum > 0 && diceNum < MAX) raw = `${diceNum}`;
  else if (diceSide > 0 && diceSide < MAX) raw = `${diceSide}`;
  else if (value > 0 && value < MAX) raw = `${value}`;
  if (!raw) return "";
  return info?.isPercent ? `${raw}%` : raw;
}

export function resolveEffectElementIcon(eff: SpellEffect): { icon: string; label: string } | undefined {
  const info = gEffectCache.get(eff.effectId);
  if (!info?.isElemental) return undefined;
  if (eff.effectElement < 1 || eff.effectElement > 4) return undefined;
  return ELEMENT_ICONS[eff.effectElement];
}

export const DESC_ELEMENT_PATTERNS = [
  { word: "Terre", icon: "ter", label: "Terre" },
  { word: "Feu",   icon: "feu", label: "Feu"   },
  { word: "Eau",   icon: "eau", label: "Eau"   },
  { word: "Air",   icon: "air", label: "Air"   },
];

export function detectDescElements(desc: string) {
  if (desc.includes("meilleur élément")) return DESC_ELEMENT_PATTERNS;
  return DESC_ELEMENT_PATTERNS.filter(({ word }) => desc.includes(word));
}

/* ── Calcul de dégâts (Dofus 3) ──────────────────────────────────────────── */
export type CombatStats = Record<string, number>;

export const DAMAGE_ELEMENT_INFO: Record<number, {
  caracKey: "strength" | "intelligence" | "chance" | "agility";
  damageKey: "damage_earth" | "damage_fire" | "damage_water" | "damage_air" | "damage_neutral";
  colorClass: string;
}> = {
  0: { caracKey: "strength",     damageKey: "damage_neutral", colorClass: "text-[#a8a8a8]" },
  1: { caracKey: "strength",     damageKey: "damage_earth",   colorClass: "text-[#7faf3a]" },
  2: { caracKey: "intelligence", damageKey: "damage_fire",    colorClass: "text-[#e26e3c]" },
  3: { caracKey: "chance",       damageKey: "damage_water",   colorClass: "text-[#4ba4dd]" },
  4: { caracKey: "agility",      damageKey: "damage_air",     colorClass: "text-[#b8d040]" },
};

const SCALABLE_DAMAGE_EFFECT_IDS = new Set<number>([91, 92, 93, 94, 95, 96, 97, 98, 99, 100]);

function pickElementForCalc(
  eff: SpellEffect,
  stats: CombatStats,
  useBestElement: boolean,
): number {
  if (useBestElement) {
    const candidates: Array<[number, number]> = [
      [1, stats.strength ?? 0],
      [2, stats.intelligence ?? 0],
      [3, stats.chance ?? 0],
      [4, stats.agility ?? 0],
    ];
    candidates.sort((a, b) => b[1] - a[1]);
    return candidates[0][0];
  }
  return eff.effectElement;
}

export function spellUsesBestElement(desc: string): boolean {
  return desc.includes("meilleur élément");
}

/** Calcule la plage de dégâts réels pour un effet, à partir des stats fournies. */
export function computeEffectDamage(
  eff: SpellEffect,
  stats: CombatStats,
  opts: { isCrit: boolean; useBestElement: boolean },
): { min: number; max: number; element: number } | null {
  if (!SCALABLE_DAMAGE_EFFECT_IDS.has(eff.effectId)) return null;

  const { diceNum, diceSide } = eff;
  if (diceNum <= 0 || diceNum >= MAX_DISPLAY_VALUE) return null;

  const element = pickElementForCalc(eff, stats, opts.useBestElement);
  const info    = DAMAGE_ELEMENT_INFO[element];
  if (!info) return null;

  const power    = stats.power ?? 0;
  const carac    = stats[info.caracKey] ?? 0;
  const dmgFixes = (stats[info.damageKey] ?? 0) + (stats.damage ?? 0);
  const critFlat = opts.isCrit ? (stats.critical_damage ?? 0) : 0;
  const factor   = 1 + (power + carac) / 100;

  const minBase = diceNum;
  const maxBase = diceSide > diceNum ? diceSide : diceNum;

  return {
    min: Math.floor(minBase * factor + dmgFixes + critFlat),
    max: Math.floor(maxBase * factor + dmgFixes + critFlat),
    element,
  };
}

/** Charge les spell-levels pour un spell donné (fetchés par spellId). */
export async function fetchSpellLevels(spellId: number): Promise<SpellLevelData[]> {
  const r = await fetch(
    `https://api.dofusdb.fr/spell-levels?$skip=0&spellId=${spellId}&$sort[grade]=1&lang=fr`,
    { cache: "no-store" }
  );
  if (!r.ok) return [];
  const d = await r.json() as { data?: SpellLevelData[] };
  return d.data ?? [];
}
