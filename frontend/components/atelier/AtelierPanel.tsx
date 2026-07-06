"use client";

import { Check, ChevronRight, ListChecks, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, Fragment, type ReactNode } from "react";

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
  filterCraftableItemCounts,
  ingredientCraftTextClassName,
  ingredientRowClassName,
  ingredientRowStatus,
  isCraftableItem,
  resolveEntryItemCounts,
  setIngredientOwned,
  validateEntryRecipe,
  validateIngredientFully,
  type EntryIngredientRow,
  type IngredientRowStatus,
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

const ENTRY_TYPE_LABELS: Record<string, string> = {
  item: "Item",
  set: "Pano",
  build: "Build",
};

function entryTypeLabel(type: string): string {
  return ENTRY_TYPE_LABELS[type] ?? type;
}

function SectionTitle({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <h3 className="mb-1.5 flex shrink-0 items-baseline gap-1 text-[11px] text-white/45">
      {children}
      {count != null && <span className="text-white/20">· {count}</span>}
    </h3>
  );
}

function craftStatusFromRows(rows: { validated: number; remaining: number }[]): IngredientRowStatus {
  if (rows.length === 0) return "complete";
  if (rows.every((r) => r.remaining === 0)) return "complete";
  if (rows.some((r) => r.validated > 0)) return "partial";
  return "empty";
}

function rowsProgressPct(rows: { required: number; validated: number }[]): number {
  if (rows.length === 0) return 100;
  const score = rows.reduce(
    (s, r) => s + (r.required > 0 ? Math.min(r.validated / r.required, 1) : 1),
    0,
  );
  return Math.round((score / rows.length) * 100);
}

function statusPingClassName(status: IngredientRowStatus): string {
  if (status === "complete") return "bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.55)]";
  if (status === "partial") return "bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.45)]";
  return "bg-red-400/85 shadow-[0_0_5px_rgba(248,113,113,0.4)]";
}

/** Pastille de statut (items / pièces — pas de fond de ligne). */
function StatusPing({ status, neutral }: { status: IngredientRowStatus; neutral?: boolean }) {
  return (
    <span
      className={cn(
        "mt-px h-1.5 w-1.5 shrink-0 rounded-full",
        neutral ? "bg-white/25" : statusPingClassName(status),
      )}
      aria-hidden
    />
  );
}

/** Barre + pourcentage dans la colonne Craft (horizontal). */
function CraftProgressCell({
  pct,
  status,
  neutral = false,
}: {
  pct: number;
  status: IngredientRowStatus;
  neutral?: boolean;
}) {
  const done = !neutral && status === "complete";
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 min-w-[2.75rem] max-w-[4rem] flex-1 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            neutral
              ? "bg-white/30"
              : done
                ? "bg-emerald-400/80"
                : status === "partial"
                  ? "bg-amber-400/80"
                  : "bg-[var(--dofus-ui-selected-border,#98c030)]/70",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          "w-9 shrink-0 text-right text-[11px] tabular-nums leading-none",
          neutral ? "text-white/40" : done ? "text-emerald-400" : ingredientCraftTextClassName(status),
        )}
      >
        {done ? (
          <span className="inline-flex items-center justify-end gap-0.5">
            <Check size={10} className="shrink-0" />
            {pct}%
          </span>
        ) : (
          `${pct}%`
        )}
      </span>
    </div>
  );
}

/** Conteneur tableau items (objectifs, pièces) — sans scroll interne. */
function ItemTableShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-white/[0.07] bg-[#0a0b08]/80", className)}>
      {children}
    </div>
  );
}

/** Conteneur tableau scrollable (modal recherche). */
function ScrollTableShell({
  children,
  className,
  maxHeight = "max-h-64",
}: {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-white/[0.07] bg-[#0a0b08]/80", className)}>
      <div className={cn("scrollbar-thin overflow-x-auto overflow-y-auto", maxHeight)}>
        {children}
      </div>
    </div>
  );
}

const TABLE_HEAD =
  "border-b border-white/[0.08] text-[10px] font-medium uppercase tracking-wide text-white/30";
const TABLE_HEAD_CELL = "px-1 py-1.5 font-medium";
const TABLE_ROW = "border-b border-white/[0.04] transition-colors last:border-b-0";
const ITEM_TABLE_HEAD_CELL = "px-2 py-2 font-medium";
const ITEM_TABLE_CELL = "px-2 py-2.5";

/* ─── Ingredient table ───────────────────────────────────────────────────── */
function IngredientList({
  rows,
  itemCache,
  progress,
  onOwnedChange,
  onValidateRow,
  compact = false,
  scrollable = false,
}: {
  rows: { ingredientId: number; required: number; validated: number; remaining: number }[];
  itemCache: Record<number, ItemOut>;
  progress: CraftListOut["progress"];
  onOwnedChange: (ingredientId: number, owned: number, required: number) => void;
  onValidateRow: (ingredientId: number, required: number) => void;
  compact?: boolean;
  /** Zone scrollable avec en-tête fixe (recette totale ou listes longues). */
  scrollable?: boolean;
}) {
  const { hover, show, move, scheduleHide, cancelHide, hide } = useItemHoverCard();

  if (rows.length === 0) {
    return <p className="py-2 text-center text-[11px] text-white/25">Rien à crafter.</p>;
  }

  const table = (
    <table className={cn("w-full table-fixed text-left", compact ? "text-[11px]" : "text-xs")}>
      <colgroup>
        <col />
        <col className={compact ? "w-9" : "w-10"} />
        <col className={compact ? "w-11" : "w-12"} />
        <col className={compact ? "w-12" : "w-14"} />
        <col className="w-8" />
      </colgroup>
      <thead className={cn(scrollable && "sticky top-0 z-10 bg-[#0b0c09]/95 backdrop-blur-[2px]")}>
        <tr className="border-b border-white/[0.08] text-[10px] font-medium uppercase tracking-wide text-white/30">
          <th className="py-1.5 pl-2 pr-1 font-medium">Ingrédient</th>
          <th className="px-1 py-1.5 text-center font-medium">Qté</th>
          <th className="px-1 py-1.5 text-center font-medium">Stock</th>
          <th className="px-1 py-1.5 text-right font-medium">Craft</th>
          <th className="py-1.5 pr-1" />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const item = itemCache[row.ingredientId];
          const status = ingredientRowStatus(row);
          const done = status === "complete";
          return (
            <tr
              key={row.ingredientId}
              className={cn(
                "border-b border-white/[0.04] transition-colors last:border-b-0",
                ingredientRowClassName(status),
                done && "opacity-80",
              )}
            >
              <td className="py-1 pl-2 pr-1">
                <div
                  className="flex min-w-0 items-center gap-1.5"
                  onMouseEnter={item ? (e) => show(item, e) : undefined}
                  onMouseMove={item ? move : undefined}
                  onMouseLeave={item ? scheduleHide : undefined}
                >
                  {item?.image_url_icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url_icon} alt="" width={18} height={18}
                      className="shrink-0 rounded border border-white/10" />
                  ) : (
                    <div className="h-[18px] w-[18px] shrink-0 rounded bg-white/5" />
                  )}
                  <span className="truncate text-white/80">{item?.name ?? `#${row.ingredientId}`}</span>
                </div>
              </td>
              <td className="px-1 py-1 text-center tabular-nums text-white/45">{row.required}</td>
              <td className="px-1 py-1 text-center">
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
                    "w-full rounded-md border border-white/10 bg-black/25 px-1 py-0.5 text-center tabular-nums text-white/85 focus:border-white/25 focus:outline-none",
                    compact ? "text-[11px]" : "text-xs",
                  )}
                />
              </td>
              <td className={cn("px-1 py-1 text-right tabular-nums font-medium", ingredientCraftTextClassName(status))}>
                {done ? (
                  <span className="inline-flex items-center justify-end gap-0.5">
                    <Check size={11} className="shrink-0" />
                    {row.required}
                  </span>
                ) : (
                  `${row.validated}/${row.required}`
                )}
              </td>
              <td className="py-1 pr-1 text-right">
                <button
                  type="button"
                  onClick={() => onValidateRow(row.ingredientId, row.required)}
                  disabled={done}
                  className="rounded-md border border-transparent p-0.5 text-white/40 transition hover:border-white/15 hover:bg-white/[0.04] hover:text-[var(--dofus-green-active)] disabled:pointer-events-none disabled:opacity-0"
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
  );

  return (
    <>
      <div
        className={cn(
          "overflow-hidden rounded-lg border border-white/[0.07] bg-[#0a0b08]/80",
          scrollable && "flex min-h-0 flex-1 flex-col",
        )}
      >
        <div
          className={cn(
            "scrollbar-thin overflow-x-auto overflow-y-auto",
            scrollable && (compact ? "max-h-48" : "max-h-[min(100%,32rem)] min-h-0 flex-1"),
          )}
        >
          {table}
        </div>
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
  const items = itemBreakdown.filter(({ rows }) => rows.length > 0);
  if (items.length === 0) {
    return <p className="py-2 text-center text-[11px] text-white/25">Aucune pièce craftable.</p>;
  }

  return (
    <ItemTableShell>
      <table className="w-full table-fixed text-left text-xs">
        <colgroup>
          <col />
          <col className="w-11" />
          <col className="w-28" />
          <col className="w-14" />
        </colgroup>
        <thead>
          <tr className={TABLE_HEAD}>
            <th className={cn(ITEM_TABLE_HEAD_CELL, "pl-3 text-left")}>Pièce</th>
            <th className={cn(ITEM_TABLE_HEAD_CELL, "text-center")}>Qté</th>
            <th className={cn(ITEM_TABLE_HEAD_CELL, "text-right")}>Craft</th>
            <th className={cn(ITEM_TABLE_HEAD_CELL, "pr-2 text-right")} />
          </tr>
        </thead>
        <tbody>
          {items.map(({ itemId, craftQty, rows }) => {
            const item = itemCache[itemId];
            const subKey = `${entryId}:${itemId}`;
            const subExpanded = expandedSubItems.has(subKey);
            const status = craftStatusFromRows(rows);
            const pct = rowsProgressPct(rows);

            return (
              <Fragment key={subKey}>
                <tr className={TABLE_ROW}>
                  <td className={cn(ITEM_TABLE_CELL, "pl-3 pr-1")}>
                    <button
                      type="button"
                      onClick={() => onToggleSubItem(subKey)}
                      className="flex min-w-0 w-full items-center gap-2 text-left"
                    >
                      <StatusPing status={status} />
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
                      <span className="truncate text-white/85">{item?.name ?? `Item #${itemId}`}</span>
                    </button>
                  </td>
                  <td className={cn(ITEM_TABLE_CELL, "text-center tabular-nums text-white/45")}>
                    {craftQty > 1 ? `×${craftQty}` : "1"}
                  </td>
                  <td className={cn(ITEM_TABLE_CELL, "text-right")}>
                    <CraftProgressCell pct={pct} status={status} />
                  </td>
                  <td className={cn(ITEM_TABLE_CELL, "pr-2 text-right")}>
                    {status !== "complete" && (
                      <button
                        type="button"
                        onClick={() => onValidateItemRecipe(rows)}
                        className="rounded-md border border-transparent p-0.5 text-white/40 transition hover:border-white/15 hover:bg-white/[0.04] hover:text-[var(--dofus-green-active)]"
                        title="Valider la recette"
                      >
                        <Check size={11} />
                      </button>
                    )}
                  </td>
                </tr>
                {subExpanded && (
                  <tr className="border-b border-white/[0.04] bg-black/15">
                    <td colSpan={4} className="px-2 pb-2 pt-1">
                      <IngredientList
                        rows={rows}
                        itemCache={itemCache}
                        progress={progress}
                        onOwnedChange={onOwnedChange}
                        onValidateRow={onValidateRow}
                        compact
                        scrollable
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </ItemTableShell>
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
      <ScrollTableShell maxHeight="max-h-64">
        {loading ? (
          <p className="py-4 text-center text-xs text-white/30">Chargement…</p>
        ) : tab === "item" ? (
          <table className="w-full table-fixed text-left text-xs">
            <thead className="sticky top-0 z-10 bg-[#0b0c09]/95 backdrop-blur-[2px]">
              <tr className={TABLE_HEAD}>
                <th className={cn(TABLE_HEAD_CELL, "pl-2 text-left")}>Item</th>
                <th className={cn(TABLE_HEAD_CELL, "w-24 text-left")}>Type</th>
                <th className={cn(TABLE_HEAD_CELL, "w-12 pr-2 text-right")}>Niv.</th>
              </tr>
            </thead>
            <tbody>
              {items.filter(isCraftableItem).map((it) => (
                <tr key={it.ankama_id} className={cn(TABLE_ROW, "hover:bg-white/[0.04]")}>
                  <td className="py-1.5 pl-2 pr-1">
                    <button
                      type="button"
                      onClick={() => { onAddItem(it, qty); onClose(); }}
                      className="flex min-w-0 w-full items-center gap-2 text-left"
                    >
                      {it.image_url_icon && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.image_url_icon} alt="" width={22} height={22}
                          className="shrink-0 rounded border border-white/10" />
                      )}
                      <span className="truncate text-white/80">{it.name}</span>
                    </button>
                  </td>
                  <td className="px-1 py-1.5 text-[11px] text-white/35">{typeLabel(it.type_name_id)}</td>
                  <td className="px-1 py-1.5 pr-2 text-right tabular-nums text-white/35">{it.level}</td>
                </tr>
              ))}
              {!loading && items.filter(isCraftableItem).length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-[11px] text-white/25">
                    Aucun item craftable trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full table-fixed text-left text-xs">
            <thead className="sticky top-0 z-10 bg-[#0b0c09]/95 backdrop-blur-[2px]">
              <tr className={TABLE_HEAD}>
                <th className={cn(TABLE_HEAD_CELL, "pl-2 text-left")}>Panoplie</th>
                <th className={cn(TABLE_HEAD_CELL, "w-16 pr-2 text-right")}>Pièces</th>
              </tr>
            </thead>
            <tbody>
              {sets.map((s) => (
                <tr key={s.ankama_id} className={cn(TABLE_ROW, "hover:bg-white/[0.04]")}>
                  <td className="py-1.5 pl-2 pr-1">
                    <button
                      type="button"
                      onClick={() => { onAddSet(s, qty); onClose(); }}
                      className="w-full truncate text-left text-white/80 hover:text-white"
                    >
                      {s.name ?? `Panoplie #${s.ankama_id}`}
                    </button>
                  </td>
                  <td className="px-1 py-1.5 pr-2 text-right tabular-nums text-white/35">
                    {s.equipment_ids?.length ?? 0}
                  </td>
                </tr>
              ))}
              {!loading && sets.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-4 text-center text-[11px] text-white/25">
                    Aucune panoplie trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </ScrollTableShell>
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
      const toFetch = [...craftItemIds];
      if (toFetch.length === 0) {
        setEntryItemCounts(new Map());
        return;
      }
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
        const filteredCounts = new Map<string, Map<number, number>>();
        for (const [entryId, counts] of countsMap) {
          filteredCounts.set(entryId, filterCraftableItemCounts(counts, next));
        }
        setEntryItemCounts(filteredCounts);
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

  const visibleEntryCount = useMemo(() => {
    if (!activeList) return 0;
    return activeList.entries.filter((e) => (entryItemCounts.get(e.id)?.size ?? 0) > 0).length;
  }, [activeList, entryItemCounts]);

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

  return (
    /* ── Contrainte à la hauteur disponible = pas de débordement footer ── */
    <main className="flex min-h-0 flex-1 overflow-hidden">
      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside className="flex w-44 shrink-0 flex-col border-r border-white/[0.04] bg-[#0a0a08]">
        <div className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            <AtelierIcon size={11} className="shrink-0 brightness-0 invert opacity-70" />
            <p className="font-display text-[14px] text-white/85">L&apos;Atelier</p>
          </div>
          {isGuest && (
            <p className="mt-1.5 text-[10px] leading-snug text-amber-200/55">
              Connecte-toi pour sauvegarder.
            </p>
          )}
        </div>

        <nav className="scrollbar-thin flex-1 overflow-y-auto px-1 py-1">
          {lists.length === 0 && !loading && (
            <p className="px-2 py-2 text-[11px] text-white/25">Aucune liste.</p>
          )}
          {lists.map((list) => (
            <button
              key={list.id}
              type="button"
              onClick={() => setActiveList(list.id)}
              className={cn(
                "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] transition",
                list.id === activeListId
                  ? "bg-white/[0.06] text-white/90"
                  : "text-white/35 hover:bg-white/[0.03] hover:text-white/60",
              )}
            >
              <ListChecks size={11} className={list.id === activeListId ? "text-[var(--dofus-green-active)]" : "text-white/15"} />
              <span className="min-w-0 flex-1 truncate">{list.name}</span>
            </button>
          ))}
        </nav>

        <div className="border-t border-white/[0.04] p-1.5">
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
            <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.04] px-3 py-1.5">
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
                  className="group flex items-center gap-1"
                  title="Renommer"
                >
                  <h2 className="font-display text-[15px] text-white/85">{activeList.name}</h2>
                  <Pencil size={11} className="shrink-0 text-white/20 transition group-hover:text-white/45" />
                </button>
              )}

              <div className="flex-1" />

              <Button type="button" variant="outline" size="sm" onClick={() => setAddModalOpen(true)}>
                <Plus size={12} /> Ajouter
              </Button>
              <Button type="button" variant="danger" size="sm"
                onClick={() => { if (confirm(`Supprimer « ${activeList.name} » ?`)) void deleteList(activeList.id); }}>
                <Trash2 size={12} />
              </Button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-white/[0.05] px-3 py-2 lg:w-[44%] lg:shrink-0 lg:border-b-0 lg:border-r">
                <SectionTitle count={aggregated.length}>Recette totale</SectionTitle>
                <IngredientList
                  rows={aggregated}
                  itemCache={itemCache}
                  progress={activeList.progress}
                  onOwnedChange={handleOwnedChange}
                  onValidateRow={handleValidateRow}
                  scrollable
                />
              </div>

              <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-2">
                <SectionTitle count={visibleEntryCount}>Objectifs</SectionTitle>

                {visibleEntryCount === 0 ? (
                  <p className="text-[11px] text-white/25">Ajoute un item craftable ou une panoplie.</p>
                ) : (
                  <ItemTableShell>
                    <table className="w-full table-fixed text-left text-xs">
                      <colgroup>
                        <col />
                        <col className="w-14" />
                        <col className="w-28" />
                        <col className="w-16" />
                      </colgroup>
                      <thead>
                        <tr className={TABLE_HEAD}>
                          <th className={cn(ITEM_TABLE_HEAD_CELL, "pl-3 text-left")}>Objectif</th>
                          <th className={cn(ITEM_TABLE_HEAD_CELL, "text-center")}>Type</th>
                          <th className={cn(ITEM_TABLE_HEAD_CELL, "text-right")}>Craft</th>
                          <th className={cn(ITEM_TABLE_HEAD_CELL, "pr-2 text-right")} />
                        </tr>
                      </thead>
                      <tbody>
                        {activeList.entries.map((entry, idx) => {
                          const counts = entryItemCounts.get(entry.id);
                          if (!counts || counts.size === 0) return null;
                          let prior = new Map<number, number>();
                          for (let i = 0; i < idx; i++) {
                            const e = activeList.entries[i];
                            const c = entryItemCounts.get(e.id);
                            if (!c) continue;
                            const rows = computeEntryIngredientRows(e, c, itemCache, activeList.progress, prior);
                            prior = consumeValidatedForEntry(rows, prior);
                          }
                          const entryRows = computeEntryIngredientRows(entry, counts, itemCache, activeList.progress, prior);
                          const perItemBreakdown = computePerItemIngredientRows(counts, itemCache, activeList.progress, prior);
                          const isMultiItem = entry.entry_type === "set" || entry.entry_type === "build";
                          const isBuildEntry = entry.entry_type === "build";
                          const status = craftStatusFromRows(entryRows);
                          const entryDone = status === "complete";
                          const expanded = expandedEntries.has(entry.id);
                          const pct = rowsProgressPct(entryRows);

                          return (
                            <Fragment key={entry.id}>
                              <tr className={TABLE_ROW}>
                                <td className={cn(ITEM_TABLE_CELL, "pl-3 pr-1")}>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedEntries((s) => {
                                      const n = new Set(s);
                                      n.has(entry.id) ? n.delete(entry.id) : n.add(entry.id);
                                      return n;
                                    })}
                                    className="flex min-w-0 w-full items-center gap-2 text-left"
                                  >
                                    <StatusPing status={status} neutral={isBuildEntry} />
                                    <span className={cn("shrink-0 transition-transform duration-200", expanded && "rotate-90")}>
                                      <ChevronRight size={13} className="text-white/30" />
                                    </span>
                                    <span className="truncate text-[13px] font-medium text-white/85">
                                      {entryLabel(entry)}
                                      {entry.quantity > 1 && (
                                        <span className="ml-1 font-normal text-white/35">×{entry.quantity}</span>
                                      )}
                                    </span>
                                  </button>
                                </td>
                                <td className={cn(ITEM_TABLE_CELL, "text-center text-[11px] text-white/35")}>
                                  {entryTypeLabel(entry.entry_type)}
                                </td>
                                <td className={cn(ITEM_TABLE_CELL, "text-right")}>
                                  <CraftProgressCell pct={pct} status={status} neutral={isBuildEntry} />
                                </td>
                                <td className={cn(ITEM_TABLE_CELL, "pr-2 text-right")}>
                                  <div className="inline-flex items-center gap-0.5">
                                    {!entryDone && entryRows.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handleValidateEntry(entry.id)}
                                        className="rounded-md border border-transparent p-0.5 text-white/40 transition hover:border-white/15 hover:bg-white/[0.04] hover:text-[var(--dofus-green-active)]"
                                        title="Tout valider"
                                      >
                                        <Check size={11} />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => void removeEntry(activeList.id, entry.id)}
                                      className="rounded-md border border-transparent p-0.5 text-white/30 transition hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400"
                                      aria-label="Retirer"
                                    >
                                      <X size={11} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {expanded && (
                                <tr className="border-b border-white/[0.04] bg-black/15">
                                  <td colSpan={4} className="px-2 pb-2 pt-1.5">
                                    {isMultiItem ? (
                                      <NestedItemsDetail
                                        entryId={entry.id}
                                        itemBreakdown={perItemBreakdown}
                                        itemCache={itemCache}
                                        progress={activeList.progress}
                                        expandedSubItems={expandedSubItems}
                                        onToggleSubItem={(key) => setExpandedSubItems((s) => {
                                          const n = new Set(s);
                                          n.has(key) ? n.delete(key) : n.add(key);
                                          return n;
                                        })}
                                        onOwnedChange={handleOwnedChange}
                                        onValidateRow={handleValidateRow}
                                        onValidateItemRecipe={handleValidateItemRecipe}
                                      />
                                    ) : (
                                      <IngredientList
                                        rows={entryRows}
                                        itemCache={itemCache}
                                        progress={activeList.progress}
                                        onOwnedChange={handleOwnedChange}
                                        onValidateRow={handleValidateRow}
                                        compact
                                        scrollable
                                      />
                                    )}
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </ItemTableShell>
                )}
              </div>
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
    if (!activeList || !isCraftableItem(item)) return;
    setItemCache((prev) => ({ ...prev, [item.ankama_id]: item }));
    await addEntry(activeList.id, { entry_type: "item", ref_id: String(item.ankama_id), quantity: qty, label: item.name });
  }

  async function handleAddSet(set: ItemSetOut, qty: number) {
    if (!activeList) return;
    await addEntry(activeList.id, { entry_type: "set", ref_id: String(set.ankama_id), quantity: qty, label: set.name ?? undefined });
  }
}
