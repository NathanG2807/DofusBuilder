import type { ItemSearchParams } from "@/lib/api";
import type { SlotId } from "@/lib/slots";

/** Filtres API pour ne montrer que des objets compatibles avec l’emplacement choisi. */
export function searchFiltersForSlot(
  slot: SlotId | null,
): Partial<ItemSearchParams> {
  if (!slot) return {};
  if (slot === "weapon") return { is_weapon: true };
  if (slot === "ring1" || slot === "ring2") return { type_name_id: "ring" };
  if (slot.startsWith("dofus")) return { type_name_id: ["dofus", "trophy"] };
  if (slot === "pet") return { type_name_id: ["pet", "mount"] };
  if (
    slot === "hat" ||
    slot === "cloak" ||
    slot === "amulet" ||
    slot === "belt" ||
    slot === "boots" ||
    slot === "shield"
  ) {
    return { type_name_id: slot };
  }
  return {};
}
