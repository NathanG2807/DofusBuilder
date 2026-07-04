import type { CraftEntry, IngredientProgress, ItemOut, RecipeLine } from "@/types/api";

export type ItemQuantityMap = Map<number, number>;

export function slotsToItemCounts(
  slots: Record<string, number | null>,
): ItemQuantityMap {
  const counts = new Map<number, number>();
  for (const id of Object.values(slots)) {
    if (id == null) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export function scaleItemCounts(
  counts: ItemQuantityMap,
  multiplier: number,
): ItemQuantityMap {
  const scaled = new Map<number, number>();
  for (const [id, qty] of counts) {
    scaled.set(id, qty * multiplier);
  }
  return scaled;
}

export async function resolveEntryItemCounts(
  entry: CraftEntry,
  /** IDs des pièces d'une panoplie (via parent_set_id, pas equipment_ids). */
  fetchSetItemIds: (setId: number) => Promise<number[]>,
): Promise<ItemQuantityMap> {
  if (entry.entry_type === "item") {
    const id = parseInt(entry.ref_id, 10);
    return new Map([[id, entry.quantity]]);
  }
  if (entry.entry_type === "set") {
    const setId = parseInt(entry.ref_id, 10);
    const ids = await fetchSetItemIds(setId);
    const counts = new Map<number, number>();
    for (const id of ids) {
      counts.set(id, entry.quantity);
    }
    return counts;
  }
  if (entry.entry_type === "build" && entry.slots) {
    return scaleItemCounts(slotsToItemCounts(entry.slots), entry.quantity);
  }
  return new Map();
}

export type EntryIngredientNeed = {
  ingredientId: number;
  required: number;
};

export type AggregatedIngredient = {
  ingredientId: number;
  required: number;
  owned: number;
  validated: number;
  remaining: number;
};

export type EntryBreakdown = {
  entry: CraftEntry;
  itemCounts: ItemQuantityMap;
  ingredients: EntryIngredientNeed[];
  entryValidated: boolean;
};

export function recipeLines(item: ItemOut | undefined): RecipeLine[] {
  if (!item?.recipe?.length) return [];
  return item.recipe;
}

export function aggregateIngredientNeeds(
  entries: CraftEntry[],
  entryItemCounts: Map<string, ItemQuantityMap>,
  itemCache: Record<number, ItemOut>,
): Map<number, number> {
  const totals = new Map<number, number>();
  for (const entry of entries) {
    const counts = entryItemCounts.get(entry.id);
    if (!counts) continue;
    for (const [itemId, craftQty] of counts) {
      const item = itemCache[itemId];
      for (const line of recipeLines(item)) {
        const ingId = line.item_ankama_id;
        const add = line.quantity * craftQty;
        totals.set(ingId, (totals.get(ingId) ?? 0) + add);
      }
    }
  }
  return totals;
}

export function buildAggregatedIngredients(
  needs: Map<number, number>,
  progress: Record<string, IngredientProgress>,
): AggregatedIngredient[] {
  return [...needs.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ingredientId, required]) => {
      const p = progress[String(ingredientId)] ?? { owned: 0, validated: 0 };
      const validated = Math.min(p.validated, required);
      return {
        ingredientId,
        required,
        owned: p.owned,
        validated,
        remaining: Math.max(0, required - validated),
      };
    });
}

/** Allocation FIFO du validated global vers chaque entrée. */
export function allocateEntryIngredients(
  entry: CraftEntry,
  itemCounts: ItemQuantityMap,
  itemCache: Record<number, ItemOut>,
  globalProgress: Record<string, IngredientProgress>,
  priorEntriesValidated: Map<number, number>,
): EntryIngredientNeed[] {
  const needs: EntryIngredientNeed[] = [];
  const entryNeeds = new Map<number, number>();

  for (const [itemId, craftQty] of itemCounts) {
    for (const line of recipeLines(itemCache[itemId])) {
      const ingId = line.item_ankama_id;
      const add = line.quantity * craftQty;
      entryNeeds.set(ingId, (entryNeeds.get(ingId) ?? 0) + add);
    }
  }

  for (const [ingredientId, required] of entryNeeds) {
    const key = String(ingredientId);
    const globalValidated = globalProgress[key]?.validated ?? 0;
    const consumedBefore = priorEntriesValidated.get(ingredientId) ?? 0;
    const availableForEntry = Math.max(0, globalValidated - consumedBefore);
    needs.push({
      ingredientId,
      required,
      validated: Math.min(required, availableForEntry),
      remaining: Math.max(0, required - Math.min(required, availableForEntry)),
    } as EntryIngredientNeed & { validated: number; remaining: number });
  }

  return needs;
}

export type EntryIngredientRow = EntryIngredientNeed & {
  validated: number;
  remaining: number;
};

export function computeEntryIngredientRows(
  entry: CraftEntry,
  itemCounts: ItemQuantityMap,
  itemCache: Record<number, ItemOut>,
  globalProgress: Record<string, IngredientProgress>,
  priorEntriesValidated: Map<number, number>,
): EntryIngredientRow[] {
  const rows: EntryIngredientRow[] = [];
  const entryNeeds = new Map<number, number>();

  for (const [itemId, craftQty] of itemCounts) {
    for (const line of recipeLines(itemCache[itemId])) {
      const ingId = line.item_ankama_id;
      entryNeeds.set(ingId, (entryNeeds.get(ingId) ?? 0) + line.quantity * craftQty);
    }
  }

  for (const [ingredientId, required] of entryNeeds) {
    const key = String(ingredientId);
    const globalValidated = globalProgress[key]?.validated ?? 0;
    const consumedBefore = priorEntriesValidated.get(ingredientId) ?? 0;
    const availableForEntry = Math.max(0, globalValidated - consumedBefore);
    const validated = Math.min(required, availableForEntry);
    rows.push({
      ingredientId,
      required,
      validated,
      remaining: Math.max(0, required - validated),
    });
  }

  return rows.sort((a, b) => a.ingredientId - b.ingredientId);
}

/** Met à jour priorEntriesValidated après traitement d'une entrée (FIFO). */
export function consumeValidatedForEntry(
  rows: EntryIngredientRow[],
  prior: Map<number, number>,
): Map<number, number> {
  const next = new Map(prior);
  for (const row of rows) {
    next.set(row.ingredientId, (next.get(row.ingredientId) ?? 0) + row.validated);
  }
  return next;
}

export function validateIngredientFully(
  progress: Record<string, IngredientProgress>,
  ingredientId: number,
  required: number,
): Record<string, IngredientProgress> {
  const key = String(ingredientId);
  const prev = progress[key] ?? { owned: 0, validated: 0 };
  return {
    ...progress,
    [key]: { ...prev, validated: Math.max(prev.validated, required) },
  };
}

export function setIngredientOwned(
  progress: Record<string, IngredientProgress>,
  ingredientId: number,
  owned: number,
  required: number,
): Record<string, IngredientProgress> {
  const key = String(ingredientId);
  const prev = progress[key] ?? { owned: 0, validated: 0 };
  const clampedOwned = Math.max(0, owned);
  return {
    ...progress,
    [key]: {
      owned: clampedOwned,
      validated: Math.max(prev.validated, Math.min(clampedOwned, required)),
    },
  };
}

export function validateEntryRecipe(
  progress: Record<string, IngredientProgress>,
  rows: EntryIngredientRow[],
  globalNeeds: Map<number, number>,
): Record<string, IngredientProgress> {
  let next = { ...progress };
  for (const row of rows) {
    const globalRequired = globalNeeds.get(row.ingredientId) ?? row.required;
    const key = String(row.ingredientId);
    const prev = next[key] ?? { owned: 0, validated: 0 };
    const targetValidated = (prev.validated ?? 0) + row.remaining;
    next = {
      ...next,
      [key]: {
        ...prev,
        validated: Math.min(globalRequired, Math.max(prev.validated, targetValidated)),
      },
    };
  }
  return next;
}

export function listProgressPercent(
  aggregated: AggregatedIngredient[],
): number {
  if (aggregated.length === 0) return 100;
  const score = aggregated.reduce((s, row) => {
    if (row.required <= 0) return s + 1;
    return s + Math.min(row.validated / row.required, 1);
  }, 0);
  return Math.round((score / aggregated.length) * 100);
}

export type IngredientRowStatus = "complete" | "partial" | "empty";

export function ingredientRowStatus(row: {
  required: number;
  validated: number;
  remaining: number;
}): IngredientRowStatus {
  if (row.remaining <= 0) return "complete";
  if (row.validated > 0) return "partial";
  return "empty";
}

export function ingredientRowClassName(status: IngredientRowStatus): string {
  if (status === "complete") {
    return "bg-emerald-500/[0.08] border-l-2 border-emerald-500/70";
  }
  if (status === "partial") {
    return "bg-amber-500/[0.08] border-l-2 border-amber-500/70";
  }
  return "bg-red-500/[0.06] border-l-2 border-red-500/50";
}

export type PerItemIngredientBreakdown = {
  itemId: number;
  craftQty: number;
  rows: EntryIngredientRow[];
};

/** Détail ingrédients item par item (panoplie / build), allocation FIFO interne. */
export function computePerItemIngredientRows(
  itemCounts: ItemQuantityMap,
  itemCache: Record<number, ItemOut>,
  globalProgress: Record<string, IngredientProgress>,
  entryPriorValidated: Map<number, number>,
): PerItemIngredientBreakdown[] {
  const result: PerItemIngredientBreakdown[] = [];
  let prior = new Map(entryPriorValidated);
  const sortedIds = [...itemCounts.keys()].sort((a, b) => a - b);

  for (const itemId of sortedIds) {
    const craftQty = itemCounts.get(itemId) ?? 1;
    const singleMap = new Map<number, number>([[itemId, craftQty]]);
    const stubEntry: CraftEntry = {
      id: `stub_${itemId}`,
      entry_type: "item",
      ref_id: String(itemId),
      quantity: craftQty,
    };
    const rows = computeEntryIngredientRows(
      stubEntry,
      singleMap,
      itemCache,
      globalProgress,
      prior,
    );
    prior = consumeValidatedForEntry(rows, prior);
    result.push({ itemId, craftQty, rows });
  }

  return result;
}

export function newEntryId(): string {
  return `e_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function newLocalListId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
