"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ItemHoverCard,
  useItemHoverCard,
} from "@/components/items/ItemHoverCard";
import { SetDetailModal } from "@/components/items/SetDetailModal";
import { searchItems, searchSets } from "@/lib/api";
import { CATALOG_STAT_KEYS } from "@/lib/statLabels";
import { EQUIPMENT_TYPE_OPTIONS } from "@/lib/equipmentTypes";
import { itemFitsSlot } from "@/lib/itemSlotMatch";
import { searchFiltersForSlot } from "@/lib/slotSearchFilter";
import { useBuildStore } from "@/store/build-store";
import type { ItemOut, ItemSetOut } from "@/types/api";
import type { SlotId } from "@/lib/slots";

/* ─── Onglet Panoplies ─── */
function SetsCatalog() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sets, setSets] = useState<ItemSetOut[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [openSetId, setOpenSetId] = useState<number | null>(null);

  const equipSet = useBuildStore((s) => s.equipSet);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 320);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await searchSets(debouncedQ, page, pageSize);
      setSets(res.sets);
      setTotal(res.total);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
      setSets([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, page]);

  useEffect(() => { void load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={q}
        onChange={(e) => { setQ(e.target.value); setPage(1); }}
        placeholder="Nom de panoplie…"
        className="rounded-lg border border-[#5c4a32] bg-[#120e0a] px-3 py-2 text-sm text-[#f5e6c8] placeholder:text-[#6a5c48]"
      />

      {err && (
        <p className="rounded border border-red-900/50 bg-red-950/40 px-2 py-1.5 text-[12px] text-red-200">
          {err}
        </p>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="py-8 text-center text-sm text-[#8a7a62]">Chargement…</p>
        ) : sets.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#8a7a62]">Aucune panoplie trouvée.</p>
        ) : (
          <ul className="space-y-1.5">
            {sets.map((s) => {
              const count = s.equipment_ids?.length ?? 0;
              return (
                <li key={s.ankama_id} className="flex items-center justify-between gap-2 rounded-lg border border-[#3d3428] bg-[#16130f] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[#f0e4c4]">
                      {s.name ?? `Panoplie #${s.ankama_id}`}
                    </p>
                    {count > 0 && (
                      <p className="text-[11px] text-[#8a7a62]">{count} objets</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setOpenSetId(s.ankama_id)}
                      className="rounded border border-[#5c4a32] px-2.5 py-1 text-[11px] text-[#c9a227] hover:bg-[#2a2218]"
                    >
                      Détail
                    </button>
                    <button
                      type="button"
                      onClick={() => void equipSet(s.ankama_id)}
                      className="rounded border border-[#c9a227]/40 bg-[#c9a227]/10 px-2.5 py-1 text-[11px] font-medium text-[#e8c96e] hover:bg-[#c9a227]/25"
                    >
                      ⚔ Équiper
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {total > pageSize && (
        <div className="flex items-center justify-between border-t border-[#3d3428] pt-2 text-[12px] text-[#b8a88c]">
          <span>{total} panoplies · page {page}/{pages}</span>
          <div className="flex gap-1">
            <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded border border-[#5c4a32] px-2 py-0.5 disabled:opacity-40">Préc.</button>
            <button type="button" disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="rounded border border-[#5c4a32] px-2 py-0.5 disabled:opacity-40">Suiv.</button>
          </div>
        </div>
      )}

      {openSetId != null && (
        <SetDetailModal setId={openSetId} onClose={() => setOpenSetId(null)} />
      )}
    </div>
  );
}

/* ─── Catalogue principal ─── */
export function ItemCatalogPanel() {
  const selectedSlot = useBuildStore((s) => s.selectedSlot);
  const equipItemOnSlot = useBuildStore((s) => s.equipItemOnSlot);
  const { hover, show, move, scheduleHide } = useItemHoverCard();

  const [tab, setTab] = useState<"items" | "sets">("items");

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [minLv, setMinLv] = useState(1);
  const [maxLv, setMaxLv] = useState(200);
  const [typeId, setTypeId] = useState("");
  const [weaponsOnly, setWeaponsOnly] = useState(false);
  const [statKey, setStatKey] = useState("");
  const [minStat, setMinStat] = useState(1);
  const [useStatFilter, setUseStatFilter] = useState(false);
  const [respectSlot, setRespectSlot] = useState(true);

  const [page, setPage] = useState(1);
  const pageSize = 24;
  const [items, setItems] = useState<ItemOut[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 320);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const slotF =
        respectSlot && selectedSlot
          ? searchFiltersForSlot(selectedSlot)
          : {};
      const type_name_id = (typeId || slotF.type_name_id) || undefined;
      let is_weapon: boolean | undefined;
      if (weaponsOnly) is_weapon = true;
      else if (slotF.is_weapon === true) is_weapon = true;

      const res = await searchItems({
        q: debouncedQ || undefined,
        page,
        page_size: pageSize,
        min_level: minLv,
        max_level: maxLv,
        type_name_id,
        is_weapon,
        stat_key: useStatFilter && statKey ? statKey : undefined,
        min_stat_value:
          useStatFilter && statKey ? minStat : undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur de recherche");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    debouncedQ,
    page,
    minLv,
    maxLv,
    typeId,
    weaponsOnly,
    statKey,
    minStat,
    useStatFilter,
    respectSlot,
    selectedSlot,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onEquip(it: ItemOut) {
    if (!selectedSlot) {
      setErr("Clique d’abord sur un emplacement à gauche (inventaire).");
      return;
    }
    if (!itemFitsSlot(selectedSlot, it)) {
      setErr(
        `Cet objet ne va pas dans « ${slotLabelFr(selectedSlot)} ». Choisis un autre emplacement.`,
      );
      return;
    }
    setErr(null);
    try {
      await equipItemOnSlot(selectedSlot, it.ankama_id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Équipement impossible");
    }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="dofus-panel flex min-h-[420px] flex-col rounded-xl border-2 border-[#6b5428]/90 bg-[#1a1510]/95 p-4 shadow-inner">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold tracking-wide text-[#f0d78c]">
          Catalogue
        </h2>
        {/* Onglets */}
        <div className="flex overflow-hidden rounded-lg border border-[#5c4a32]">
          {(["items", "sets"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-[12px] font-medium transition ${
                tab === t
                  ? "bg-[#c9a227]/20 text-[#e8c96e]"
                  : "bg-[#14120f] text-[#8a7a62] hover:bg-[#2a2218]"
              }`}
            >
              {t === "items" ? "Objets" : "Panoplies"}
            </button>
          ))}
        </div>
      </div>

      {tab === "sets" ? (
        <SetsCatalog />
      ) : (
      <>
      <div className="flex flex-col gap-2 border-b border-[#3d3428] pb-3">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Nom d'objet…"
          className="rounded-lg border border-[#5c4a32] bg-[#120e0a] px-3 py-2 text-sm text-[#f5e6c8] placeholder:text-[#6a5c48]"
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="flex flex-col text-[11px] text-[#b8a88c]">
            Niv. min
            <input
              type="number"
              min={1}
              max={200}
              value={minLv}
              onChange={(e) => {
                setMinLv(Number(e.target.value));
                setPage(1);
              }}
              className="mt-0.5 rounded border border-[#5c4a32] bg-[#120e0a] px-2 py-1 text-[#f5e6c8]"
            />
          </label>
          <label className="flex flex-col text-[11px] text-[#b8a88c]">
            Niv. max
            <input
              type="number"
              min={1}
              max={200}
              value={maxLv}
              onChange={(e) => {
                setMaxLv(Number(e.target.value));
                setPage(1);
              }}
              className="mt-0.5 rounded border border-[#5c4a32] bg-[#120e0a] px-2 py-1 text-[#f5e6c8]"
            />
          </label>
          <label className="col-span-2 flex flex-col text-[11px] text-[#b8a88c]">
            Type
            <select
              value={typeId}
              onChange={(e) => {
                setTypeId(e.target.value);
                setPage(1);
              }}
              className="mt-0.5 rounded border border-[#5c4a32] bg-[#120e0a] px-2 py-1 text-[#f5e6c8]"
            >
              {EQUIPMENT_TYPE_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[#d4c4a8]">
          <input
            type="checkbox"
            checked={weaponsOnly}
            onChange={(e) => {
              setWeaponsOnly(e.target.checked);
              setPage(1);
            }}
            className="rounded border-[#5c4a32]"
          />
          Armes seulement
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[#d4c4a8]">
          <input
            type="checkbox"
            checked={respectSlot}
            onChange={(e) => setRespectSlot(e.target.checked)}
            className="rounded border-[#5c4a32]"
          />
          Limiter les résultats à l&apos;emplacement sélectionné
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-[11px] text-[#b8a88c]">
            Stat min.
            <select
              value={statKey}
              onChange={(e) => setStatKey(e.target.value)}
              className="mt-0.5 min-w-[140px] rounded border border-[#5c4a32] bg-[#120e0a] px-2 py-1 text-[#f5e6c8]"
            >
              <option value="">—</option>
              {CATALOG_STAT_KEYS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-[11px] text-[#b8a88c]">
            Valeur ≥
            <input
              type="number"
              min={0}
              value={minStat}
              onChange={(e) => setMinStat(Number(e.target.value))}
              className="mt-0.5 w-20 rounded border border-[#5c4a32] bg-[#120e0a] px-2 py-1 text-[#f5e6c8]"
            />
          </label>
          <label className="flex items-center gap-2 text-[12px] text-[#d4c4a8]">
            <input
              type="checkbox"
              checked={useStatFilter}
              onChange={(e) => {
                setUseStatFilter(e.target.checked);
                setPage(1);
              }}
            />
            Activer
          </label>
        </div>
      </div>

      {selectedSlot && (
        <p className="mt-2 rounded-lg bg-[#2a2218] px-2 py-1.5 text-[12px] text-[#e8c96e]">
          Emplacement :{" "}
          <strong>{slotLabelFr(selectedSlot)}</strong> — clique sur un objet
          pour équiper.
        </p>
      )}

      {err && (
        <p className="mt-2 rounded border border-red-900/50 bg-red-950/40 px-2 py-1.5 text-[12px] text-red-200">
          {err}
        </p>
      )}

      <div className="mt-2 flex-1 overflow-y-auto">
        {loading ? (
          <p className="py-8 text-center text-sm text-[#8a7a62]">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#8a7a62]">
            Aucun objet trouvé.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {items.map((it) => {
              const ok =
                selectedSlot && itemFitsSlot(selectedSlot, it);
              return (
                <li key={it.ankama_id}>
                  <div
                    onMouseEnter={(e) => show(it, e)}
                    onMouseMove={move}
                    onMouseLeave={scheduleHide}
                  >
                  <button
                    type="button"
                    disabled={!selectedSlot}
                    onClick={() => void onEquip(it)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition ${
                      ok
                        ? "border-[#5c4a32] bg-[#231c15] hover:border-[#c9a227]/60 hover:bg-[#2e261c]"
                        : "border-[#3d3428] bg-[#1a1510]/80 opacity-80 hover:bg-[#231c15]"
                    } ${!selectedSlot ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    {it.image_url_icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.image_url_icon}
                        alt=""
                        width={36}
                        height={36}
                        className="h-9 w-9 shrink-0 rounded border border-[#3d3428] object-contain"
                      />
                    ) : (
                      <div className="h-9 w-9 shrink-0 rounded border border-dashed border-[#3d3428]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-[#f0e4c4]">
                        {it.name}
                      </p>
                      <p className="text-[10px] text-[#8a7a62]">
                        Niv. {it.level}
                        {selectedSlot && !ok ? (
                          <span className="text-amber-600/90"> · incompatible</span>
                        ) : null}
                      </p>
                    </div>
                  </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {hover && (
        <ItemHoverCard item={hover.item} anchor={{ x: hover.x, y: hover.y }} />
      )}

      {total > pageSize && (
        <div className="mt-2 flex items-center justify-between border-t border-[#3d3428] pt-2 text-[12px] text-[#b8a88c]">
          <span>
            {total} résultat{total > 1 ? "s" : ""} · page {page} / {pages}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-[#5c4a32] px-2 py-0.5 disabled:opacity-40"
            >
              Préc.
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="rounded border border-[#5c4a32] px-2 py-0.5 disabled:opacity-40"
            >
              Suiv.
            </button>
          </div>
        </div>
      )}
      </>
      )}
    </section>
  );
}

function slotLabelFr(id: SlotId): string {
  const labels: Partial<Record<SlotId, string>> = {
    hat: "Chapeau",
    cloak: "Cape",
    amulet: "Amulette",
    ring1: "Anneau 1",
    ring2: "Anneau 2",
    belt: "Ceinture",
    boots: "Bottes",
    weapon: "Arme",
    shield: "Bouclier",
    dofus1: "Dofus/Trophée 1",
    dofus2: "Dofus/Trophée 2",
    dofus3: "Dofus/Trophée 3",
    dofus4: "Dofus/Trophée 4",
    dofus5: "Dofus/Trophée 5",
    dofus6: "Dofus/Trophée 6",
    pet: "Familier",
  };
  return labels[id] ?? id;
}
