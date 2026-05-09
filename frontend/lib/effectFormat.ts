/**
 * Formatage des effets d'items avec icônes élémentaires.
 * Les effets bruts (dofusdude) contiennent int_minimum, int_maximum, type.name/id et formatted.
 */

import { STAT_GROUPS } from "@/lib/statLabels";

type RawEffect = Record<string, unknown>;

// ── Lookup statKey → icon (construit depuis STAT_GROUPS) ──────────────────────
const STAT_KEY_TO_ICON: Record<string, string> = {
  // PA et PM ne sont pas dans STAT_GROUPS mais ont leurs propres assets
  pa: "pa",
  pm: "pm",
};
for (const group of STAT_GROUPS) {
  for (const stat of group.stats) {
    STAT_KEY_TO_ICON[stat.key] = stat.icon;
  }
}

// ── Mapping ID d'effet → statKey (miroir de effect_mapping.py, IDs vérifiés en DB) ───
const EFFECT_ID_TO_KEY: Record<number, string> = {
  // Caractéristiques primaires
  8:   "pm",
  9:   "vitality",
  10:  "wisdom",
  12:  "pa",
  13:  "intelligence",
  22:  "chance",
  24:  "initiative",
  25:  "prospecting",
  26:  "lock",
  28:  "summons",
  29:  "critical_percent",
  30:  "damage",
  31:  "range",
  32:  "power",
  36:  "agility",
  45:  "strength",
  59:  "dodge",
  75:  "dodge_pa",
  39:  "dodge_pm",
  64:  "trap_pa",
  50:  "trap_pm",
  121: "heals",
  220: "pods",
  179: "pa",
  238: "pm",
  // Dommages
  27:  "damage_water",
  47:  "damage_air",
  48:  "damage_earth",
  49:  "damage_neutral",
  61:  "damage_fire",
  62:  "damage_push",
  38:  "critical_damage",
  71:  "distance_damage",
  41:  "damage_weapon_percent",
  93:  "damage_spell_percent",
  189: "damage_air",
  194: "damage_earth",
  195: "damage_neutral",
  198: "damage_fire",
  214: "damage_water",
  193: "damage_fire",
  203: "damage_water",
  // Résistances fixes
  14:  "resistance_fire",
  15:  "resistance_earth",
  33:  "resistance_neutral",
  60:  "resistance_air",
  70:  "resistance_push",
  82:  "resistance_water",
  46:  "resistance_critical",
  // Résistances %
  16:  "resistance_air_percent",
  17:  "resistance_water_percent",
  34:  "resistance_neutral_percent",
  37:  "resistance_fire_percent",
  63:  "resistance_earth_percent",
  65:  "resistance_melee_percent",
  108: "resistance_distance_percent",
  // Dégâts en vol / Lifesteal (vol de vitalité par élément)
  79:  "damage_water",
  80:  "damage_fire",
  83:  "damage_air",
  84:  "damage_earth",
  86:  "damage_neutral",
  224: "damage_air",
};

// ── Mapping nom d'effet → statKey ─────────────────────────────────────────────
const EFFECT_NAME_TO_KEY: Record<string, string> = {
  // Caractéristiques primaires
  vitality: "vitality",
  vitalité: "vitality",
  strength: "strength",
  force: "strength",
  intelligence: "intelligence",
  chance: "chance",
  agility: "agility",
  agilité: "agility",
  wisdom: "wisdom",
  sagesse: "wisdom",
  ap: "pa",
  mp: "pm",
  power: "power",
  puissance: "power",
  initiative: "initiative",
  prospecting: "prospecting",
  prospection: "prospecting",
  dodge: "dodge",
  fuite: "dodge",
  lock: "lock",
  tacle: "lock",
  summons: "summons",
  invocations: "summons",
  range: "range",
  portée: "range",
  pods: "pods",
  heals: "heals",
  soins: "heals",
  // Esquive / Retrait PA-PM (noms FR et EN)
  "esquive pa": "dodge_pa",
  "esquive pm": "dodge_pm",
  "ap dodge": "dodge_pa",
  "mp dodge": "dodge_pm",
  "pa dodge": "dodge_pa",
  "pm dodge": "dodge_pm",
  "retrait pa": "trap_pa",
  "retrait pm": "trap_pm",
  "retrait de pa": "trap_pa",
  "retrait de pm": "trap_pm",
  "ap reduction": "trap_pa",
  "mp reduction": "trap_pm",
  // Coups critiques
  "% critical": "critical_percent",
  "% critique": "critical_percent",
  "% coups critiques": "critical_percent",
  // Dommages directs (noms EN + FR)
  "earth damage": "damage_earth",
  "dommages terre": "damage_earth",
  "fire damage": "damage_fire",
  "dommages feu": "damage_fire",
  "water damage": "damage_water",
  "dommages eau": "damage_water",
  "air damage": "damage_air",
  "dommages air": "damage_air",
  "neutral damage": "damage_neutral",
  "dommages neutre": "damage_neutral",
  "damage": "damage",
  "dommages": "damage",
  "critical damage": "critical_damage",
  "dommages critiques": "critical_damage",
  "distance damage": "distance_damage",
  "dommages à distance": "distance_damage",
  "push damage": "damage_push",
  "dommages de poussée": "damage_push",
  "% spell damage": "damage_spell_percent",
  "% dommages sorts": "damage_spell_percent",
  "% weapon damage": "damage_weapon_percent",
  "% dommages d'armes": "damage_weapon_percent",
  // Dégâts en vol / Lifesteal (FR)
  "vol de vitalité eau": "damage_water",
  "vol de vitalité feu": "damage_fire",
  "vol de vitalité air": "damage_air",
  "vol de vitalité terre": "damage_earth",
  "vol de vitalité neutre": "damage_neutral",
  "vol eau": "damage_water",
  "vol feu": "damage_fire",
  "vol air": "damage_air",
  "vol terre": "damage_earth",
  "vol neutre": "damage_neutral",
  "dommages en vol eau": "damage_water",
  "dommages en vol feu": "damage_fire",
  "dommages en vol air": "damage_air",
  "dommages en vol terre": "damage_earth",
  "dommages en vol neutre": "damage_neutral",
  // Lifesteal (EN)
  "water life steal": "damage_water",
  "fire life steal": "damage_fire",
  "air life steal": "damage_air",
  "earth life steal": "damage_earth",
  "neutral life steal": "damage_neutral",
  "water steal damage": "damage_water",
  "fire steal damage": "damage_fire",
  "air steal damage": "damage_air",
  "earth steal damage": "damage_earth",
  "neutral steal damage": "damage_neutral",
  // Résistances fixes (noms FR + EN)
  "earth resistance": "resistance_earth",
  "résistance terre": "resistance_earth",
  "fire resistance": "resistance_fire",
  "résistance feu": "resistance_fire",
  "water resistance": "resistance_water",
  "résistance eau": "resistance_water",
  "air resistance": "resistance_air",
  "résistance air": "resistance_air",
  "neutral resistance": "resistance_neutral",
  "résistance neutre": "resistance_neutral",
  // Résistances % (noms FR + EN)
  "% earth resistance": "resistance_earth_percent",
  "% résistance terre": "resistance_earth_percent",
  "% fire resistance": "resistance_fire_percent",
  "% résistance feu": "resistance_fire_percent",
  "% water resistance": "resistance_water_percent",
  "% résistance eau": "resistance_water_percent",
  "% air resistance": "resistance_air_percent",
  "% résistance air": "resistance_air_percent",
  "% neutral resistance": "resistance_neutral_percent",
  "% résistance neutre": "resistance_neutral_percent",
  // Résistances critiques / distance / mêlée / poussée / armes
  "critical resistance": "resistance_critical",
  "résistance critique": "resistance_critical",
  "résistances critiques": "resistance_critical",
  "% distance resistance": "resistance_distance_percent",
  "% résistance distance": "resistance_distance_percent",
  "% résistances à distance": "resistance_distance_percent",
  "% melee resistance": "resistance_melee_percent",
  "% résistance mêlée": "resistance_melee_percent",
  "% résistances de mêlée": "resistance_melee_percent",
  "push resistance": "resistance_push",
  "résistance poussée": "resistance_push",
  "% weapon resistance": "resistance_weapon_percent",
  "% résistance d'armes": "resistance_weapon_percent",
};

// ── Table élément → statKey pour les patterns ────────────────────────────────
const ELEMENT_TO_DAMAGE_KEY: Record<string, string> = {
  feu: "damage_fire", fire: "damage_fire",
  eau: "damage_water", water: "damage_water",
  air: "damage_air",
  terre: "damage_earth", earth: "damage_earth",
  neutre: "damage_neutral", neutral: "damage_neutral",
};

export function effectTypeToStatKey(type: { name?: string; id?: number } | null): string | null {
  if (!type) return null;
  if (type.id != null && EFFECT_ID_TO_KEY[type.id]) return EFFECT_ID_TO_KEY[type.id];
  const name = type.name?.trim().toLowerCase() ?? "";
  if (!name) return null;
  if (EFFECT_NAME_TO_KEY[name]) return EFFECT_NAME_TO_KEY[name];

  // Pattern "vol de vitalité [element]" ou "dommages en vol [element]"
  const mVol = name.match(/^(?:vol(?:\s+de\s+vitalit[eé])?|dommages\s+en\s+vol)\s+(.+)$/);
  if (mVol) {
    const el = mVol[1].trim();
    if (ELEMENT_TO_DAMAGE_KEY[el]) return ELEMENT_TO_DAMAGE_KEY[el];
  }
  // Pattern "vol [element] de vitalité" ou variantes
  const mVolInv = name.match(/^vol\s+(.+?)\s+(?:de\s+vitalit[eé]|steal)?$/);
  if (mVolInv) {
    const el = mVolInv[1].trim();
    if (ELEMENT_TO_DAMAGE_KEY[el]) return ELEMENT_TO_DAMAGE_KEY[el];
  }

  // "% résistance X" → resistance_X_percent
  const mResFr = name.match(/^%\s*résistances?\s+(.+)$/);
  if (mResFr) {
    const el = mResFr[1].trim();
    const elMap: Record<string, string> = { feu: "fire", terre: "earth", eau: "water", air: "air", neutre: "neutral" };
    if (elMap[el]) return `resistance_${elMap[el]}_percent`;
  }
  // "% X resistance" (EN) → resistance_X_percent
  const mResEn = name.match(/^%\s*(.+?)\s+resistance$/);
  if (mResEn) return `resistance_${mResEn[1].trim().replace(/\s+/g, "_")}_percent`;
  // "X damage" (EN) → damage_X
  const mDmg = name.match(/^(.+?)\s+damage$/);
  if (mDmg) {
    const el = mDmg[1].trim();
    if (["earth", "fire", "water", "air", "neutral"].includes(el)) return `damage_${el}`;
  }
  return null;
}

/**
 * Pour une arme : aligné sur l’API Dofus : seules les lignes avec `type.is_active === true`
 * (jets au hit — dommages, vol, malus ponctuel marqués actifs, etc.) vont sous « Dégâts ».
 */
export function isWeaponDamagesBucketEffect(eff: RawEffect): boolean {
  const type = eff.type as { is_active?: boolean } | null;
  return type?.is_active === true;
}

/** Icône (chemin fichier sans .png) pour un effet brut, ou null si inconnue. */
export function effectIcon(eff: RawEffect): string | null {
  const type = eff.type as { name?: string; id?: number } | null;
  const key = effectTypeToStatKey(type ?? null);
  if (!key) return null;
  return STAT_KEY_TO_ICON[key] ?? null;
}

/**
 * Retourne l'affichage "jet max uniquement" pour un effet.
 * Ex : { int_minimum:10, int_maximum:50, type:{name:"Vitalité"} } → "50 Vitalité"
 * Si les bornes sont ignorées ou absentes, replie sur `formatted`.
 */
export function effectMaxLabel(eff: RawEffect): string {
  const type = (eff.type as { name?: string } | null)?.name ?? "";
  const ignoreMin = Boolean(eff.ignore_int_min);
  const ignoreMax = Boolean(eff.ignore_int_max);

  if (ignoreMin && ignoreMax) {
    return (eff.formatted as string) ?? "";
  }

  const min =
    typeof eff.int_minimum === "number"
      ? eff.int_minimum
      : typeof eff.int_minimum === "string"
      ? parseInt(eff.int_minimum, 10)
      : 0;
  const max =
    typeof eff.int_maximum === "number"
      ? eff.int_maximum
      : typeof eff.int_maximum === "string"
      ? parseInt(eff.int_maximum, 10)
      : 0;

  const value = ignoreMax ? min : min < 0 ? min : Math.max(min, max);

  if (!type) return (eff.formatted as string) ?? String(value);
  return `${value} ${type}`;
}

/**
 * Retourne l'affichage complet "de X à Y TypeNom" pour les effets actifs (dégâts d'arme).
 * Si min === max ou si une borne est ignorée, simplifie en "X TypeNom".
 */
export function effectRangeLabel(eff: RawEffect): string {
  const type = (eff.type as { name?: string } | null)?.name ?? "";
  const ignoreMin = Boolean(eff.ignore_int_min);
  const ignoreMax = Boolean(eff.ignore_int_max);

  if (ignoreMin && ignoreMax) {
    return (eff.formatted as string) ?? "";
  }

  const min =
    typeof eff.int_minimum === "number"
      ? eff.int_minimum
      : typeof eff.int_minimum === "string"
      ? parseInt(eff.int_minimum, 10)
      : 0;
  const max =
    typeof eff.int_maximum === "number"
      ? eff.int_maximum
      : typeof eff.int_maximum === "string"
      ? parseInt(eff.int_maximum, 10)
      : 0;

  const suffix = type ? ` ${type}` : "";

  if (ignoreMax || min === max) {
    return `${min}${suffix}`;
  }
  return `${min} à ${max}${suffix}`;
}
