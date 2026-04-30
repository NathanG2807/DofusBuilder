/** Libellés et organisation des stats (aligné solver + assets elements). */

export const STAT_LABEL_FR: Record<string, string> = {
  // Primaires
  pa: "PA",
  pm: "PM",
  vitality: "Vitalité",
  wisdom: "Sagesse",
  strength: "Force",
  intelligence: "Intelligence",
  chance: "Chance",
  agility: "Agilité",
  power: "Puissance",
  critical_percent: "% CC",
  prospecting: "Prospection",
  pods: "Pods",
  initiative: "Initiative",
  range: "Portée",
  summons: "Invocations",
  dodge: "Fuite",
  lock: "Tacle",
  heals: "Soins",
  dodge_pa: "Esquive PA",
  dodge_pm: "Esquive PM",
  trap_pa: "Retrait PA",
  trap_pm: "Retrait PM",
  // Dommages
  damage: "Dommages",
  damage_earth: "Dmg Terre",
  damage_fire: "Dmg Feu",
  damage_water: "Dmg Eau",
  damage_air: "Dmg Air",
  damage_neutral: "Dmg Neutre",
  critical_damage: "Dmg Critiques",
  distance_damage: "Dmg Distance",
  damage_push: "Dmg Poussée",
  damage_spell_percent: "% Dmg Sorts",
  damage_weapon_percent: "% Dmg Armes",
  // Résistances
  resistance_earth: "Rés. Terre",
  resistance_earth_percent: "% Rés. Terre",
  resistance_fire: "Rés. Feu",
  resistance_fire_percent: "% Rés. Feu",
  resistance_water: "Rés. Eau",
  resistance_water_percent: "% Rés. Eau",
  resistance_air: "Rés. Air",
  resistance_air_percent: "% Rés. Air",
  resistance_neutral: "Rés. Neutre",
  resistance_neutral_percent: "% Rés. Neutre",
  resistance_critical: "Rés. Crit.",
  resistance_distance_percent: "% Rés. Dist.",
  resistance_melee_percent: "% Rés. Mêlée",
  resistance_push: "Rés. Poussée",
  resistance_weapon_percent: "% Rés. Armes",
};

export function labelStat(key: string): string {
  return STAT_LABEL_FR[key] ?? key.replace(/_/g, " ");
}

export type StatDef = { key: string; label: string; icon: string };

export const STAT_GROUPS: { title: string; stats: StatDef[] }[] = [
  {
    title: "Primaires",
    stats: [
      { key: "vitality",     label: "Vitalité",     icon: "vi"  },
      { key: "wisdom",       label: "Sagesse",      icon: "sa"  },
      { key: "strength",     label: "Force",        icon: "ter" },
      { key: "chance",       label: "Chance",       icon: "eau" },
      { key: "agility",      label: "Agilité",      icon: "air" },
      { key: "intelligence", label: "Intelligence", icon: "feu" },
    ],
  },
  {
    title: "Secondaires",
    stats: [
      { key: "power",            label: "Puissance",    icon: "pu"  },
      { key: "critical_percent", label: "% CC",         icon: "cc"  },
      { key: "prospecting",      label: "Prospection",  icon: "pp"  },
      { key: "pods",             label: "Pods",         icon: "pd"  },
      { key: "initiative",       label: "Initiative",   icon: "ii"  },
      { key: "range",            label: "Portée",       icon: "po"  },
      { key: "summons",          label: "Invocations",  icon: "ic"  },
      { key: "dodge",            label: "Fuite",        icon: "fu"  },
      { key: "lock",             label: "Tacle",        icon: "ta"  },
      { key: "heals",            label: "Soins",        icon: "so"  },
      { key: "dodge_pa",         label: "Esquive PA",   icon: "epa" },
      { key: "dodge_pm",         label: "Esquive PM",   icon: "epm" },
      { key: "trap_pa",          label: "Retrait PA",   icon: "rpa" },
      { key: "trap_pm",          label: "Retrait PM",   icon: "rpm" },
    ],
  },
  {
    title: "Dommages",
    stats: [
      { key: "damage",                label: "Dommages",  icon: "dmg" },
      { key: "damage_earth",          label: "Terre",     icon: "dtf" },
      { key: "damage_fire",           label: "Feu",       icon: "dff" },
      { key: "damage_water",          label: "Eau",       icon: "def" },
      { key: "damage_air",            label: "Air",       icon: "daf" },
      { key: "damage_neutral",        label: "Neutre",    icon: "dnf" },
      { key: "critical_damage",       label: "Critiques", icon: "dc"  },
      { key: "distance_damage",       label: "Distance",  icon: "dd"  },
      { key: "damage_push",           label: "Poussée",   icon: "dp"  },
      { key: "damage_spell_percent",  label: "% Sorts",   icon: "ds"  },
      { key: "damage_weapon_percent", label: "% Armes",   icon: "dw"  },
    ],
  },
  {
    title: "Résistances",
    stats: [
      { key: "resistance_earth",            label: "Terre",    icon: "rt"  },
      { key: "resistance_earth_percent",    label: "% Terre",  icon: "rtp" },
      { key: "resistance_fire",             label: "Feu",      icon: "rf"  },
      { key: "resistance_fire_percent",     label: "% Feu",    icon: "rfp" },
      { key: "resistance_water",            label: "Eau",      icon: "re"  },
      { key: "resistance_water_percent",    label: "% Eau",    icon: "rep" },
      { key: "resistance_air",              label: "Air",      icon: "ra"  },
      { key: "resistance_air_percent",      label: "% Air",    icon: "rap" },
      { key: "resistance_neutral",          label: "Neutre",   icon: "rn"  },
      { key: "resistance_neutral_percent",  label: "% Neutre", icon: "rnp" },
      { key: "resistance_critical",         label: "Crit.",    icon: "rc"  },
      { key: "resistance_distance_percent", label: "% Dist.",  icon: "rd"  },
      { key: "resistance_melee_percent",    label: "% Mêlée",  icon: "rm"  },
      { key: "resistance_push",             label: "Poussée",  icon: "rp"  },
      { key: "resistance_weapon_percent",   label: "% Armes",  icon: "rw"  },
    ],
  },
];

/** Pour rétrocompat (utilisé dans le catalogue). */
export const BASIC_STATS = STAT_GROUPS[0].stats;

/** Options pour filtre « stat minimale » dans le catalogue. */
export const CATALOG_STAT_KEYS: { value: string; label: string }[] = [
  { value: "pa", label: "PA" },
  { value: "pm", label: "PM" },
  { value: "vitality", label: "Vitalité" },
  { value: "strength", label: "Force" },
  { value: "intelligence", label: "Intelligence" },
  { value: "chance", label: "Chance" },
  { value: "agility", label: "Agilité" },
  { value: "wisdom", label: "Sagesse" },
  { value: "critical_percent", label: "% Critique" },
  { value: "damage_earth", label: "Dmg Terre" },
  { value: "damage_fire", label: "Dmg Feu" },
  { value: "damage_water", label: "Dmg Eau" },
  { value: "damage_air", label: "Dmg Air" },
];

/** Cases à cocher pour l'optimiseur (clés envoyées au solver). */
export const OPTIMIZE_FOCUS_OPTIONS: { key: string; label: string }[] = [
  { key: "damage_earth", label: "Dommages Terre" },
  { key: "damage_fire", label: "Dommages Feu" },
  { key: "damage_water", label: "Dommages Eau" },
  { key: "damage_air", label: "Dommages Air" },
  { key: "damage_neutral", label: "Dommages Neutre" },
  { key: "critical_percent", label: "% Coup critique" },
  { key: "vitality", label: "Vitalité" },
  { key: "pa", label: "PA" },
  { key: "pm", label: "PM" },
  { key: "prospecting", label: "Prospection" },
  { key: "initiative", label: "Initiative" },
];
