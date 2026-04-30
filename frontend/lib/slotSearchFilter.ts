import type { ItemSearchParams } from "@/lib/api";
import type { SlotId } from "@/lib/slots";

/** Filtres API pour ne montrer que des objets compatibles avec l’emplacement choisi. */
export function searchFiltersForSlot(
  slot: SlotId | null,
): Partial<ItemSearchParams> {
  if (!slot) return {};
  if (slot === "weapon") return { is_weapon: true };
  if (slot === "ring1" || slot === "ring2") return { type_name_id: "ring" };
  if (slot.startsWith("dofus")) return { type_name_id: "dofus" };
  if (slot.startsWith("trophy")) return { type_name_id: "trophy" };
  if (
    slot === "hat" ||
    slot === "cloak" ||
    slot === "amulet" ||
    slot === "belt" ||
    slot === "boots" ||
    slot === "shield" ||
    slot === "pet"
  ) {
    return { type_name_id: slot };
  }
  return {};
}
