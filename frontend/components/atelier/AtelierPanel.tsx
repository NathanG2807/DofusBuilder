"use client";

import { Check, ChevronRight, ListChecks, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ItemHoverCard, useItemHoverCard } from "@/components/items/ItemHoverCard";
import { Button } from "@/components/ui/Button";
import { AtelierPanelSkeleton, LoadingShell } from "@/components/ui/loading-skeletons";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
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
import { cn } from "@/lib/cn";
import { useAtelierStore } from "@/store/atelier-store";
import type { CraftEntry, CraftListOut, ItemOut, ItemSetOut } from "@/types/api";

function AtelierIcon({ size = 13, className = "shrink-0 brightness-0 invert" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/assets/global/UI/job.png" width={size} height={size} alt="" className={className} />
  );
}

/* ─── Type badge ─────────────────────────────────────────────────────────── */
function EntryTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    item:  "bg-sky-500/10 text-sky-400/80 border-sky-500/20",
    set:   "bg-amber-500/10 text-amber-400/80 border-amber-500/20",
    build: "bg-violet-500/10 text-violet-400/80 border-violet-500/20",
  };
  return (
    <span className={cn(
      "shrink-0 rounded-[5px] border px-1.5 py-0.5 text-[10px] font-medium",
      styles[type] ?? "bg-white/5 text-white/30 border-white/10",
    )}>
      {type}
    </span>
  );
}

/* ─── Mini progress bar ──────────────────────────────────────────────────── */
function MiniProgress({ pct, done }: { pct: number; done: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-16 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn("h-full rounded-full transition-all", done ? "bg-emerald-400/80" : "bg-[var(--dofus-ui-selected-border,#98c030)]/70")}
          style={{ width: `${pct}%` }}
        />
      </div>
      {done && <Check size={11} className="shrink-0 text-emerald-400" />}
    </div>
  );
}

/* ─── Ingredient table ───────────────────────────────────────────────────── */
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
    return <p className="py-3 text-center text-xs text-white/30">Aucun ingrédient craftable.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className={cn("w-full text-left", compact ? "text-[11px]" : "text-xs")}>
          <thead>
            <tr className="border-b border-white/[0.07] text-white/35">
              <th className="py-1.5 pl-2 pr-2 font-medium">Ingrédient</th>
              <th className="py-1.5 pr-2 text-right font-medium">Requis</th>
              <th className="py-1.5 pr-2 text-right font-medium">Possédé</th>
              <th className="py-1.5 pr-2 text-right font-medium">Validé</th>
              <th className="py-1.5 pr-2 text-right font-medium">Reste</th>
              <th className="py-1.5 pr-1" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const item = itemCache[row.ingredientId];
              const status = ingredientRowStatus(row);
              return (
                <tr
                  key={row.ingredientId}
                  className={cn("border-b border-white/[0.04]", ingredientRowClassName(status))}
                >
                  <td className="py-1.5 pl-2 pr-2">
                    <div
                      className="flex items-center gap-2"
                      onMouseEnter={item ? (e) => show(item, e) : undefined}
                      onMouseMove={item ? move : undefined}
                      onMouseLeave={item ? scheduleHide : undefined}
                    >
                      {item?.image_url_icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url_icon} alt="" width={22} height={22}
                          className="shrink-0 rounded border border-white/10" />
                      ) : (
                        <div className="h-[22px] w-[22px] shrink-0 rounded bg-white/5" />
                      )}
                      <span className="text-white/80">{item?.name ?? `#${row.ingredientId}`}</span>
                    </div>
                  </td>
                  <td className="py-1.5 pr-2 text-right text-white/50">{row.required}</td>
                  <td className="py-1.5 pr-2 text-right">
                    <input
                      type="number"
                      min={0}
                      max={row.required > 1 ? undefined : 1}
                      value={progress[String(row.ingredientId)]?.owned ?? 0}
                      onChange={(e) =>
                        onOwnedChange(
                          row.ingredientId,
                          row.required > 1
                            ? (parseInt(e.target.value, 10) || 0)
                            : Math.min(1, parseInt(e.target.value, 10) || 0),
                          row.required,
                        )
                      }
                      className={cn(
                        "rounded-md border border-white/10 bg-black/40 px-1.5 py-0.5 text-right text-white/80 focus:border-white/25 focus:outline-none",
                        row.required > 1 ? "w-16" : "w-12",
                      )}
                    />
                  </td>
                  <td className="py-1.5 pr-2 text-right text-[var(--dofus-ui-selected-border,#98c030)]">
                    {row.validated}/{row.required}
                  </td>
                  <td className="py-1.5 pr-2 text-right text-white/50">{row.remaining}</td>
                  <td className="py-1.5 pr-1 text-right">
                    <button
                      type="button"
                      onClick={() => onValidateRow(row.ingredientId, row.required)}
                      className="rounded-md border border-white/10 p-1 text-white/50 transition hover:border-[var(--dofus-ui-selected-border,#98c030)] hover:text-white"
                      title="Valider"
                    >
                      <Check size={11} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hover && (
        <ItemHoverCard item={hover.item} anchor={{ x: hover.x, y: hover.y }}
          onMouseEnter={cancelHide} onMouseLeave={scheduleHide} onForceHide={hide} />
      )}
    </>
  );
}

/* ─── Nested items (panoplie / build) ───────────────────────────────────── */
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
    <div className="space-y-1">
      {itemBreakdown.map(({ itemId, craftQty, rows }) => {
        const item = itemCache[itemId];
        const subKey = `${entryId}:${itemId}`;
        const subExpanded = expandedSubItems.has(subKey);
        const itemDone = rows.length > 0 && rows.every((r) => r.remaining === 0);
        const hasRecipe = rows.length > 0;

        return (
          <div key={subKey} className="overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.015]">
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                onClick={() => onToggleSubItem(subKey)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span className={cn("shrink-0 transition-transform", subExpanded && "rotate-90")}>
                  <ChevronRight size={13} className="text-white/30" />
                </span>
                {item?.image_url_icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url_icon} alt="" width={20} height={20}
                    className="shrink-0 rounded border border-white/10" />
                ) : (
                  <div className="h-5 w-5 shrink-0 rounded bg-white/5" />
                )}
                <span className={cn("text-xs", itemDone ? "text-emerald-400/90" : "text-white/75")}>
                  {item?.name ?? `Item #${itemId}`}
                  {craftQty > 1 && <span className="ml-1 text-white/35">×{craftQty}</span>}
                </span>
                {!hasRecipe && <span className="text-[10px] text-white/25">Non craftable</span>}
              </button>
              {itemDone && <Check size={12} className="shrink-0 text-emerald-400" />}
              {hasRecipe && !itemDone && (
                <button
                  type="button"
                  onClick={() => onValidateItemRecipe(rows)}
                  className="flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-white/50 transition hover:border-[color:var(--atelier-plaque-border-hover)] hover:text-[var(--dofus-green-active)]"
                >
                  <Check size={10} /> Recette
                </button>
              )}
            </div>
            {/* Smooth accordion via grid */}
            <div className={cn("grid transition-[grid-template-rows] duration-200", subExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
              <div className="overflow-hidden">
                {hasRecipe && (
                  <div className="border-t border-white/[0.05] px-2 pb-2 pt-1">
                    <IngredientTable
                      rows={rows} itemCache={itemCache} progress={progress}
                      onOwnedChange={onOwnedChange} onValidateRow={onValidateRow} compact
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Add entry modal ────────────────────────────────────────────────────── */
function AddEntryModal({
  open, onClose, onAddItem, onAddSet,
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
          const res = await searchItems({ q: q || undefined, page_size: 20, type_name_id: typeId || undefined });
          setItems(res.items);
        } else {
          const res = await searchSets(q, 1, 20);
          setSets(res.sets);
        }
      } catch {
        setItems([]); setSets([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [open, q, tab, typeId]);

  return (
    <Modal open={open} onClose={onClose} title="Ajouter à la liste" widthClassName="max-w-lg">
      <div className="mb-3 flex items-center gap-2">
        {(["item", "set"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-3 py-1 text-xs transition",
              tab === t ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70",
            )}
          >
            {t === "item" ? "Item" : "Panoplie"}
          </button>
        ))}
        <div className="flex-1" />
        <label className="flex items-center gap-1.5 text-xs text-white/50">
          Qté
          <input
            type="number" min={1} value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-14 rounded-md border border-white/10 bg-black/40 px-1.5 py-0.5 text-right text-white/80 focus:border-white/25 focus:outline-none"
          />
        </label>
      </div>
      <Input containerClassName="mb-2" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder={tab === "item" ? "Rechercher un item…" : "Rechercher une panoplie…"} />
      {tab === "item" && (
        <select value={typeId} onChange={(e) => setTypeId(e.target.value)}
          className="mb-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80 focus:border-white/25 focus:outline-none"
          aria-label="Catégorie d'item">
          {EQUIPMENT_TYPE_OPTIONS.map(({ value, label }) => (
            <option key={value || "all"} value={value}>{value ? label : "Toutes catégories"}</option>
          ))}
        </select>
      )}
      {tab === "set" && <div className="mb-3" />}
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <p className="py-4 text-center text-xs text-white/30">Chargement…</p>
        ) : tab === "item" ? (
          items.map((it) => (
            <button key={it.ankama_id} type="button" onClick={() => { onAddItem(it, qty); onClose(); }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/5">
              {it.image_url_icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image_url_icon} alt="" width={28} height={28} className="rounded" />
              )}
              <span className="min-w-0 flex-1 truncate text-xs text-white/80">{it.name}</span>
              <span className="shrink-0 text-[10px] text-white/30">{typeLabel(it.type_name_id)}</span>
              <span className="shrink-0 text-[10px] text-white/30">Niv. {it.level}</span>
            </button>
          ))
        ) : (
          sets.map((s) => (
            <button key={s.ankama_id} type="button" onClick={() => { onAddSet(s, qty); onClose(); }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/5">
              <span className="text-xs text-white/80">{s.name ?? `Panoplie #${s.ankama_id}`}</span>
              <span className="ml-auto text-[10px] text-white/30">{(s.equipment_ids?.length ?? 0)} pièces</span>
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}

/* ─── Main panel ─────────────────────────────────────────────────────────── */
export function AtelierPanel() {
  const {
    lists, activeListId, loading, error, isGuest,
    loadLists, setActiveList, createList, renameList, deleteList,
    addEntry, removeEntry, setProgress,
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

  useEffect(() => { void loadLists(); }, [loadLists]);

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
      const ingFetched = missingIng.length > 0
        ? await Promise.all(missingIng.map((id) => fetchItem(id).catch(() => null)))
        : [];
      if (cancelled) return;
      setItemCache((prev) => {
        const next = { ...prev };
        for (const item of craftItems) next[item.ankama_id] = item;
        for (const item of ingFetched) { if (item) next[item.ankama_id] = item; }
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
  const listDone = progressPct >= 100;

  const handleOwnedChange = useCallback(
    (ingredientId: number, owned: number, required: number) => {
      if (!activeList) return;
      void setProgress(activeList.id, setIngredientOwned(activeList.progress, ingredientId, owned, required));
    },
    [activeList, setProgress],
  );

  const handleValidateRow = useCallback(
    (ingredientId: number, required: number) => {
      if (!activeList) return;
      void setProgress(activeList.id, validateIngredientFully(activeList.progress, ingredientId, required));
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
      void setProgress(activeList.id, validateEntryRecipe(activeList.progress, rows, globalNeeds));
    },
    [activeList, entryItemCounts, itemCache, globalNeeds, setProgress],
  );

  const handleValidateItemRecipe = useCallback(
    (rows: EntryIngredientRow[]) => {
      if (!activeList) return;
      void setProgress(activeList.id, validateEntryRecipe(activeList.progress, rows, globalNeeds));
    },
    [activeList, globalNeeds, setProgress],
  );

  function entryLabel(entry: CraftEntry): string {
    if (entry.label) return entry.label;
    if (entry.entry_type === "item") {
      const id = parseInt(entry.ref_id, 10);
      return itemCache[id]?.name ?? `Item #${entry.ref_id}`;
    }
    if (entry.entry_type === "set") return `Panoplie #${entry.ref_id}`;
    return entry.label ?? "Build";
  }

  function entryProgress(entry: CraftEntry, idx: number): number {
    const counts = entryItemCounts.get(entry.id);
    if (!counts) return 0;
    let prior = new Map<number, number>();
    for (let i = 0; i < idx; i++) {
      const e = activeList!.entries[i];
      const c = entryItemCounts.get(e.id);
      if (!c) continue;
      const rows = computeEntryIngredientRows(e, c, itemCache, activeList!.progress, prior);
      prior = consumeValidatedForEntry(rows, prior);
    }
    const rows = computeEntryIngredientRows(entry, counts, itemCache, activeList!.progress, prior);
    if (rows.length === 0) return 100;
    const done = rows.filter((r) => r.remaining === 0).length;
    return Math.round((done / rows.length) * 100);
  }

  return (
    /* ── Contrainte à la hauteur disponible = pas de débordement footer ── */
    <main className="flex min-h-0 flex-1 overflow-hidden">
      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-white/[0.06] bg-[#0a0a08]">
        {/* Header sidebar */}
        <div className="border-b border-white/[0.06] px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--dofus-green-active)]/10 ring-1 ring-[var(--dofus-green-active)]/20">
              <AtelierIcon size={14} className="shrink-0 brightness-0 invert opacity-90" />
            </span>
            <div>
               
              <p className="font-display text-[17px] font-medium leading-tight text-white/90">
                L&apos;Atelier
              </p>
            </div>
          </div>
          {isGuest && (
            <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-[10px] leading-relaxed text-amber-200/70">
              Connecte-toi pour sauvegarder tes listes de craft.
            </p>
          )}
        </div>

        {/* List of craft lists */}
        <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 py-2">
          {lists.length === 0 && !loading && (
            <p className="px-2 py-3 text-[11px] text-white/25">Aucune liste — crée-en une ci-dessous.</p>
          )}
          {lists.map((list) => (
            <button
              key={list.id}
              type="button"
              onClick={() => setActiveList(list.id)}
              className={cn(
                "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition",
                list.id === activeListId
                  ? "bg-white/[0.08] text-white"
                  : "text-white/45 hover:bg-white/[0.04] hover:text-white/75",
              )}
            >
              <ListChecks size={13} className={list.id === activeListId ? "text-[var(--dofus-green-active)]" : "text-white/20"} />
              <span className="min-w-0 flex-1 truncate">{list.name}</span>
            </button>
          ))}
        </nav>

        {/* New list form */}
        <div className="border-t border-white/[0.06] p-3">
          <div className="flex gap-1.5">
            <Input
              containerClassName="min-w-0 flex-1"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void createList(newListName.trim() || "Nouvelle liste").then(() => setNewListName("")); }}
              placeholder="Nouvelle liste…"
            />
            <Button type="button" variant="outline" size="sm"
              onClick={() => void createList(newListName.trim() || "Nouvelle liste").then(() => setNewListName(""))}
              aria-label="Créer">
              <Plus size={14} />
            </Button>
          </div>
        </div>
      </aside>

      {/* ── Contenu principal ─────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {loading && (
          <LoadingShell spinnerSize={48} label="Chargement…" minHeight="min-h-[320px]" className="flex-1">
            <AtelierPanelSkeleton />
          </LoadingShell>
        )}
        {error && <p className="p-6 text-sm text-red-400">{error}</p>}

        {!loading && !activeList && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
              <AtelierIcon size={28} className="shrink-0 brightness-0 invert opacity-20" />
            </span>
            <p className="text-sm text-white/35">Sélectionne ou crée une liste de craft pour commencer.</p>
          </div>
        )}

        {activeList && (
          <>
            {/* ── Barre titre liste ── */}
            <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#0b0c09] px-6 py-3">
              {renaming ? (
                <>
                  <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { void renameList(activeList.id, renameValue); setRenaming(false); } if (e.key === "Escape") setRenaming(false); }}
                    autoFocus />
                  <button type="button" onClick={() => { void renameList(activeList.id, renameValue); setRenaming(false); }}
                    className="shrink-0 text-xs text-[var(--dofus-green-active)]">OK</button>
                  <button type="button" onClick={() => setRenaming(false)} className="shrink-0 text-xs text-white/30">Annuler</button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => { setRenameValue(activeList.name); setRenaming(true); }}
                  className="group flex items-center gap-1.5"
                  title="Renommer"
                >
                  <h2 className="font-display text-[20px] font-medium text-white/90">{activeList.name}</h2>
                  <Pencil size={12} className="shrink-0 text-white/20 transition group-hover:text-white/50" />
                </button>
              )}

              <div className="flex-1" />

              {/* Progress */}
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", listDone ? "bg-emerald-400/80" : "bg-[var(--dofus-ui-selected-border,#98c030)]")}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className={cn("text-[11px] tabular-nums", listDone ? "text-emerald-400" : "text-white/40")}>
                  {progressPct}%
                </span>
                {listDone && <Check size={13} className="shrink-0 text-emerald-400" />}
              </div>

              <Button type="button" variant="outline" size="sm" onClick={() => setAddModalOpen(true)}>
                <Plus size={13} /> Ajouter
              </Button>
              <Button type="button" variant="danger" size="sm"
                onClick={() => { if (confirm(`Supprimer « ${activeList.name} » ?`)) void deleteList(activeList.id); }}>
                <Trash2 size={13} />
              </Button>
            </div>

            {/* ── Body en deux zones scrollables ── */}
            <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Recette totale */}
              <section>
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35">
                    Recette totale
                  </p>
                  <div className="flex-1 border-t border-white/[0.06]" />
                  <span className="text-[10px] text-white/25">{aggregated.length} ingrédient{aggregated.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#0c0d0a]">
                  <IngredientTable
                    rows={aggregated}
                    itemCache={itemCache}
                    progress={activeList.progress}
                    onOwnedChange={handleOwnedChange}
                    onValidateRow={handleValidateRow}
                  />
                </div>
              </section>

              {/* Détail par objectif */}
              <section>
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35">
                    Détail par objectif
                  </p>
                  <div className="flex-1 border-t border-white/[0.06]" />
                  <span className="text-[10px] text-white/25">{activeList.entries.length} objectif{activeList.entries.length !== 1 ? "s" : ""}</span>
                </div>

                {activeList.entries.length === 0 && (
                  <p className="text-xs text-white/25">Aucun objectif — ajoute un item ou une panoplie.</p>
                )}

                <div className="space-y-2">
                  {activeList.entries.map((entry, idx) => {
                    const counts = entryItemCounts.get(entry.id);
                    let prior = new Map<number, number>();
                    for (let i = 0; i < idx; i++) {
                      const e = activeList.entries[i];
                      const c = entryItemCounts.get(e.id);
                      if (!c) continue;
                      const rows = computeEntryIngredientRows(e, c, itemCache, activeList.progress, prior);
                      prior = consumeValidatedForEntry(rows, prior);
                    }
                    const entryRows = counts
                      ? computeEntryIngredientRows(entry, counts, itemCache, activeList.progress, prior)
                      : [];
                    const perItemBreakdown = counts
                      ? computePerItemIngredientRows(counts, itemCache, activeList.progress, prior)
                      : [];
                    const isMultiItem = entry.entry_type === "set" || entry.entry_type === "build";
                    const entryDone = entryRows.length > 0 && entryRows.every((r) => r.remaining === 0);
                    const expanded = expandedEntries.has(entry.id);
                    const pct = activeList ? entryProgress(entry, idx) : 0;

                    return (
                      <div
                        key={entry.id}
                        className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0d0a]"
                      >
                        {/* Header de l'entrée */}
                        <div className="flex items-center gap-2 px-4 py-2.5">
                          <button
                            type="button"
                            onClick={() => setExpandedEntries((s) => { const n = new Set(s); n.has(entry.id) ? n.delete(entry.id) : n.add(entry.id); return n; })}
                            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                          >
                            <span className={cn("shrink-0 transition-transform duration-200", expanded && "rotate-90")}>
                              <ChevronRight size={14} className="text-white/30" />
                            </span>
                            <span className={cn("truncate text-[13px] font-medium", entryDone ? "text-emerald-400/90" : "text-white/80")}>
                              {entryLabel(entry)}
                              {entry.quantity > 1 && <span className="ml-1.5 text-white/35">×{entry.quantity}</span>}
                            </span>
                            <EntryTypeBadge type={entry.entry_type} />
                          </button>

                          {/* Mini progress */}
                          <MiniProgress pct={pct} done={entryDone} />

                          {/* Actions */}
                          {!entryDone && entryRows.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleValidateEntry(entry.id)}
                              className="flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-white/50 transition hover:border-[color:var(--atelier-plaque-border-hover)] hover:text-[var(--dofus-green-active)]"
                            >
                              <Check size={10} /> Tout
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void removeEntry(activeList.id, entry.id)}
                            className="shrink-0 rounded-md p-1 text-white/25 transition hover:bg-red-500/10 hover:text-red-400"
                            aria-label="Retirer"
                          >
                            <X size={13} />
                          </button>
                        </div>

                        {/* Contenu accordéon — animation CSS grid */}
                        <div className={cn(
                          "grid transition-[grid-template-rows] duration-200 ease-out",
                          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                        )}>
                          <div className="overflow-hidden">
                            <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
                              {isMultiItem ? (
                                <>
                                  <p className="mb-2 text-[10px] text-white/30">
                                    {perItemBreakdown.length} pièce{perItemBreakdown.length !== 1 ? "s" : ""} — recette par item, total agrégé en haut.
                                  </p>
                                  <NestedItemsDetail
                                    entryId={entry.id}
                                    itemBreakdown={perItemBreakdown}
                                    itemCache={itemCache}
                                    progress={activeList.progress}
                                    expandedSubItems={expandedSubItems}
                                    onToggleSubItem={(key) => setExpandedSubItems((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; })}
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
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
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

  async function handleAddItem(item: ItemOut, qty: number) {
    if (!activeList) return;
    setItemCache((prev) => ({ ...prev, [item.ankama_id]: item }));
    await addEntry(activeList.id, { entry_type: "item", ref_id: String(item.ankama_id), quantity: qty, label: item.name });
  }

  async function handleAddSet(set: ItemSetOut, qty: number) {
    if (!activeList) return;
    await addEntry(activeList.id, { entry_type: "set", ref_id: String(set.ankama_id), quantity: qty, label: set.name ?? undefined });
  }
}
