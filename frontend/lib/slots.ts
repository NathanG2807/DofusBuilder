import type { FullBuild } from "@/types/api";

/**
 * Même ordre que `app/solver/slots.py` (backend).
 * Les 6 emplacements dofus1–6 acceptent aussi bien les Dofus que les Trophées.
 */
export const SLOT_DEFS = [
  { id: "hat", label: "Chapeau" },
  { id: "cloak", label: "Cape" },
  { id: "amulet", label: "Amulette" },
  { id: "ring1", label: "Anneau 1" },
  { id: "ring2", label: "Anneau 2" },
  { id: "belt", label: "Ceinture" },
  { id: "boots", label: "Bottes" },
  { id: "weapon", label: "Arme" },
  { id: "shield", label: "Bouclier" },
  { id: "dofus1", label: "Dofus / Trophée 1" },
  { id: "dofus2", label: "Dofus / Trophée 2" },
  { id: "dofus3", label: "Dofus / Trophée 3" },
  { id: "dofus4", label: "Dofus / Trophée 4" },
  { id: "dofus5", label: "Dofus / Trophée 5" },
  { id: "dofus6", label: "Dofus / Trophée 6" },
  { id: "pet", label: "Familier" },
] as const;

export type SlotId = (typeof SLOT_DEFS)[number]["id"];

export function emptyBuild(): Record<SlotId, number | null> {
  return Object.fromEntries(SLOT_DEFS.map((s) => [s.id, null])) as Record<
    SlotId,
    number | null
  >;
}

export function mergeFullBuildSlots(fb: FullBuild): Record<SlotId, number | null> {
  const base = emptyBuild();
  for (const s of SLOT_DEFS) {
    const v = fb.slots[s.id];
    base[s.id] = v === undefined || v === null ? null : v;
  }
  return base;
}
