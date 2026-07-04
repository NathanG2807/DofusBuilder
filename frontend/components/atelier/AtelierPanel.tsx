"use client";

import { Check, ChevronDown, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ItemHoverCard, useItemHoverCard } from "@/components/items/ItemHoverCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Plaque } from "@/components/ui/Plaque";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { fetchItem, fetchItemsBySet, searchItems, searchSets } from "@/lib/api";
import { EQUIPMENT_TYPE_OPTIONS, typeLabel } from "@/lib/equipmentTypes";
import {
  aggregateIngredientNeeds,
  buildAggregatedIngredients,
  computeEntryIngredientRows,
  computePerItemIngredientRows,
  consumeValidatedForEntry,
  ingredientRowClassName,
  ingredientRowStatus,
  listProgressPercent,
  resolveEntryItemCounts,
  setIngredientOwned,
  validateEntryRecipe,
  validateIngredientFully,
  type EntryIngredientRow,
} from "@/lib/craftRecipe";
import { useAtelierStore } from "@/store/atelier-store";
import type { CraftEntry, CraftListOut, ItemOut, ItemSetOut } from "@/types/api";

function IngredientTable({
  rows,
  itemCache,
  progress,
  onOwnedChange,
  onValidateRow,
  compact = false,
}: {
  rows: { ingredientId: number; required: number; validated: number; remaining: number }[];
  itemCache: Record<number, ItemOut>;
  progress: CraftListOut["progress"];
  onOwnedChange: (ingredientId: number, owned: number, required: number) => void;
  onValidateRow: (ingredientId: number, required: number) => void;
  compact?: boolean;
}) {
  const { hover, show, move, scheduleHide, cancelHide, hide } = useItemHoverCard();

  if (rows.length === 0) {
    return (
      <p className="py-3 text-center text-xs text-white/30">
        Aucun ingrédient craftable.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className={`w-full text-left ${compact ? "text-[11px]" : "text-xs"}`}>
          <thead>
            <tr className="border-b border-white/10 text-white/40">
              <th className="px-2 py-1.5 font-medium">Ingrédient</th>
              <th className="px-2 py-1.5 font-medium text-right">Requis</th>
              <th className="px-2 py-1.5 font-medium text-right">Possédé</th>
              <th className="px-2 py-1.5 font-medium text-right">Validé</th>
              <th className="px-2 py-1.5 font-medium text-right">Reste</th>
              <th className="px-2 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const item = itemCache[row.ingredientId];
              const status = ingredientRowStatus(row);
              return (
                <tr
                  key={row.ingredientId}
                  className={`border-b border-white/[0.04] ${ingredientRowClassName(status)}`}
                >
                  <td className="px-2 py-1.5">
                    <div
                      className="flex items-center gap-2"
                      onMouseEnter={item ? (e) => show(item, e) : undefined}
                      onMouseMove={item ? move : undefined}
                      onMouseLeave={item ? scheduleHide : undefined}
                    >
                      {item?.image_url_icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url_icon}
                          alt=""
                          width={24}
                          height={24}
                          className="rounded border border-white/10"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded bg-white/5" />
                      )}
                      <span className="text-white/80">{item?.name ?? `#${row.ingredientId}`}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/60">{row.required}</td>
                  <td className="px-2 py-1.5 text-right">
                    {row.required > 1 ? (
                      <input
                        type="number"
                        min={0}
                        value={progress[String(row.ingredientId)]?.owned ?? 0}
                        onChange={(e) =>
                          onOwnedChange(
                            row.ingredientId,
                            parseInt(e.target.value, 10) || 0,
                            row.required,
                          )
                        }
                        className="w-16 rounded-md border border-white/10 bg-black/40 px-1.5 py-0.5 text-right text-white/80 focus:border-white/25 focus:outline-none"
                      />
                    ) : (
                      <input
                        type="number"
                        min={0}
                        max={1}
                        value={progress[String(row.ingredientId)]?.owned ?? 0}
                        onChange={(e) =>
                          onOwnedChange(
                            row.ingredientId,
                            Math.min(1, parseInt(e.target.value, 10) || 0),
                            row.required,
                          )
                        }
                        className="w-12 rounded-md border border-white/10 bg-black/40 px-1.5 py-0.5 text-right text-white/80 focus:border-white/25 focus:outline-none"
                        title="Quantité possédée"
                      />
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right text-[var(--dofus-ui-selected-border,#98c030)]">
                    {row.validated}/{row.required}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/60">{row.remaining}</td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => onValidateRow(row.ingredientId, row.required)}
                      className="rounded-md border border-white/10 p-1 text-white/60 transition hover:border-[var(--dofus-ui-selected-border,#98c030)] hover:text-white"
                      title="Valider cet ingrédient"
                    >
                      <Check size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hover && (
        <ItemHoverCard
          item={hover.item}
          anchor={{ x: hover.x, y: hover.y }}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
          onForceHide={hide}
        />
      )}
    </>
  );
}

function toggleInSet(
  set: Set<string>,
  key: string,
): Set<string> {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

function NestedItemsDetail({
  entryId,
  itemBreakdown,
  itemCache,
  progress,
  expandedSubItems,
  onToggleSubItem,
  onOwnedChange,
  onValidateRow,
  onValidateItemRecipe,
}: {
  entryId: string;
  itemBreakdown: ReturnType<typeof computePerItemIngredientRows>;
  itemCache: Record<number, ItemOut>;
  progress: CraftListOut["progress"];
  expandedSubItems: Set<string>;
  onToggleSubItem: (key: string) => void;
  onOwnedChange: (ingredientId: number, owned: number, required: number) => void;
  onValidateRow: (ingredientId: number, required: number) => void;
  onValidateItemRecipe: (rows: EntryIngredientRow[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      {itemBreakdown.map(({ itemId, craftQty, rows }) => {
        const item = itemCache[itemId];
        const subKey = `${entryId}:${itemId}`;
        const subExpanded = expandedSubItems.has(subKey);
        const itemDone = rows.length > 0 && rows.every((r) => r.remaining === 0);
        const hasRecipe = rows.length > 0;

        return (
            <div
              key={subKey}
              className="plaque-flat"
            >
            <div className="flex items-center gap-2 px-2 py-1.5">
              <button
                type="button"
                onClick={() => onToggleSubItem(subKey)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span className="shrink-0 text-white/40">
                  {subExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </span>
                {item?.image_url_icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url_icon}
                    alt=""
                    width={22}
                    height={22}
                    className="shrink-0 rounded border border-white/10"
                  />
                ) : (
                  <div className="h-[22px] w-[22px] shrink-0 rounded bg-white/5" />
                )}
                <span className={`text-xs text-white/80 ${itemDone ? "text-emerald-400/90" : ""}`}>
                  {item?.name ?? `Item #${itemId}`}
                  {craftQty > 1 && (
                    <span className="ml-1 text-white/40">×{craftQty}</span>
                  )}
                </span>
                {!hasRecipe && (
                  <span className="text-[10px] text-white/30">Non craftable</span>
                )}
              </button>
              {hasRecipe && (
                <button
                  type="button"
                  onClick={() => onValidateItemRecipe(rows)}
                  className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-white/60 hover:border-[var(--dofus-ui-selected-border,#98c030)]"
                >
                  <Check size={11} /> Recette
                </button>
              )}
            </div>
            {subExpanded && hasRecipe && (
              <div className="border-t border-white/[0.04] px-1 pb-2">
                <IngredientTable
                  rows={rows}
                  itemCache={itemCache}
                  progress={progress}
                  onOwnedChange={onOwnedChange}
                  onValidateRow={onValidateRow}
                  compact
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AddEntryModal({
  open,
  onClose,
  onAddItem,
  onAddSet,
}: {
  open: boolean;
  onClose: () => void;
  onAddItem: (item: ItemOut, qty: number) => void;
  onAddSet: (set: ItemSetOut, qty: number) => void;
}) {
  const [tab, setTab] = useState<"item" | "set">("item");
  const [q, setQ] = useState("");
  const [typeId, setTypeId] = useState("");
  const [qty, setQty] = useState(1);
  const [items, setItems] = useState<ItemOut[]>([]);
  const [sets, setSets] = useState<ItemSetOut[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        if (tab === "item") {
          const res = await searchItems({
            q: q || undefined,
            page_size: 20,
            type_name_id: typeId || undefined,
          });
          setItems(res.items);
        } else {
          const res = await searchSets(q, 1, 20);
          setSets(res.sets);
        }
      } catch {
        setItems([]);
        setSets([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [open, q, tab, typeId]);

  return (
    <Modal open={open} onClose={onClose} title="Ajouter à la liste" widthClassName="max-w-lg">
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("item")}
          className={`rounded-lg px-3 py-1 text-xs transition ${tab === "item" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
        >
          Item
        </button>
        <button
          type="button"
          onClick={() => setTab("set")}
          className={`rounded-lg px-3 py-1 text-xs transition ${tab === "set" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
        >
          Panoplie
        </button>
        <div className="flex-1" />
        <label className="flex items-center gap-1 text-xs text-white/50">
          Qté
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-14 rounded-md border border-white/10 bg-black/40 px-1.5 py-0.5 text-white/80 focus:border-white/25 focus:outline-none"
          />
        </label>
      </div>
      <Input
        containerClassName="mb-2"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={tab === "item" ? "Rechercher un item…" : "Rechercher une panoplie…"}
      />
      {tab === "item" && (
        <select
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
          className="mb-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80 focus:border-white/25 focus:outline-none"
          aria-label="Catégorie d'item"
        >
          {EQUIPMENT_TYPE_OPTIONS.map(({ value, label }) => (
            <option key={value || "all"} value={value}>
              {value ? label : "Toutes catégories"}
            </option>
          ))}
        </select>
      )}
      {tab === "set" && <div className="mb-3" />}
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <p className="py-4 text-center text-xs text-white/30">Chargement…</p>
        ) : tab === "item" ? (
          items.map((it) => (
            <button
              key={it.ankama_id}
              type="button"
              onClick={() => { onAddItem(it, qty); onClose(); }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/5"
            >
              {it.image_url_icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image_url_icon} alt="" width={28} height={28} className="rounded" />
              )}
              <span className="min-w-0 flex-1 truncate text-xs text-white/80">{it.name}</span>
              <span className="shrink-0 text-[10px] text-white/30">
                {typeLabel(it.type_name_id)}
              </span>
              <span className="shrink-0 text-[10px] text-white/30">Niv. {it.level}</span>
            </button>
          ))
        ) : (
          sets.map((s) => (
            <button
              key={s.ankama_id}
              type="button"
              onClick={() => { onAddSet(s, qty); onClose(); }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/5"
            >
              <span className="text-xs text-white/80">{s.name ?? `Panoplie #${s.ankama_id}`}</span>
              <span className="ml-auto text-[10px] text-white/30">
                {(s.equipment_ids?.length ?? 0)} pièces
              </span>
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}

export function AtelierPanel() {
  const {
    lists,
    activeListId,
    loading,
    error,
    isGuest,
    loadLists,
    setActiveList,
    createList,
    renameList,
    deleteList,
    addEntry,
    removeEntry,
    setProgress,
  } = useAtelierStore();

  const activeList = lists.find((l) => l.id === activeListId) ?? null;
  const [itemCache, setItemCache] = useState<Record<number, ItemOut>>({});
  const [entryItemCounts, setEntryItemCounts] = useState<Map<string, Map<number, number>>>(new Map());
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [expandedSubItems, setExpandedSubItems] = useState<Set<string>>(new Set());
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const fetchSetItemIds = useCallback(async (setId: number) => {
    const items = await fetchItemsBySet(setId, 100);
    return items.map((i) => i.ankama_id);
  }, []);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  useEffect(() => {
    if (!activeList) return;
    let cancelled = false;
    (async () => {
      const countsMap = new Map<string, Map<number, number>>();
      const craftItemIds = new Set<number>();
      for (const entry of activeList.entries) {
        const counts = await resolveEntryItemCounts(entry, fetchSetItemIds);
        countsMap.set(entry.id, counts);
        for (const itemId of counts.keys()) craftItemIds.add(itemId);
      }
      if (cancelled) return;
      setEntryItemCounts(countsMap);

      const toFetch = [...craftItemIds];
      if (toFetch.length === 0) return;

      const fetched = await Promise.all(toFetch.map((id) => fetchItem(id).catch(() => null)));
      if (cancelled) return;

      const ingIds = new Set<number>();
      const craftItems: ItemOut[] = [];
      for (const item of fetched) {
        if (!item) continue;
        craftItems.push(item);
        for (const line of item.recipe ?? []) ingIds.add(line.item_ankama_id);
      }

      const knownIds = new Set(craftItems.map((i) => i.ankama_id));
      const missingIng = [...ingIds].filter((id) => !knownIds.has(id));
      const ingFetched =
        missingIng.length > 0
          ? await Promise.all(missingIng.map((id) => fetchItem(id).catch(() => null)))
          : [];
      if (cancelled) return;

      setItemCache((prev) => {
        const next = { ...prev };
        for (const item of craftItems) next[item.ankama_id] = item;
        for (const item of ingFetched) {
          if (item) next[item.ankama_id] = item;
        }
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [activeList, fetchSetItemIds]);

  const globalNeeds = useMemo(() => {
    if (!activeList) return new Map<number, number>();
    return aggregateIngredientNeeds(activeList.entries, entryItemCounts, itemCache);
  }, [activeList, entryItemCounts, itemCache]);

  const aggregated = useMemo(() => {
    if (!activeList) return [];
    return buildAggregatedIngredients(globalNeeds, activeList.progress);
  }, [activeList, globalNeeds]);

  const progressPct = listProgressPercent(aggregated);

  const handleOwnedChange = useCallback(
    (ingredientId: number, owned: number, required: number) => {
      if (!activeList) return;
      const next = setIngredientOwned(activeList.progress, ingredientId, owned, required);
      void setProgress(activeList.id, next);
    },
    [activeList, setProgress],
  );

  const handleValidateRow = useCallback(
    (ingredientId: number, required: number) => {
      if (!activeList) return;
      const next = validateIngredientFully(activeList.progress, ingredientId, required);
      void setProgress(activeList.id, next);
    },
    [activeList, setProgress],
  );

  const handleValidateEntry = useCallback(
    (entryId: string) => {
      if (!activeList) return;
      const entry = activeList.entries.find((e) => e.id === entryId);
      const counts = entryItemCounts.get(entryId);
      if (!entry || !counts) return;

      let prior = new Map<number, number>();
      for (const e of activeList.entries) {
        if (e.id === entryId) break;
        const c = entryItemCounts.get(e.id);
        if (!c) continue;
        const rows = computeEntryIngredientRows(e, c, itemCache, activeList.progress, prior);
        prior = consumeValidatedForEntry(rows, prior);
      }
      const rows = computeEntryIngredientRows(entry, counts, itemCache, activeList.progress, prior);
      const next = validateEntryRecipe(activeList.progress, rows, globalNeeds);
      void setProgress(activeList.id, next);
    },
    [activeList, entryItemCounts, itemCache, globalNeeds, setProgress],
  );

  const handleValidateItemRecipe = useCallback(
    (rows: EntryIngredientRow[]) => {
      if (!activeList) return;
      const next = validateEntryRecipe(activeList.progress, rows, globalNeeds);
      void setProgress(activeList.id, next);
    },
    [activeList, globalNeeds, setProgress],
  );

  async function handleCreateList() {
    const name = newListName.trim() || "Nouvelle liste";
    await createList(name);
    setNewListName("");
  }

  async function handleAddItem(item: ItemOut, qty: number) {
    if (!activeList) return;
    setItemCache((prev) => ({ ...prev, [item.ankama_id]: item }));
    await addEntry(activeList.id, {
      entry_type: "item",
      ref_id: String(item.ankama_id),
      quantity: qty,
      label: item.name,
    });
  }

  async function handleAddSet(set: ItemSetOut, qty: number) {
    if (!activeList) return;
    await addEntry(activeList.id, {
      entry_type: "set",
      ref_id: String(set.ankama_id),
      quantity: qty,
      label: set.name ?? undefined,
    });
  }

  function entryLabel(entry: CraftEntry): string {
    if (entry.label) return entry.label;
    if (entry.entry_type === "item") {
      const id = parseInt(entry.ref_id, 10);
      return itemCache[id]?.name ?? `Item #${entry.ref_id}`;
    }
    if (entry.entry_type === "set") return `Panoplie #${entry.ref_id}`;
    return entry.label ?? "Build";
  }

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 gap-4 p-4 md:p-8">
      {/* Sidebar listes */}
      <aside className="w-56 shrink-0 space-y-3">
        <SectionHeading eyebrow="Craft tracking" title="L'Atelier" className="mb-1" />
        {isGuest && (
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1.5 text-[10px] text-amber-200/80">
            Connecte-toi pour sauvegarder tes listes.
          </p>
        )}
        <div className="flex gap-1.5">
          <Input
            containerClassName="min-w-0 flex-1"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="Nouvelle liste…"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleCreateList()}
            aria-label="Créer la liste"
          >
            <Plus size={14} />
          </Button>
        </div>
        <ul className="space-y-1">
          {lists.map((list) => (
            <li key={list.id}>
              <button
                type="button"
                onClick={() => setActiveList(list.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                  list.id === activeListId
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:bg-white/5 hover:text-white/70"
                }`}
              >
                {list.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Contenu principal */}
      <div className="min-w-0 flex-1 space-y-4">
        {loading && <p className="text-sm text-white/40">Chargement…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        {!loading && !activeList && (
          <Plaque className="p-8 text-center">
            <p className="text-sm text-white/40">Crée une CraftList pour commencer.</p>
          </Plaque>
        )}

        {activeList && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {renaming ? (
                <>
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void renameList(activeList.id, renameValue);
                      setRenaming(false);
                    }}
                    className="text-xs text-[var(--dofus-ui-selected-border,#98c030)]"
                  >
                    OK
                  </button>
                </>
              ) : (
                <h2
                  className="cursor-pointer font-display text-xl font-medium text-white/90"
                  onClick={() => { setRenameValue(activeList.name); setRenaming(true); }}
                  title="Cliquer pour renommer"
                >
                  {activeList.name}
                </h2>
              )}
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <div className="h-2 w-32 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-[var(--dofus-ui-selected-border,#98c030)] transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-xs text-white/50">{progressPct}%</span>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setAddModalOpen(true)}>
                <Plus size={13} /> Ajouter
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirm(`Supprimer « ${activeList.name} » ?`)) {
                    void deleteList(activeList.id);
                  }
                }}
              >
                <Trash2 size={13} /> Supprimer
              </Button>
            </div>

            {/* Recette globale */}
            <Plaque className="p-4">
              <h3 className="mb-3 text-sm font-medium text-white/70">Recette totale</h3>
              <IngredientTable
                rows={aggregated}
                itemCache={itemCache}
                progress={activeList.progress}
                onOwnedChange={handleOwnedChange}
                onValidateRow={handleValidateRow}
              />
            </Plaque>

            {/* Entrées */}
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-white/70">Détail par objectif</h3>
              {activeList.entries.length === 0 && (
                <p className="text-xs text-white/30">Aucun objectif — ajoute un item, une panoplie ou un build.</p>
              )}
              {activeList.entries.map((entry, idx) => {
                const counts = entryItemCounts.get(entry.id);
                let prior = new Map<number, number>();
                for (let i = 0; i < idx; i++) {
                  const e = activeList.entries[i];
                  const c = entryItemCounts.get(e.id);
                  if (!c) continue;
                  const rows = computeEntryIngredientRows(
                    e, c, itemCache, activeList.progress, prior,
                  );
                  prior = consumeValidatedForEntry(rows, prior);
                }
                const entryRows = counts
                  ? computeEntryIngredientRows(entry, counts, itemCache, activeList.progress, prior)
                  : [];
                const perItemBreakdown = counts
                  ? computePerItemIngredientRows(counts, itemCache, activeList.progress, prior)
                  : [];
                const isMultiItem =
                  entry.entry_type === "set" || entry.entry_type === "build";
                const entryDone = entryRows.length > 0 && entryRows.every((r) => r.remaining === 0);
                const expanded = expandedEntries.has(entry.id);

                return (
                  <Plaque flat key={entry.id}>
                    <div className="flex items-center gap-2 px-3 py-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedEntries((s) => {
                            const n = new Set(s);
                            if (n.has(entry.id)) n.delete(entry.id);
                            else n.add(entry.id);
                            return n;
                          })
                        }
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <span className="shrink-0 text-white/40">
                          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                        <span className="text-sm text-white/80">
                          {entryLabel(entry)}
                          {entry.quantity > 1 && (
                            <span className="ml-1 text-white/40">×{entry.quantity}</span>
                          )}
                        </span>
                        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/30">
                          {entry.entry_type}
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={entryDone || entryRows.length === 0}
                        onClick={() => handleValidateEntry(entry.id)}
                        className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-white/60 hover:border-[var(--dofus-ui-selected-border,#98c030)] disabled:opacity-30"
                      >
                        <Check size={11} /> Tout
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeEntry(activeList.id, entry.id)}
                        className="text-red-400/60 hover:text-red-400"
                        aria-label="Retirer l'objectif"
                      >
                        <X size={13} />
                      </button>
                    </div>
                    {expanded && (
                      <div className="border-t border-white/[0.06] px-3 pb-3">
                        {isMultiItem ? (
                          <>
                            <p className="py-2 text-[10px] text-white/35">
                              {perItemBreakdown.length} pièce{perItemBreakdown.length !== 1 ? "s" : ""} — recette par item ci-dessous, total agrégé en haut.
                            </p>
                            <NestedItemsDetail
                              entryId={entry.id}
                              itemBreakdown={perItemBreakdown}
                              itemCache={itemCache}
                              progress={activeList.progress}
                              expandedSubItems={expandedSubItems}
                              onToggleSubItem={(key) =>
                                setExpandedSubItems((s) => toggleInSet(s, key))
                              }
                              onOwnedChange={handleOwnedChange}
                              onValidateRow={handleValidateRow}
                              onValidateItemRecipe={handleValidateItemRecipe}
                            />
                          </>
                        ) : (
                          <IngredientTable
                            rows={entryRows}
                            itemCache={itemCache}
                            progress={activeList.progress}
                            onOwnedChange={handleOwnedChange}
                            onValidateRow={handleValidateRow}
                            compact
                          />
                        )}
                      </div>
                    )}
                  </Plaque>
                );
              })}
            </section>
          </>
        )}
      </div>

      <AddEntryModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAddItem={(item, qty) => void handleAddItem(item, qty)}
        onAddSet={(set, qty) => void handleAddSet(set, qty)}
      />
    </main>
  );
}
