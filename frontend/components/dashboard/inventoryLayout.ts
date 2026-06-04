import type { SlotId } from "@/lib/slots";

/** Disposition type Dofusbook : gauche / droite du personnage, puis rangée Dofus + trophées. */
export const BOOK_LEFT_SLOTS: SlotId[] = [
  "amulet",
  "shield",
  "ring1",
  "belt",
  "boots",
];

export const BOOK_RIGHT_SLOTS: SlotId[] = [
  "hat",
  "weapon",
  "ring2",
  "cloak",
  "pet",
];

/** Les 6 emplacements dofus/trophées (confondus en jeu). */
export const BOOK_DOFUS_SLOTS: SlotId[] = [
  "dofus1",
  "dofus2",
  "dofus3",
  "dofus4",
  "dofus5",
  "dofus6",
];

/** Libellés courts pour les cases (style fiche compacte). */
export const SLOT_SHORT_LABEL: Record<SlotId, string> = {
  hat: "Chapeau",
  cloak: "Cape",
  amulet: "Amulette",
  ring1: "Anneau 1",
  ring2: "Anneau 2",
  belt: "Ceinture",
  boots: "Bottes",
  weapon: "Arme",
  shield: "Bouclier",
  dofus1: "Dofus/Trophée 1",
  dofus2: "Dofus/Trophée 2",
  dofus3: "Dofus/Trophée 3",
  dofus4: "Dofus/Trophée 4",
  dofus5: "Dofus/Trophée 5",
  dofus6: "Dofus/Trophée 6",
  pet: "Familier/Monture",
};
