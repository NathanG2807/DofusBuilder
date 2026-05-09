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

/**
 * Correspondance entre le classId interne de l'application et le typeId
 * utilisé par l'API dofusdb pour les sorts.
 * La plupart sont identiques ; seule exception : Forgelance (20 → 2374).
 */
export const CLASS_TO_SPELL_TYPE_ID: Record<number, number> = {
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8,
  9: 9, 10: 10, 11: 11, 12: 12, 13: 13, 14: 14, 15: 15,
  16: 16, 17: 17, 18: 18,
  19: 2374, 20: 2374,
};

/**
 * Correspondance entre le classId interne et le breedId utilisé par
 * l'API dofusdb pour les spell-variants.
 * Pour les classes standard, breedId = classId.
 * Forgelance utilise 20 comme breedId (id 19 est un alias legacy).
 */
export const CLASS_TO_BREED_ID: Record<number, number> = {
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8,
  9: 9, 10: 10, 11: 11, 12: 12, 13: 13, 14: 14, 15: 15,
  16: 16, 17: 17, 18: 18,
  19: 20, 20: 20,
};
