import type { ItemOut } from "@/types/api";
import type { SlotId } from "@/lib/slots";

/** Aligné sur `app/solver/slots.py` — un objet peut-il aller dans cet emplacement ? */
export function itemFitsSlot(slot: SlotId, item: ItemOut): boolean {
  const t = item.type_name_id ?? "";
  if (t.includes("certificate") || t.startsWith("perceptor-")) return false;
  if (t === "tool" || t === "sidekick" || t === "prysmaradite") return false;
  if (!t && slot !== "weapon") return false;

  if (["hat", "cloak", "amulet", "belt", "boots"].includes(slot)) {
    return t === slot;
  }
  if (slot === "ring1" || slot === "ring2") return t === "ring";
  if (slot === "weapon") return item.is_weapon;
  if (slot === "shield") return t === "shield";
  // Les 6 emplacements dofus acceptent dofus ET trophées (fusionnés en jeu).
  if (slot.startsWith("dofus")) return t === "dofus" || t === "trophy";
  if (slot === "pet") return t === "pet";
  return false;
}
