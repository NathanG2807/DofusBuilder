/** Types d'équipement (slug DB) avec libellé français pour filtres. */

export const EQUIPMENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Tous les types" },
  { value: "hat", label: "Chapeau" },
  { value: "cloak", label: "Cape" },
  { value: "amulet", label: "Amulette" },
  { value: "ring", label: "Anneau" },
  { value: "belt", label: "Ceinture" },
  { value: "boots", label: "Bottes" },
  { value: "shield", label: "Bouclier" },
  { value: "dofus", label: "Dofus" },
  { value: "pet", label: "Familier" },
  { value: "trophy", label: "Trophée" },
  { value: "sword", label: "Épée" },
  { value: "wand", label: "Baguette" },
  { value: "staff", label: "Bâton" },
  { value: "dagger", label: "Dague" },
  { value: "bow", label: "Arc" },
  { value: "hammer", label: "Marteau" },
  { value: "shovel", label: "Pelle" },
  { value: "axe", label: "Hache" },
  { value: "lance", label: "Lance" },
  { value: "scythe", label: "Faux" },
  { value: "pickaxe", label: "Pioche" },
];

export function typeLabel(slug: string | null | undefined): string {
  if (!slug) return "—";
  const o = EQUIPMENT_TYPE_OPTIONS.find((x) => x.value === slug);
  return o?.label ?? slug;
}
