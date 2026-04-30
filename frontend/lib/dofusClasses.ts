/**
 * Identifiants de classe (breed) tels qu’utilisés côté Ankama / outils (ex. `class_id` en base).
 * L’OpenAPI DofusDude (API_YAML) ne fournit pas d’endpoint “classes” : on fige ici l’ordre
 * des classes Dofus, noms affichés en français.
 * Note: Forgelance est stocké en id 20 dans les assets locaux.
 */
export const DOFUS_CLASS_BY_ID: Record<
  number,
  { name: string; nameId: string }
> = {
  1: { name: "Féca", nameId: "feca" },
  2: { name: "Osamodas", nameId: "osamodas" },
  3: { name: "Enutrof", nameId: "enutrof" },
  4: { name: "Sram", nameId: "sram" },
  5: { name: "Xélor", nameId: "xelor" },
  6: { name: "Écaflip", nameId: "ecaflip" },
  7: { name: "Eniripsa", nameId: "eniripsa" },
  8: { name: "Iop", nameId: "iop" },
  9: { name: "Cra", nameId: "cra" },
  10: { name: "Sadida", nameId: "sadida" },
  11: { name: "Sacrieur", nameId: "sacrieur" },
  12: { name: "Pandawa", nameId: "pandawa" },
  13: { name: "Roublard", nameId: "roublard" },
  14: { name: "Zobal", nameId: "zobal" },
  15: { name: "Steamer", nameId: "steamer" },
  16: { name: "Eliotrope", nameId: "eliotrope" },
  17: { name: "Huppermage", nameId: "huppermage" },
  18: { name: "Ouginak", nameId: "ouginak" },
  // Compat ancien mapping
  19: { name: "Forgelance", nameId: "forgelance" },
  20: { name: "Forgelance", nameId: "forgelance" },
} as const;

// Ordre explicite côté UI (évite le doublon 19/20 dans la liste).
const DOFUS_CLASS_UI_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20,
] as const;

export const DOFUS_CLASS_OPTIONS: { id: number; label: string }[] =
  DOFUS_CLASS_UI_IDS.map((id) => ({
    id,
    label: DOFUS_CLASS_BY_ID[id].name,
  }));

export function dofusClassLabel(id: number): string {
  return DOFUS_CLASS_BY_ID[id]?.name ?? `Classe #${id}`;
}
