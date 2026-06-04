/** Miroir de `backend/app/item_name_filters.py` — items masqués catalogue / builds. */
export const EXCLUDED_ITEM_IDS = new Set<number>([
  9031, // Annobusé de Maître Jarbo
  2155, // Amulette de Jiva
  6713, // Lorsotheuses
]);

export function isExcludedItemId(ankamaId: number): boolean {
  return EXCLUDED_ITEM_IDS.has(ankamaId);
}
